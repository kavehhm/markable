import { useMemo, useState } from "react";
import { ArrowRight, Lightbulb } from "lucide-react";
import {
  fermiByDifficulty,
  fermiLogError,
  marketContains,
  marketDecades,
} from "../engine";
import { ArenaSession } from "../ArenaApp";
import { Panel, PanelHead, Pill, Stat } from "../components/ui";
import { fmt } from "../format";
import { Topline } from "./FairValueDrill";

function compact(n: number): string {
  if (!Number.isFinite(n)) return ".";
  if (n >= 1_000_000) return `${fmt(n / 1_000_000)}M`;
  if (n >= 1_000) return `${fmt(n / 1_000)}k`;
  return fmt(n);
}

export function FermiMarket({
  session,
  onExit,
}: {
  session: ArenaSession;
  onExit: () => void;
}) {
  const pool = useMemo(() => {
    const list = fermiByDifficulty(session.difficulty);
    return list.length ? list : fermiByDifficulty();
  }, [session.difficulty]);

  const [index, setIndex] = useState(0);
  const question = pool[index % pool.length];

  const [estimate, setEstimate] = useState("");
  const [bid, setBid] = useState("");
  const [ask, setAsk] = useState("");
  const [revealed, setRevealed] = useState(false);

  const estNum = Number(estimate);
  const bidNum = Number(bid);
  const askNum = Number(ask);
  const hasEstimate = estimate.trim() !== "" && estNum > 0;
  const hasMarket =
    bid.trim() !== "" && ask.trim() !== "" && bidNum > 0 && askNum >= bidNum;

  const logErr = hasEstimate ? fermiLogError(estNum, question.answer) : null;
  const contains = hasMarket ? marketContains(bidNum, askNum, question.answer) : false;
  const decades = hasMarket ? marketDecades(bidNum, askNum) : null;

  function next() {
    setRevealed(false);
    setEstimate("");
    setBid("");
    setAsk("");
    setIndex((i) => i + 1);
  }

  const estTone = logErr === null ? "warn" : logErr < 0.3 ? "good" : logErr < 0.7 ? "warn" : "bad";

  return (
    <div className="arena-shell">
      <Topline title="Fermi Markets" onExit={onExit} />

      <div className="play-grid">
        <Panel className="prompt-panel">
          <PanelHead kicker="Make a market on this" title="Fermi estimate" right={<Lightbulb size={18} className="hint-icon" />} />
          <p className="fermi-question">{question.prompt}</p>
          <span className="setup-chip">answer is in {question.unit}</span>

          <label className="big-input">
            <span>Your point estimate</span>
            <input type="number" inputMode="decimal" value={estimate} placeholder="a number" onChange={(e) => setEstimate(e.target.value)} disabled={revealed} />
          </label>

          <div className="quote-form">
            <label className="bidask bid">
              <span>Bid</span>
              <input type="number" inputMode="decimal" value={bid} placeholder="low end" onChange={(e) => setBid(e.target.value)} disabled={revealed} />
            </label>
            <div className="bidask-spread">
              <span>decades</span>
              <strong>{hasMarket ? fmt(marketDecades(bidNum, askNum), 1) : "."}</strong>
            </div>
            <label className="bidask ask">
              <span>Ask</span>
              <input type="number" inputMode="decimal" value={ask} placeholder="high end" onChange={(e) => setAsk(e.target.value)} disabled={revealed} />
            </label>
          </div>

          {!revealed ? (
            <button className="arena-start" onClick={() => setRevealed(true)} disabled={!hasEstimate}>
              Reveal the worked answer
            </button>
          ) : (
            <button className="ghost-btn wide" onClick={next}>
              Next question <ArrowRight size={16} />
            </button>
          )}
        </Panel>

        <Panel>
          <PanelHead kicker="The reasoning" title="Order of magnitude" />
          {!revealed ? (
            <div className="locked-hint">
              Decompose the quantity into factors you can defend, then commit. The breakdown unlocks on reveal.
            </div>
          ) : (
            <>
              <div className="stat-grid">
                <Stat label="Accepted answer" value={compact(question.answer)} tone="accent" />
                <Stat label="Your estimate" value={hasEstimate ? compact(estNum) : "."} tone={estTone} />
                <Stat label="Off by" value={logErr === null ? "." : `${fmt(logErr, 1)} decades`} tone={estTone} />
              </div>
              {hasMarket ? (
                <div className="market-verdict">
                  <Pill tone={contains ? "good" : "bad"}>{contains ? "answer inside your market" : "answer outside your market"}</Pill>
                  <span>Width {fmt(decades ?? 0, 1)} decades. Tight markets that still contain the answer score best.</span>
                </div>
              ) : null}
              <ol className="fermi-steps">
                {question.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
