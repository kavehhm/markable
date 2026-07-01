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
