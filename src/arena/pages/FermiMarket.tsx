import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import {
  FermiQuestion,
  fermiByDifficulty,
  fermiLogError,
  fermiMarketAction,
  fermiSettlementPnl,
  fermiTrade,
  marketContains,
  marketDecades,
} from "../engine";
import { ArenaSession } from "../ArenaApp";
import { Panel, PanelHead, Pill, Stat, Topline } from "../components/ui";
import { GameRules } from "../components/gameRules";
import { fmt, fmtSigned } from "../format";

const ROUNDS = 5;
type Phase = "quote" | "quiz" | "review";

function compact(n: number): string {
  if (!Number.isFinite(n)) return ".";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) return `${fmt(n / 1_000_000_000_000)}T`;
  if (abs >= 1_000_000_000) return `${fmt(n / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${fmt(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${fmt(n / 1_000)}k`;
  return fmt(n);
}

function close(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

type Trade = {
  round: number;
  quote: { bid: number; ask: number };
  action: ReturnType<typeof fermiMarketAction>;
  price: number | null;
};

function actionCopy(action: ReturnType<typeof fermiMarketAction>): { text: string; tone: "bad" | "warn" } {
  if (action === "buy") return { text: "They bought your ask", tone: "bad" };
  if (action === "sell") return { text: "They sold your bid", tone: "bad" };
  return { text: "No trade", tone: "warn" };
}

export function FermiMarket({ session, onExit }: { session: ArenaSession; onExit: () => void }) {
  const pool = useMemo(() => {
    const list = fermiByDifficulty(session.difficulty);
    return list.length ? list : fermiByDifficulty();
  }, [session.difficulty]);

  const [gameId, setGameId] = useState(0);
  const question: FermiQuestion = useMemo(
    () => pool[Math.floor(Math.random() * pool.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, gameId],
  );

  const [phase, setPhase] = useState<Phase>("quote");
  const [round, setRound] = useState(1);
  const [position, setPosition] = useState(0);
  const [cash, setCash] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [estimate, setEstimate] = useState("");
  const [capOn, setCapOn] = useState(false);
  const [bid, setBid] = useState("");
  const [ask, setAsk] = useState("");
  const [answers, setAnswers] = useState({ pos: "", cash: "", pnl: "" });

  const bidNum = Number(bid);
  const askNum = Number(ask);
  const hasNumbers = bid.trim() !== "" && ask.trim() !== "" && bidNum > 0 && askNum > 0;
  const crossed = hasNumbers && bidNum > askNum;
  const breaksCap = capOn && hasNumbers && askNum > 1.5 * bidNum;
  const validQuote = hasNumbers && !crossed && !breaksCap;

  const estNum = Number(estimate);
  const hasEstimate = estimate.trim() !== "" && estNum > 0;
  const estError = hasEstimate ? fermiLogError(estNum, question.answer) : null;
  const finalPnl = fermiSettlementPnl(position, cash, question.answer);

  function submit() {
    if (!validQuote || phase !== "quote") return;
    const action = fermiMarketAction(bidNum, askNum, question.answer);
    const { price, positionDelta, cashDelta } = fermiTrade(action, bidNum, askNum);
    setPosition((p) => p + positionDelta);
    setCash((c) => c + cashDelta);
    setTrades((prev) => [...prev, { round, quote: { bid: bidNum, ask: askNum }, action, price }]);
    setBid("");
    setAsk("");
    if (round >= ROUNDS) setPhase("quiz");
    else setRound((r) => r + 1);
  }

  function newGame() {
    setGameId((g) => g + 1);
    setPhase("quote");
    setRound(1);
    setPosition(0);
    setCash(0);
    setTrades([]);
    setEstimate("");
    setBid("");
    setAsk("");
    setAnswers({ pos: "", cash: "", pnl: "" });
  }

  const posOk = answers.pos.trim() !== "" && Number(answers.pos) === position;
  const cashOk = answers.cash.trim() !== "" && close(Number(answers.cash), cash, Math.max(1, 0.05 * Math.abs(cash)));
  const pnlOk = answers.pnl.trim() !== "" && close(Number(answers.pnl), finalPnl, Math.max(1, 0.1 * Math.abs(finalPnl)));
  const canGrade = answers.pos.trim() !== "" && answers.cash.trim() !== "" && answers.pnl.trim() !== "";

  return (
    <div className="arena-shell">
      <Topline
        title="Fermi Markets"
        onExit={onExit}
        rules={<GameRules game="fermi" />}
        right={<span className="cp-chip">{question.unit}</span>}
      />

      <div className="session-bar">
        <Stat label="Market" value={phase === "quote" ? `${round} / ${ROUNDS}` : "settled"} />
        <Stat label="Position" value={phase === "review" ? fmtSigned(position) : "?"} hint="track it" />
        <Stat label="Cash" value={phase === "review" ? fmtSigned(cash) : "?"} hint="track it" />
        <Stat label="Profit" value={phase === "review" ? fmtSigned(finalPnl) : "?"} hint="track it" tone={phase === "review" ? (finalPnl >= 0 ? "good" : "bad") : "neutral"} />
      </div>

      <div className="play-grid">
        <Panel className="prompt-panel">
          {phase === "quote" ? (
            <>
              <PanelHead kicker="Make repeated markets" title="Fermi market" />
              <p className="fermi-question">{question.prompt}</p>
              <p className="prompt-sub">
                Quote in {question.unit}. The interviewer knows the true figure and trades only when your
                range is on the wrong side of it. Keep your position, cash, and profit in your head.
              </p>

              {round === 1 ? (
                <label className="big-input">
                  <span>Your point estimate (optional)</span>
                  <input type="number" inputMode="decimal" value={estimate} placeholder="a number" onChange={(e) => setEstimate(e.target.value)} />
                </label>
              ) : null}

              <div className="quote-form">
                <label className="bidask bid">
                  <span>Bid</span>
                  <input type="number" inputMode="decimal" value={bid} placeholder="buy at" onChange={(e) => setBid(e.target.value)} />
                </label>
                <div className="bidask-spread">
                  <span>{capOn ? "cap" : "decades"}</span>
                  <strong>{hasNumbers && !crossed ? (capOn ? `${fmt(askNum / bidNum, 2)}x` : fmt(marketDecades(bidNum, askNum), 1)) : "."}</strong>
                </div>
                <label className="bidask ask">
                  <span>Ask</span>
                  <input type="number" inputMode="decimal" value={ask} placeholder="sell at" onChange={(e) => setAsk(e.target.value)} />
                </label>
              </div>
              {crossed ? <p className="quote-error">Your bid cannot be higher than your ask.</p> : null}
              {breaksCap ? <p className="quote-error">Your ask can be at most one and a half times your bid.</p> : null}

              <label className="memory-check">
                <input type="checkbox" checked={capOn} onChange={(e) => setCapOn(e.target.checked)} />
                <span>Tight market rule: keep the ask within one and a half times the bid</span>
              </label>

              <button className="arena-start" onClick={submit} disabled={!validQuote}>Submit market</button>
            </>
          ) : phase === "quiz" ? (
            <>
              <PanelHead kicker="Checkpoint" title="Report your book from memory" />
              <p className="prompt-text">
                All five markets are done. Before the figure is revealed, tell me where your book stands.
                Answer from what you tracked.
              </p>
              <div className="memory-quiz-grid">
                <label><span>Net position</span><input value={answers.pos} inputMode="numeric" onChange={(e) => setAnswers((a) => ({ ...a, pos: e.target.value }))} /></label>
                <label><span>Cash</span><input value={answers.cash} inputMode="decimal" onChange={(e) => setAnswers((a) => ({ ...a, cash: e.target.value }))} /></label>
                <label><span>Profit at the true figure</span><input value={answers.pnl} inputMode="decimal" onChange={(e) => setAnswers((a) => ({ ...a, pnl: e.target.value }))} /></label>
              </div>
              <button className="arena-start" onClick={() => setPhase("review")} disabled={!canGrade}>See the review</button>
            </>
          ) : (
            <>
              <PanelHead kicker="Review" title="How you did" />
              <div className="headline-score">
                <span>Final profit</span>
                <strong className={finalPnl >= 0 ? "pos" : "neg"}>{fmtSigned(finalPnl)}</strong>
              </div>
              <div className="memory-answer-list">
                <div className={posOk ? "ok" : "miss"}><span>Net position</span><em>you {answers.pos || "."}</em><strong>{fmtSigned(position)}</strong></div>
                <div className={cashOk ? "ok" : "miss"}><span>Cash</span><em>you {answers.cash || "."}</em><strong>{fmtSigned(cash)}</strong></div>
                <div className={pnlOk ? "ok" : "miss"}><span>Profit</span><em>you {answers.pnl || "."}</em><strong>{fmtSigned(finalPnl)}</strong></div>
              </div>
              <div className="stat-grid">
                <Stat label="True figure" value={compact(question.answer)} tone="accent" />
                <Stat label="Your estimate" value={hasEstimate ? compact(estNum) : "."} />
                <Stat label="Estimate off by" value={estError === null ? "." : `${fmt(estError, 1)} decades`} />
              </div>
              <ol className="fermi-steps">
                {question.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
              <button className="ghost-btn wide" onClick={newGame}><RefreshCcw size={16} /> New question</button>
            </>
          )}
        </Panel>

        <Panel>
          {phase === "review" ? (
            <>
              <PanelHead kicker="Round by round" title="Your markets against the figure" />
              <div className="ledger-table">
                <div className="ledger-row head"><span>Your market</span><span>Result</span><span>Held?</span></div>
                {trades.map((t) => {
                  const copy = actionCopy(t.action);
                  const contains = marketContains(t.quote.bid, t.quote.ask, question.answer);
                  return (
                    <div key={t.round} className={`ledger-row ${contains ? "" : "breach"}`}>
                      <span>{compact(t.quote.bid)} / {compact(t.quote.ask)}</span>
                      <span>{copy.text.replace("They ", "")}</span>
                      <span>{contains ? "yes" : "no"}</span>
                    </div>
                  );
                })}
              </div>
              <p className="implication" style={{ marginTop: 12 }}>
                A range that holds the true figure keeps you flat and safe. When the interviewer trades,
                your range was on the wrong side of the answer, so tighten toward your best estimate.
              </p>
            </>
          ) : (
            <>
              <PanelHead kicker="Your job while you play" title="Anchor, then quote" />
              <p className="implication">
                Break the quantity into pieces you can reason about, land on an estimate, then quote a
                range around it. Nothing here reveals the answer or your book. You report both at the end.
              </p>
              <div className="history">
                <span className="pnl-rail-title">Trade tape</span>
                {trades.length === 0 ? (
                  <div className="locked-hint">No markets yet. Quote a range, then read what the interviewer does.</div>
                ) : (
                  trades.slice().reverse().map((t) => {
                    const copy = actionCopy(t.action);
                    return (
                      <div key={t.round} className="history-row dice-history-row">
                        <span>#{t.round}</span>
                        <Pill tone={copy.tone}>{copy.text}</Pill>
                        <span className="history-quote">{compact(t.quote.bid)} / {compact(t.quote.ask)}</span>
                        <strong>{t.price == null ? "." : compact(t.price)}</strong>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
