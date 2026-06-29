import {
  CounterpartyType,
  GameState,
  Objective,
  PayoffFunction,
  Quote,
  TradeAction,
} from "./types";
import { decideCounterpartyAction } from "./counterparty";
import { computeEV, computePayoffDistribution, computeStats } from "./distribution";

/**
 * User PnL at settlement for a single unit trade.
 *   - buy_from_user (user sold @ ask): PnL = ask - Y
 *   - sell_to_user  (user bought @ bid): PnL = Y - bid
 *   - pass: 0
 */
export function computeUserPnl(
  action: TradeAction,
  quote: Quote,
  truePayoff: number,
): number {
  if (action === "buy_from_user") return quote.ask - truePayoff;
  if (action === "sell_to_user") return truePayoff - quote.bid;
  return 0;
}

/** Inventory change in contracts for a trade (user perspective). */
export function inventoryDelta(action: TradeAction): number {
  if (action === "buy_from_user") return -1; // user is short one
  if (action === "sell_to_user") return +1; // user is long one
  return 0;
}

export type StateOutcome = {
  state: GameState;
  truePayoff: number;
  action: TradeAction;
  pnl: number;
  probability: number;
};

/**
 * Evaluate a quote across every state for a given counterparty type.
 * Returns the per-state outcome plus expected and worst-case PnL.
 */
export function evaluateQuote(
  quote: Quote,
  states: GameState[],
  payoff: PayoffFunction,
  counterparty: CounterpartyType,
  opts?: { noise?: number },
): {
  outcomes: StateOutcome[];
  expectedPnl: number;
  worstCasePnl: number;
  tradeProbability: number;
} {
  const dist = computePayoffDistribution(states, payoff);
  const fairValue = computeEV(dist);

  const outcomes: StateOutcome[] = states.map((state) => {
    const truePayoff = payoff.evaluate(state);
    const action = decideCounterpartyAction(quote, {
      type: counterparty,
      fairValue,
      truePayoff,
      noise: opts?.noise,
      // For a worst-case / EV scan we treat the noisy adversary as if it
      // always behaves optimally (the dangerous case for the user).
      noiseDraw: counterparty === "noisy" ? 1 : undefined,
    });
    return {
      state,
      truePayoff,
      action,
      pnl: computeUserPnl(action, quote, truePayoff),
      probability: state.probability,
    };
  });

  const expectedPnl = outcomes.reduce((acc, o) => acc + o.pnl * o.probability, 0);
  const worstCasePnl = outcomes.reduce(
    (acc, o) => Math.min(acc, o.pnl),
    Infinity,
  );
  const tradeProbability = outcomes.reduce(
    (acc, o) => acc + (o.action === "pass" ? 0 : o.probability),
    0,
  );

  return {
    outcomes,
    expectedPnl,
    worstCasePnl: Number.isFinite(worstCasePnl) ? worstCasePnl : 0,
    tradeProbability,
  };
}

export function computeWorstCasePnl(
  quote: Quote,
  states: GameState[],
  payoff: PayoffFunction,
  counterparty: CounterpartyType,
): number {
  return evaluateQuote(quote, states, payoff, counterparty).worstCasePnl;
}

export type ObjectiveQuote = {
  objective: Objective;
  quote: Quote;
  expectedPnl: number;
  worstCasePnl: number;
  spread: number;
  rationale: string;
};

const ALL_OBJECTIVES: Objective[] = ["fair", "defensive", "max_ev", "max_worst_case"];

/**
 * Solve every objective in a single grid sweep. Payoff values and weights are
 * precomputed once, so each candidate quote is O(states) with no re-bucketing.
 */
