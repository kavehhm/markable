import { Objective } from "./engine";
import { SessionObjective } from "./ArenaApp";

export const SESSION_OBJECTIVES: Array<{
  id: SessionObjective;
  label: string;
  blurb: string;
}> = [
  { id: "free", label: "Free play", blurb: "No scoring rule. Just stack PnL." },
  { id: "max_ev", label: "Max EV", blurb: "Win on total profit. Take every edge, risk allowed." },
  { id: "min_variance", label: "Consistency", blurb: "Win on steady PnL. Keep variance low and avoid swings." },
  { id: "max_worst_case", label: "Max worst case", blurb: "Win on your floor. Never take a bad round." },
];

export function objectiveMeta(id: SessionObjective) {
  return SESSION_OBJECTIVES.find((o) => o.id === id) ?? SESSION_OBJECTIVES[0];
}

/** The single quote the engine should hold up as the benchmark for this rule. */
export function benchmarkObjective(id: SessionObjective): Objective {
  if (id === "max_ev") return "max_ev";
  if (id === "max_worst_case") return "max_worst_case";
  if (id === "min_variance") return "defensive";
  return "fair";
}

export type SessionStats = {
  total: number;
  mean: number;
  std: number;
  sharpe: number; // mean / std, Infinity when steady and positive
  worst: number;
  best: number;
  rounds: number;
};

export function sessionStats(roundPnls: number[]): SessionStats {
  const rounds = roundPnls.length;
  if (rounds === 0) {
    return { total: 0, mean: 0, std: 0, sharpe: 0, worst: 0, best: 0, rounds: 0 };
  }
  const total = roundPnls.reduce((a, b) => a + b, 0);
  const mean = total / rounds;
  const variance = roundPnls.reduce((a, b) => a + (b - mean) ** 2, 0) / rounds;
  const std = Math.sqrt(variance);
  const worst = Math.min(...roundPnls);
  const best = Math.max(...roundPnls);
  const sharpe = std < 1e-9 ? (mean > 1e-9 ? Infinity : mean < -1e-9 ? -Infinity : 0) : mean / std;
  return { total, mean, std, sharpe, worst, best, rounds };
}

/** The headline number a session is judged on, given its objective. */
export function headlineFor(
  objective: SessionObjective,
  stats: SessionStats,
): { label: string; value: number; kind: "pnl" | "sharpe" } {
  if (objective === "min_variance")
    return { label: "Sharpe (mean / std)", value: stats.sharpe, kind: "sharpe" };
  if (objective === "max_worst_case")
    return { label: "Worst round (your floor)", value: stats.worst, kind: "pnl" };
  return { label: "Total PnL", value: stats.total, kind: "pnl" };
}
