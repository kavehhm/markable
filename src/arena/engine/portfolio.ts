// Objective Lab engine. A small finite state space with several tradeable
// instruments at fixed prices. The user picks integer quantities and we score
// the resulting portfolio under different objectives. This is the Optiver style
// exercise: some combinations guarantee a positive worst case (an arbitrage),
// which is exactly what a market maker wants.

export type LabState = {
  id: string;
  label: string;
  probability: number;
};

export type LabInstrument = {
  id: string;
  name: string;
  /** Note shown under the instrument, e.g. what it pays and the price logic. */
  note: string;
  price: number;
  /** Payoff in each state, keyed by state id. */
  payoff: Record<string, number>;
};

export type LabScenario = {
  id: string;
  title: string;
  prompt: string;
  difficulty: "easy" | "medium" | "hard";
  states: LabState[];
  instruments: LabInstrument[];
  /** Quantity bound per instrument for the optimiser and the UI, e.g. 3. */
  qtyRange: number;
  lesson: string;
};

export type LabObjective = "max_ev" | "max_sharpe" | "max_worst_case";

export type Position = Record<string, number>;

export type PortfolioResult = {
  pnlByState: Array<{ state: LabState; pnl: number }>;
  ev: number;
  variance: number;
  std: number;
  sharpe: number; // EV / std; Infinity when riskless and positive
  worstCase: number;
  bestCase: number;
  cost: number;
  gross: number; // sum of |quantity|
};

export function instrumentEv(
  instrument: LabInstrument,
  states: LabState[],
): number {
  return states.reduce(
    (acc, s) => acc + s.probability * instrument.payoff[s.id],
    0,
  );
}

export function evaluatePortfolio(
  scenario: LabScenario,
  position: Position,
): PortfolioResult {
  const { states, instruments } = scenario;
  const pnlByState = states.map((state) => {
    let pnl = 0;
    for (const inst of instruments) {
      const q = position[inst.id] ?? 0;
      if (q !== 0) pnl += q * (inst.payoff[state.id] - inst.price);
    }
    return { state, pnl };
  });

  const ev = pnlByState.reduce((a, x) => a + x.state.probability * x.pnl, 0);
  const variance = pnlByState.reduce(
    (a, x) => a + x.state.probability * (x.pnl - ev) ** 2,
    0,
  );
  const std = Math.sqrt(variance);
  const worstCase = pnlByState.reduce((a, x) => Math.min(a, x.pnl), Infinity);
  const bestCase = pnlByState.reduce((a, x) => Math.max(a, x.pnl), -Infinity);
  const cost = instruments.reduce(
    (a, inst) => a + (position[inst.id] ?? 0) * inst.price,
    0,
  );
  const gross = instruments.reduce(
    (a, inst) => a + Math.abs(position[inst.id] ?? 0),
    0,
  );

  const riskless = std < 1e-9;
  const sharpe = riskless ? (ev > 1e-9 ? Infinity : ev < -1e-9 ? -Infinity : 0) : ev / std;

  return {
    pnlByState,
    ev,
    variance,
    std,
    sharpe,
    worstCase: Number.isFinite(worstCase) ? worstCase : 0,
    bestCase: Number.isFinite(bestCase) ? bestCase : 0,
    cost,
    gross,
  };
}

function objectiveScore(r: PortfolioResult, objective: LabObjective): number {
  if (r.gross === 0) return -Infinity; // ignore the empty portfolio
  switch (objective) {
    case "max_ev":
      // Prefer EV, then break ties toward smaller, simpler positions.
      return r.ev * 1e6 - r.gross;
    case "max_sharpe":
      // Riskless positive portfolios (Sharpe = Infinity) win outright.
      if (!Number.isFinite(r.sharpe)) return r.sharpe;
      return r.sharpe * 1e6 - r.gross;
    case "max_worst_case":
      return r.worstCase * 1e6 - r.gross;
  }
}

export function findOptimalPortfolio(
  scenario: LabScenario,
  objective: LabObjective,
): { position: Position; result: PortfolioResult } {
  const { instruments, qtyRange } = scenario;
  const ids = instruments.map((i) => i.id);
  const span = 2 * qtyRange + 1;
  const total = span ** ids.length;

  let bestScore = -Infinity;
  let bestPosition: Position = {};
  for (let code = 0; code < total; code++) {
    const position: Position = {};
    let rest = code;
    for (const id of ids) {
      position[id] = (rest % span) - qtyRange;
      rest = Math.floor(rest / span);
    }
    const result = evaluatePortfolio(scenario, position);
    const score = objectiveScore(result, objective);
    if (score > bestScore) {
      bestScore = score;
      bestPosition = position;
    }
  }
  return { position: bestPosition, result: evaluatePortfolio(scenario, bestPosition) };
}

/** True when some integer portfolio locks in a strictly positive worst case. */
export function hasArbitrage(scenario: LabScenario): boolean {
  return findOptimalPortfolio(scenario, "max_worst_case").result.worstCase > 1e-9;
}