export function bestQuotesByObjective(
  states: GameState[],
  payoff: PayoffFunction,
  counterparty: CounterpartyType,
): Record<Objective, ObjectiveQuote> {
  const dist = computePayoffDistribution(states, payoff);
  const stats = computeStats(dist);
  const fairValue = stats.ev;
  const support = stats.max - stats.min || 1;
  const step = Math.max(support / 36, 0.5);

  // Precompute (payoff, probability) for every state once.
  const ys: number[] = new Array(states.length);
  const ps: number[] = new Array(states.length);
  for (let i = 0; i < states.length; i++) {
    ys[i] = payoff.evaluate(states[i]);
    ps[i] = states[i].probability;
  }

  const centers: number[] = [];
  for (let c = stats.ev - support / 2; c <= stats.ev + support / 2; c += step) {
    centers.push(round(c));
  }
  const halfWidths: number[] = [];
  for (let h = step; h <= support * 1.1; h += step) halfWidths.push(round(h));

  const best: Partial<Record<Objective, ObjectiveQuote>> = {};
  const bestScore: Partial<Record<Objective, number>> = {};

  for (const center of centers) {
    for (const half of halfWidths) {
      const bid = round(center - half);
      const ask = round(center + half);
      // Inline evaluation across all states for this quote.
      let expectedPnl = 0;
      let worst = Infinity;
      const uninformedAction =
        counterparty === "uninformed"
          ? fairValue > ask
            ? "buy"
            : fairValue < bid
              ? "sell"
              : "pass"
          : null;
      for (let i = 0; i < ys.length; i++) {
        const y = ys[i];
        let pnl: number;
        if (uninformedAction === "buy") pnl = ask - y;
        else if (uninformedAction === "sell") pnl = y - bid;
        else if (uninformedAction === "pass") pnl = 0;
        else if (y > ask) pnl = ask - y; // informed / noisy-worst: trades the bad side
        else if (y < bid) pnl = y - bid;
        else pnl = 0;
        expectedPnl += pnl * ps[i];
        if (pnl < worst) worst = pnl;
      }
      const candidate: ObjectiveQuote = {
        objective: "fair",
        quote: { bid, ask },
        expectedPnl,
        worstCasePnl: Number.isFinite(worst) ? worst : 0,
        spread: ask - bid,
        rationale: "",
      };
      for (const objective of ALL_OBJECTIVES) {
        const s = scoreObjective(candidate, objective);
        if (bestScore[objective] === undefined || s > bestScore[objective]!) {
          bestScore[objective] = s;
          best[objective] = { ...candidate, objective };
        }
      }
    }
  }

  const result = {} as Record<Objective, ObjectiveQuote>;
  for (const objective of ALL_OBJECTIVES) {
    const chosen =
      best[objective] ?? {
        objective,
        quote: { bid: round(stats.ev - support / 2), ask: round(stats.ev + support / 2) },
        expectedPnl: 0,
        worstCasePnl: 0,
        spread: support,
        rationale: "",
      };
    chosen.rationale = objectiveRationale(objective, chosen);
    result[objective] = chosen;
  }
  return result;
}

export function findBestQuoteByObjective(
  states: GameState[],
  payoff: PayoffFunction,
  objective: Objective,
  counterparty: CounterpartyType,
): ObjectiveQuote {
  return bestQuotesByObjective(states, payoff, counterparty)[objective];
}

function scoreObjective(q: ObjectiveQuote, objective: Objective): number {
  switch (objective) {
    case "max_worst_case":
      // Maximise the guaranteed floor; break ties toward tighter spreads.
      return q.worstCasePnl * 1000 - q.spread;
    case "max_ev":
      return q.expectedPnl * 1000 - q.spread * 0.001;
    case "defensive":
      // Non-negative worst case, then maximise EV, then tighten.
      return (q.worstCasePnl >= -1e-9 ? 1e6 : 0) + q.expectedPnl * 100 - q.spread;
    case "fair":
    default:
      // Tightest market that still keeps EV essentially break-even.
      return (q.expectedPnl >= -0.05 * Math.max(1, Math.abs(q.expectedPnl)) ? 1e6 : 0)
        - q.spread;
  }
}

function objectiveRationale(objective: Objective, q: ObjectiveQuote): string {
  const fmt = (n: number) => n.toFixed(2);
  switch (objective) {
    case "max_worst_case":
      return `Maximises the guaranteed floor: worst-case PnL ${fmt(q.worstCasePnl)} across every state.`;
    case "max_ev":
      return `Maximises expected PnL (${fmt(q.expectedPnl)}) — often means quoting so wide the adversary rarely trades.`;
    case "defensive":
      return `Keeps worst-case non-negative while staying as tight as possible. Worst case ${fmt(q.worstCasePnl)}.`;
    case "fair":
    default:
      return `Tightest two-sided market that stays roughly break-even in expectation (EV ${fmt(q.expectedPnl)}).`;
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
