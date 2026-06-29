import { useMemo, useState } from "react";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import {
  computePayoffDistribution,
  computeStats,
  enumerateStates,
} from "../engine";
import { ArenaSession } from "../ArenaApp";
import { Histogram } from "../components/Histogram";
import { Panel, PanelHead, Stat } from "../components/ui";
import { fmt, pct } from "../format";
import { resolveContract, setupLabel } from "../session";

export function FairValueDrill({
  session,
  onExit,
}: {
  session: ArenaSession;
  onExit: () => void;
}) {
  const [round, setRound] = useState(0);
  const { config, payoff } = useMemo(() => resolveContract(session), [session]);
  const states = useMemo(() => enumerateStates(config), [config]);
  const dist = useMemo(() => computePayoffDistribution(states, payoff), [states, payoff]);
  const stats = useMemo(() => computeStats(dist), [dist]);

  const [estimate, setEstimate] = useState("");
  const [revealed, setRevealed] = useState(false);

  const isIndicator = payoff.kind === "indicator";
  const estimateNum = Number(estimate);
  const hasEstimate = estimate.trim() !== "" && Number.isFinite(estimateNum);
  const error = hasEstimate ? Math.abs(estimateNum - stats.ev) : 0;
  const errorInStd = stats.std > 0 ? error / stats.std : error;

  function nextDraw() {
    setEstimate("");
    setRevealed(false);
    setRound((r) => r + 1);
  }

  const verdictTone = !hasEstimate
    ? "warn"
    : (isIndicator ? error < 0.05 : errorInStd < 0.25)
      ? "good"
      : (isIndicator ? error < 0.12 : errorInStd < 0.75)
        ? "warn"
        : "bad";

  return (
    <div className="arena-shell" key={round}>
      <Topline title="Fair Value Drill" onExit={onExit} />

      <div className="play-grid">
        <Panel className="prompt-panel">
          <PanelHead kicker="Estimate the fair value" title={payoff.name} />
          <span className="setup-chip">{setupLabel(config)}</span>
          <p className="prompt-text">{payoff.description}</p>

          <label className="big-input">
            <span>
              {isIndicator ? "Your fair value, a probability from 0 to 1" : "Your fair value"}
            </span>
            <input
              type="number"
              value={estimate}
              placeholder={isIndicator ? "e.g. 0.25" : "type a number"}
              onChange={(e) => setEstimate(e.target.value)}
              disabled={revealed}
              inputMode="decimal"
            />
          </label>

          {!revealed ? (
            <button className="arena-start" onClick={() => setRevealed(true)} disabled={!hasEstimate}>
              Reveal the exact answer
            </button>
          ) : (
            <button className="ghost-btn wide" onClick={nextDraw}>
              <RefreshCcw size={16} /> New draw
            </button>
          )}

          {revealed ? (
            <div className={`verdict ${verdictTone}`}>
              <strong>
                You said {fmt(estimateNum)}. Fair value is {fmt(stats.ev)}.
              </strong>
              <span>
                {isIndicator
                  ? `Off by ${pct(error, 1)}. ` + (error < 0.05
                      ? "Sharp."
                      : "Re derive the probability from counts.")
                  : `Off by ${fmt(error)}, about ${fmt(errorInStd)} standard deviations. ` +
                    (errorInStd < 0.25
                      ? "That is a tradeable fair value."
                      : "Close, but a sharper quoter takes this edge.")}
              </span>
            </div>
          ) : null}
        </Panel>

        <Panel>
          <PanelHead kicker="How to estimate it" title="Mental model" />
          <p className="mental-model">{payoff.mentalModel}</p>
          {revealed ? (
            <div className="reveal-block">{metricCards(stats, payoff.kind)}</div>
          ) : (
            <div className="locked-hint">
              Commit to a number first. The distribution unlocks on reveal.
            </div>
          )}
        </Panel>

        {revealed ? (
          <Panel className="full-span">
            <PanelHead kicker="Exact distribution" title="Every outcome, weighted" />
            <Histogram
              dist={dist}
              markers={[
                { value: stats.ev, label: `fair ${fmt(stats.ev)}`, tone: "fair" },
                ...(hasEstimate
                  ? [{ value: estimateNum, label: "you", tone: "true" as const }]
                  : []),
              ]}
            />
            <p className="dist-note">
              {states.length.toLocaleString()} equally likely states, enumerated exactly. A market
              here sits near {fmt(stats.ev)} with width that respects a spread of {fmt(stats.std)}.
            </p>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

function metricCards(
  stats: ReturnType<typeof computeStats>,
  kind: string,
) {
  if (kind === "indicator") {
    return (
      <div className="stat-grid two">
        <Stat label="Probability" value={pct(stats.ev, 1)} tone="accent" />
        <Stat label="Pays 1 in" value={`${pct(stats.ev, 0)} of draws`} />
      </div>
    );
  }
  if (kind === "symmetric") {
    return (
      <>
        <div className="stat-grid">
          <Stat label="Fair value" value={fmt(stats.ev)} tone="accent" />
          <Stat label="Spread (std)" value={fmt(stats.std)} tone="warn" />
          <Stat label="Range" value={`${fmt(stats.min)} to ${fmt(stats.max)}`} />
        </div>
        <p className="metric-note">
          It centres on zero, so width is the whole game. Quote symmetric and price the spread.
        </p>
      </>
    );
  }
  return (
    <>
      <div className="stat-grid">
        <Stat label="Fair value" value={fmt(stats.ev)} tone="accent" />
        <Stat label="Std dev" value={fmt(stats.std)} />
        <Stat label="Median" value={fmt(stats.median)} />
        <Stat label="Min" value={fmt(stats.min)} tone="bad" />
        <Stat label="Max" value={fmt(stats.max)} tone="good" />
        <Stat label="p25 to p75" value={`${fmt(stats.quantiles[0.25])} to ${fmt(stats.quantiles[0.75])}`} />
      </div>
    </>
  );
}

export function Topline({ title, onExit, right }: { title: string; onExit: () => void; right?: React.ReactNode }) {
  return (
    <div className="arena-topline">
      <button className="ghost-btn" onClick={onExit}>
        <ArrowLeft size={16} /> Lobby
      </button>
      <span className="arena-mode-tag">{title}</span>
      {right}
    </div>
  );
}
