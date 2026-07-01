import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { ArenaSession } from "../ArenaApp";
import { Panel, PanelHead, Pill, Stat, Topline } from "../components/ui";
import { GameRules } from "../components/gameRules";
import { fmt, fmtSigned } from "../format";

type TradeSide = "interviewer_buys" | "interviewer_sells" | "pass";
type Phase = "quote" | "quiz" | "review";

type DiceTrade = {
  round: number;
  revealed: number[];
  theo: number;
  quote: { bid: number; ask: number };
  action: TradeSide;
  price: number | null;
};

const DICE_COUNT = 5;

function rollFive(): number[] {
  return Array.from({ length: DICE_COUNT }, () => 1 + Math.floor(Math.random() * 6));
}

function actionForQuote(finalSum: number, quote: { bid: number; ask: number }): TradeSide {
  if (finalSum > quote.ask) return "interviewer_buys";
  if (finalSum < quote.bid) return "interviewer_sells";
  return "pass";
}

function actionCopy(action: TradeSide): { label: string; tone: "good" | "bad" | "warn" } {
  if (action === "interviewer_buys") return { label: "They bought your ask", tone: "bad" };
  if (action === "interviewer_sells") return { label: "They sold your bid", tone: "bad" };
  return { label: "No trade", tone: "warn" };
}

