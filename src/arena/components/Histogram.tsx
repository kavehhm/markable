import { useMemo } from "react";
import { Distribution } from "../engine";
import { fmt } from "../format";

type Marker = { value: number; label: string; tone: "fair" | "bid" | "ask" | "true" };

/**
 * Exact-distribution histogram. Distinct payoff values are binned into a fixed
 * number of buckets so dense supports (products) still render cleanly.
 */
export function Histogram({
  dist,
  markers = [],
  maxBars = 28,
  height = 168,
}: {
  dist: Distribution;
  markers?: Marker[];
  maxBars?: number;
  height?: number;
}) {
  const { bars, lo, hi, peak } = useMemo(() => {
    const values = dist.points.map((p) => p.value);
    const lo = values.length ? Math.min(...values) : 0;
    const hi = values.length ? Math.max(...values) : 1;
    const span = hi - lo || 1;
    const distinct = dist.points.length;
    const binCount = Math.min(maxBars, Math.max(1, distinct));
    const width = span / binCount;
    const bins = Array.from({ length: binCount }, (_, i) => ({
      x0: lo + i * width,
      x1: lo + (i + 1) * width,
      prob: 0,
    }));
    for (const p of dist.points) {
      let idx = Math.floor((p.value - lo) / width);
      if (idx >= binCount) idx = binCount - 1;
      if (idx < 0) idx = 0;
      bins[idx].prob += p.probability;
    }
    const peak = Math.max(...bins.map((b) => b.prob), 1e-9);
    return { bars: bins, lo, hi, peak };
  }, [dist, maxBars]);

  const span = hi - lo || 1;
  const xOf = (v: number) => ((v - lo) / span) * 100;

  return (
    <div className="histogram" style={{ height }}>
      <div className="histogram-bars">
        {bars.map((b, i) => (
          <div
            key={i}
            className="histogram-bar"
            style={{ height: `${(b.prob / peak) * 100}%` }}
            title={`[${fmt(b.x0)}, ${fmt(b.x1)}] · ${(b.prob * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      {markers.map((m, i) => {
        const x = Math.max(0, Math.min(100, xOf(m.value)));
        return (
          <div
            key={i}
            className={`histogram-marker tone-${m.tone}`}
            style={{ left: `${x}%` }}
          >
            <span className="histogram-marker-label">{m.label}</span>
          </div>
        );
      })}
      <div className="histogram-axis">
        <span>{fmt(lo)}</span>
        <span>{fmt((lo + hi) / 2)}</span>
        <span>{fmt(hi)}</span>
      </div>
    </div>
  );
}
