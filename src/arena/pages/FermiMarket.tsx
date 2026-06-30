import { useMemo, useState } from "react";
import { ArrowRight, Lightbulb } from "lucide-react";
import {
  fermiByDifficulty,
  fermiLogError,
  fermiMarketAction,
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

type FermiPhase = "quote" | "response" | "revealed";

function actionLabel(action: ReturnType<typeof fermiMarketAction>): string {
  if (action === "buy") return "They buy your ask";
  if (action === "sell") return "They sell your bid";
  return "They pass";
}

function actionHint(action: ReturnType<typeof fermiMarketAction>): string {
  if (action === "buy") return "Their true value is above your high end. Your market was too low.";
  if (action === "sell") return "Their true value is below your low end. Your market was too high.";
  return "Their true value is inside your quoted range.";
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
  const [phase, setPhase] = useState<FermiPhase>("quote");

  const estNum = Number(estimate);
  const bidNum = Number(bid);
  const askNum = Number(ask);
  const hasEstimate = estimate.trim() !== "" && estNum > 0;
  const hasMarket =
    bid.trim() !== "" && ask.trim() !== "" && bidNum > 0 && askNum >= bidNum;

  const logErr = hasEstimate ? fermiLogError(estNum, question.answer) : null;
  const contains = hasMarket ? marketContains(bidNum, askNum, question.answer) : false;
  const decades = hasMarket ? marketDecades(bidNum, askNum) : null;
  const action = hasMarket ? fermiMarketAction(bidNum, askNum, question.answer) : null;
  const revealed = phase === "revealed";
  const locked = phase !== "quote";

  function next() {
    setPhase("quote");
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
            <input type="number" inputMode="decimal" value={estimate} placeholder="a number" onChange={(e) => setEstimate(e.target.value)} disabled={locked} />
          </label>

          <div className="quote-form">
            <label className="bidask bid">
              <span>Bid</span>
              <input type="number" inputMode="decimal" value={bid} placeholder="low end" onChange={(e) => setBid(e.target.value)} disabled={locked} />
            </label>
            <div className="bidask-spread">
              <span>decades</span>
              <strong>{hasMarket ? fmt(marketDecades(bidNum, askNum), 1) : "."}</strong>
            </div>
            <label className="bidask ask">
              <span>Ask</span>
              <input type="number" inputMode="decimal" value={ask} placeholder="high end" onChange={(e) => setAsk(e.target.value)} disabled={locked} />
            </label>
          </div>

          {phase === "quote" ? (
            <button className="arena-start" onClick={() => setPhase("response")} disabled={!hasMarket}>
              Submit range
            </button>
          ) : phase === "response" ? (
            <button className="arena-start" onClick={() => setPhase("revealed")}>
              Reveal worked answer
            </button>
          ) : (
            <button className="ghost-btn wide" onClick={next}>
              Next question <ArrowRight size={16} />
            </button>
          )}
        </Panel>

        <Panel>
          <PanelHead kicker="The reasoning" title="Order of magnitude" />
          {phase === "quote" ? (
            <div className="locked-hint">
              Quote a bid and ask first. The counterparty will buy your ask, sell your bid, or pass before the answer is revealed.
            </div>
          ) : phase === "response" && action ? (
            <>
              <div className="stat-grid">
                <Stat label="Their action" value={actionLabel(action)} tone={action === "pass" ? "good" : "warn"} />
                <Stat label="Your market" value={`${compact(bidNum)} to ${compact(askNum)}`} />
                <Stat label="Width" value={`${fmt(decades ?? 0, 1)} decades`} tone={(decades ?? 0) <= 1 ? "good" : "warn"} />
              </div>
              <div className="market-verdict">
                <Pill tone={action === "pass" ? "good" : "warn"}>{actionLabel(action)}</Pill>
                <span>{actionHint(action)} The exact answer and breakdown are still hidden.</span>
              </div>
            </>
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