function close(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

export function FiveDiceMarket({ onExit }: { session: ArenaSession; onExit: () => void }) {
  const [gameId, setGameId] = useState(0);
  const dice = useMemo(() => rollFive(), [gameId]);
  const finalSum = dice.reduce((acc, d) => acc + d, 0);

  const [phase, setPhase] = useState<Phase>("quote");
  const [revealedCount, setRevealedCount] = useState(1);
  const [bid, setBid] = useState("");
  const [ask, setAsk] = useState("");
  const [position, setPosition] = useState(0);
  const [cash, setCash] = useState(0);
  const [trades, setTrades] = useState<DiceTrade[]>([]);
  const [answers, setAnswers] = useState({ pos: "", cash: "", pnl: "" });

  const revealed = dice.slice(0, revealedCount);
  const revealedSum = revealed.reduce((acc, d) => acc + d, 0);
  const remaining = DICE_COUNT - revealedCount;
  const theo = revealedSum + remaining * 3.5;
  const finalPnl = cash + position * finalSum;

  const bidNum = Number(bid);
  const askNum = Number(ask);
  const validQuote =
    bid.trim() !== "" && ask.trim() !== "" &&
    Number.isFinite(bidNum) && Number.isFinite(askNum) && bidNum <= askNum;
  const crossed = bid.trim() !== "" && ask.trim() !== "" && bidNum > askNum;

  function submitQuote() {
    if (!validQuote || phase !== "quote") return;
    const quote = { bid: bidNum, ask: askNum };
    const action = actionForQuote(finalSum, quote);
    let nextPosition = position;
    let nextCash = cash;
    let price: number | null = null;
    if (action === "interviewer_buys") {
      price = quote.ask;
      nextPosition -= 1;
      nextCash += quote.ask;
    } else if (action === "interviewer_sells") {
      price = quote.bid;
      nextPosition += 1;
      nextCash -= quote.bid;
    }
    setTrades((prev) => [...prev, { round: revealedCount, revealed, theo, quote, action, price }]);
    setPosition(nextPosition);
    setCash(nextCash);
    setBid("");
    setAsk("");
    if (revealedCount >= DICE_COUNT) setPhase("quiz");
    else setRevealedCount((n) => n + 1);
  }

  function reset() {
    setGameId((id) => id + 1);
    setPhase("quote");
    setRevealedCount(1);
    setBid("");
    setAsk("");
    setPosition(0);
    setCash(0);
    setTrades([]);
    setAnswers({ pos: "", cash: "", pnl: "" });
  }

  const posOk = answers.pos.trim() !== "" && Number(answers.pos) === position;
  const cashOk = answers.cash.trim() !== "" && close(Number(answers.cash), cash, 0.5);
  const pnlOk = answers.pnl.trim() !== "" && close(Number(answers.pnl), finalPnl, 0.5);
  const canGrade = answers.pos.trim() !== "" && answers.cash.trim() !== "" && answers.pnl.trim() !== "";

  return (
    <div className="arena-shell">
      <Topline title="Five Dice Market" onExit={onExit} rules={<GameRules game="five_dice" />} right={<span className="cp-chip">sequential drill</span>} />

      <div className="session-bar">
        <Stat label="Reveal" value={phase === "quote" ? `${revealedCount} / ${DICE_COUNT}` : "settled"} />
        <Stat label="Position" value={phase === "review" ? fmtSigned(position) : "?"} hint="track it" />
        <Stat label="Cash" value={phase === "review" ? fmtSigned(cash) : "?"} hint="track it" />
        <Stat label="Profit" value={phase === "review" ? fmtSigned(finalPnl) : "?"} hint="track it" tone={phase === "review" ? (finalPnl >= 0 ? "good" : "bad") : "neutral"} />
      </div>

      <div className="play-grid">
        <Panel className="prompt-panel">
          {phase === "quote" ? (
            <>
              <PanelHead kicker="Quote the final five dice sum" title="A new die is showing" />
              <div className="dice-strip" aria-label="Revealed dice">
                {dice.map((d, i) => (
                  <span key={i} className={`die ${i < revealedCount ? "" : "hidden"}`}>
                    {i < revealedCount ? d : "?"}
                  </span>
                ))}
              </div>
              <p className="prompt-text">
                Make a market on the total of all five dice. The interviewer knows the final sum and
                trades only when your price gives them an edge. Keep your position, cash, and profit in
                your head. You report them at the end.
              </p>

              <div className="quote-form">
                <label className="bidask bid">
                  <span>Bid</span>
                  <input type="number" inputMode="decimal" value={bid} placeholder="you buy at" onChange={(e) => setBid(e.target.value)} />
                </label>
                <div className="bidask-spread">
                  <span>width</span>
                  <strong>{validQuote ? fmt(askNum - bidNum) : "."}</strong>
                </div>
                <label className="bidask ask">
                  <span>Ask</span>
                  <input type="number" inputMode="decimal" value={ask} placeholder="you sell at" onChange={(e) => setAsk(e.target.value)} />
                </label>
              </div>
              {crossed ? <p className="quote-error">Your bid cannot be higher than your ask.</p> : null}
              <button className="arena-start" onClick={submitQuote} disabled={!validQuote}>Submit market</button>
            </>
          ) : phase === "quiz" ? (
            <>
              <PanelHead kicker="Checkpoint" title="Report your book from memory" />
              <div className="dice-strip" aria-label="Final dice">
                {dice.map((d, i) => <span key={i} className="die">{d}</span>)}
              </div>
              <p className="prompt-text">
                All five dice are showing and the sum is locked in. Tell me where your book stands. Do
                not scroll back, just answer from what you tracked.
              </p>
              <div className="memory-quiz-grid">
                <label><span>Net position</span><input value={answers.pos} inputMode="numeric" onChange={(e) => setAnswers((a) => ({ ...a, pos: e.target.value }))} /></label>
                <label><span>Cash</span><input value={answers.cash} inputMode="decimal" onChange={(e) => setAnswers((a) => ({ ...a, cash: e.target.value }))} /></label>
                <label><span>Total profit</span><input value={answers.pnl} inputMode="decimal" onChange={(e) => setAnswers((a) => ({ ...a, pnl: e.target.value }))} /></label>
              </div>
              <button className="arena-start" onClick={() => setPhase("review")} disabled={!canGrade}>See the review</button>
            </>
          ) : (
            <>
              <PanelHead kicker="Review" title="What your book really was" />
              <div className="headline-score">
                <span>Final profit</span>
                <strong className={finalPnl >= 0 ? "pos" : "neg"}>{fmtSigned(finalPnl)}</strong>
              </div>
              <div className="memory-answer-list">
                <div className={posOk ? "ok" : "miss"}><span>Net position</span><em>you {answers.pos || "."}</em><strong>{fmtSigned(position)}</strong></div>
                <div className={cashOk ? "ok" : "miss"}><span>Cash</span><em>you {answers.cash || "."}</em><strong>{fmtSigned(cash)}</strong></div>
                <div className={pnlOk ? "ok" : "miss"}><span>Total profit</span><em>you {answers.pnl || "."}</em><strong>{fmtSigned(finalPnl)}</strong></div>
              </div>
              <div className="stat-grid two">
                <Stat label="Final sum" value={String(finalSum)} tone="accent" />
                <Stat label="Numbers you nailed" value={`${[posOk, cashOk, pnlOk].filter(Boolean).length} / 3`} tone="good" />
              </div>
              <button className="arena-start" onClick={reset}><RefreshCcw size={16} /> New game</button>
            </>
          )}
        </Panel>

        <Panel>
          {phase === "review" ? (
            <>
              <PanelHead kicker="Round by round" title="Your quote against fair value" />
              <div className="ledger-table">
                <div className="ledger-row head"><span>Dice</span><span>Fair</span><span>Your market</span><span>Result</span></div>
                {trades.map((t) => {
                  const copy = actionCopy(t.action);
                  const mid = (t.quote.bid + t.quote.ask) / 2;
                  const drift = mid - t.theo;
                  const tradePnl = t.action === "interviewer_buys"
                    ? (t.price ?? 0) - finalSum
                    : t.action === "interviewer_sells"
                      ? finalSum - (t.price ?? 0)
                      : 0;
                  return (
                    <div key={t.round} className={`ledger-row ${t.action !== "pass" && tradePnl < 0 ? "breach" : ""}`}>
                      <span>{t.revealed.join(" ")}{t.round < DICE_COUNT ? " ?" : ""}</span>
                      <span>{fmt(t.theo)}</span>
                      <span>{fmt(t.quote.bid)} / {fmt(t.quote.ask)}{Math.abs(drift) >= 1 ? (drift > 0 ? " high" : " low") : ""}</span>
                      <span>{copy.label.replace("They ", "")}{t.action !== "pass" ? ` ${fmtSigned(tradePnl)}` : ""}</span>
                    </div>
                  );
                })}
              </div>
              <p className="implication" style={{ marginTop: 12 }}>
                Fair value each round is the revealed sum plus 3.5 for every hidden die. A market centred
                on fair with a sensible width is hard to pick off. When your midpoint drifts from fair,
                the interviewer takes the cheap side.
              </p>
            </>
          ) : (
            <>
              <PanelHead kicker="Your job while you play" title="Hold the book in your head" />
              <p className="implication">
                Nothing here gives away the answer. Work out fair value yourself: it is the revealed sum
                plus 3.5 for each die still hidden. Then quote a market you would be happy to get hit on.
              </p>
              <p className="prompt-sub">
                When they buy your ask you get shorter and take in cash. When they sell your bid you get
                longer and pay out cash. Keep a running count of your position, your cash, and your profit.
                You report all three once the last die lands.
              </p>
              <div className="history">
                <span className="pnl-rail-title">Trade tape</span>
                {trades.length === 0 ? (
                  <div className="locked-hint">No trades yet. Quote after each die and read what the interviewer does.</div>
                ) : (
                  trades.slice().reverse().map((t) => {
                    const copy = actionCopy(t.action);
                    return (
                      <div key={t.round} className="history-row dice-history-row">
                        <span>#{t.round}</span>
                        <Pill tone={copy.tone}>{copy.label}</Pill>
                        <span className="history-quote">{fmt(t.quote.bid)} / {fmt(t.quote.ask)}</span>
                        <strong>{t.price == null ? "." : fmt(t.price)}</strong>
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
