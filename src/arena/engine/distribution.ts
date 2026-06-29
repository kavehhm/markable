import {
  Distribution,
  DistributionStats,
  GameState,
  PayoffFunction,
} from "./types";

/** Exact payoff distribution: group equal payoff values, keep probabilities. */
export function computePayoffDistribution(
  states: GameState[],
  payoff: PayoffFunction,
): Distribution {
  const buckets = new Map<number, { probability: number; count: number }>();
  for (const state of states) {
    const value = payoff.evaluate(state);
    const existing = buckets.get(value);
    if (existing) {
      existing.probability += state.probability;
      existing.count += 1;
    } else {
      buckets.set(value, { probability: state.probability, count: 1 });
    }
  }
  const points = [...buckets.entries()]
    .map(([value, b]) => ({ value, probability: b.probability, count: b.count }))
    .sort((a, b) => a.value - b.value);
  // Renormalise in case probabilities were filtered/sub-normalised upstream.
  const mass = points.reduce((acc, p) => acc + p.probability, 0);
  if (mass > 0 && Math.abs(mass - 1) > 1e-9) {
    for (const p of points) p.probability /= mass;
  }
  return { points, total: states.length };
}

export function computeEV(dist: Distribution): number {
  return dist.points.reduce((acc, p) => acc + p.value * p.probability, 0);
}

export function computeVariance(dist: Distribution): number {
  const ev = computeEV(dist);
  return dist.points.reduce(
    (acc, p) => acc + p.probability * (p.value - ev) ** 2,
    0,
  );
}

/** quantile in [0,1] -> the smallest value whose cumulative prob >= q. */
export function computeQuantile(dist: Distribution, q: number): number {
  if (dist.points.length === 0) return 0;
  let cumulative = 0;
  for (const p of dist.points) {
    cumulative += p.probability;
    if (cumulative >= q - 1e-12) return p.value;
  }
  return dist.points[dist.points.length - 1].value;
}

export function computeStats(dist: Distribution): DistributionStats {
  const ev = computeEV(dist);
  const variance = computeVariance(dist);
  const values = dist.points.map((p) => p.value);
  const quantileLevels = [0.05, 0.25, 0.5, 0.75, 0.95];
  const quantiles: Record<number, number> = {};
  for (const q of quantileLevels) quantiles[q] = computeQuantile(dist, q);
  return {
    ev,
    variance,
    std: Math.sqrt(variance),
    min: values.length ? Math.min(...values) : 0,
    max: values.length ? Math.max(...values) : 0,
    median: computeQuantile(dist, 0.5),
    quantiles,
  };
}
