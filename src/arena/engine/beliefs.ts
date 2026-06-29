import { GameState, PayoffFunction, Quote, TradeAction } from "./types";
import { computePayoffDistribution, computeStats } from "./distribution";

/**
 * Filter the possible states given an observed counterparty action against an
 * *informed* adversary. No-trade is information too.
 *
 *   - buy_from_user: keep states where Y > ask
 *   - sell_to_user:  keep states where Y < bid
 *   - pass:          keep states where bid <= Y <= ask
 *
 * Probabilities are renormalised over the surviving states.
 */
export function updateBeliefsAfterAction(
  states: GameState[],
  quote: Quote,
  action: TradeAction,
  payoff: PayoffFunction,
): GameState[] {
  const survivors = states.filter((state) => {
    const y = payoff.evaluate(state);
    if (action === "buy_from_user") return y > quote.ask;
    if (action === "sell_to_user") return y < quote.bid;
    return y >= quote.bid && y <= quote.ask; // pass
  });
  const mass = survivors.reduce((acc, s) => acc + s.probability, 0);
  if (mass <= 0) return survivors;
  return survivors.map((s) => ({ ...s, probability: s.probability / mass }));
}

export type BeliefSnapshot = {
  states: GameState[];
  count: number;
  conditionalEv: number;
  min: number;
  max: number;
  std: number;
};

export function summariseBelief(
  states: GameState[],
  payoff: PayoffFunction,
): BeliefSnapshot {
  if (states.length === 0) {
    return { states, count: 0, conditionalEv: 0, min: 0, max: 0, std: 0 };
  }
  const dist = computePayoffDistribution(states, payoff);
  const stats = computeStats(dist);
  return {
    states,
    count: states.length,
    conditionalEv: stats.ev,
    min: stats.min,
    max: stats.max,
    std: stats.std,
  };
}

/** Plain-english reading of what an informed counterparty's action implies. */
export function actionImplication(
  action: TradeAction,
  quote: Quote,
): string {
  if (action === "buy_from_user")
    return `They lifted your ask, so the true payoff is above ${quote.ask}. Your ask was too low.`;
  if (action === "sell_to_user")
    return `They hit your bid, so the true payoff is below ${quote.bid}. Your bid was too high.`;
  return `They passed, so the true payoff sits inside [${quote.bid}, ${quote.ask}]. No-trade is information.`;
}
