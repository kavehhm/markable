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
import { fmt, fmtSigned } from "../format";

const ROUNDS = 5;

function compact(n: number): string {
  if (!Number.isFinite(n)) return ".";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) return `${fmt(n / 1_000_000_000_000)}T`;
  if (abs >= 1_000_000_000) return `${fmt(n / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${fmt(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${fmt(n / 1_000)}k`;
  return fmt(n);
}

type Trade = {
  round: number;
  quote: { bid: number; ask: number };
  action: ReturnType<typeof fermiMarketAction>;
  price: number | null;
  positionAfter: number;
};

function actionCopy(action: ReturnType<typeof fermiMarketAction>): { text: string; tone: "bad" | "warn" } {
  if (action === "buy") return { text: "They buy your ask", tone: "bad" };
  if (action === "sell") return { text: "They sell your bid", tone: "bad" };
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

  const [round, setRound] = useState(1);
  const [position, setPosition] = useState(0);
  const [cash, setCash] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [settled, setSettled] = useState(false);
  const [estimate, setEstimate] = useState("");
  const [capOn, setCapOn] = useState(false);
  const [bid, setBid] = useState("");
  const [ask, setAsk] = useState("");

  const bidNum = Number(bid);
  const askNum = Number(ask);
  const hasNumbers = bid.trim() !== "" && ask.trim() !== "" && bidNum > 0 && askNum > 0;
  const crossed = hasNumbers && bidNum > askNum;
  const breaksCap = capOn && hasNumbers && askNum > 1.5 * bidNum;
  const validQuote = hasNumbers && !crossed && !breaksCap;

  const estNum = Number(estimate);
  const hasEstimate = estimate.trim() !== "" && estNum > 0;
  const estError = hasEstimate ? fermiLogError(estNum, question.answer) : null;

  const lastTrade = [...trades].reverse().find((t) => t.price !== null);
  const mark = lastTrade?.price ?? (hasNumbers && !crossed ? (bidNum + askNum) / 2 : question.answer);
  const markedPnl = cash + position * mark;
  const finalPnl = fermiSettlementPnl(position, cash, question.answer);

  function submit() {
    if (!validQuote || settled) return;
    const action = fermiMarketAction(bidNum, askNum, question.answer);
    const { price, positionDelta, cashDelta } = fermiTrade(action, bidNum, askNum);
    const nextPosition = position + positionDelta;
    setPosition(nextPosition);
    setCash((c) => c + cashDelta);
    setTrades((prev) => [...prev, { round, quote: { bid: bidNum, ask: askNum }, action, price, positionAfter: nextPosition }]);
    setBid("");
    setAsk("");
    if (round >= ROUNDS) setSettled(true);
    else setRound((r) => r + 1);
  }

  function newGame() {
    setGameId((g) => g + 1);
    setRound(1);
    setPosition(0);
    setCash(0);
    setTrades([]);
    setSettled(false);
    setEstimate("");
    setBid("");
    setAsk("");
  }

  const skewHint = position === 0
    ? "Flat book. Anchor on your estimate and quote a width someone might actually trade."
    : position > 0
      ? "You are long. Lower your market to invite selling and shed exposure."
      : "You are short. Raise your market to invite buying and shed exposure.";

  return (
    <div className="arena-shell">
      <Topline
        title="Fermi Markets"
        onExit={onExit}
        right={
          <span className="topline-tags">
            <span className="cp-chip">{question.unit}</span>
            <span className="cp-chip muted">{session.difficulty}</span>
          </span>
        }
      />

      <div className="session-bar">
        <Stat label="Market" value={settled ? "settled" : `${round} / ${ROUNDS}`} />
        <Stat label="Position" value={fmtSigned(position)} tone={position === 0 ? "neutral" : "warn"} hint={position > 0 ? "long" : position < 0 ? "short" : "flat"} />
        <Stat label="Cash" value={fmtSigned(cash)} tone={cash >= 0 ? "good" : "bad"} />
        <Stat label={settled ? "Final PnL" : "Marked PnL"} value={fmtSigned(settled ? finalPnl : markedPnl)} tone={(settled ? finalPnl : markedPnl) >= 0 ? "good" : "bad"} />
      </div>

      <div className="play-grid">
        <Panel className="prompt-panel">
          <PanelHead kicker="Make repeated markets" title="Fermi market" />
          <p className="fermi-question">{question.prompt}</p>
          <p className="prompt-sub">{skewHint}</p>

          {!settled ? (
            <>
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
              {crossed ? <p className="quote-error">Bid must be at or below ask.</p> : null}
              {breaksCap ? <p className="quote-error">Ask must be at most 1.5 times bid.</p> : null}

              <label className="memory-check">
                <input type="checkbox" checked={capOn} onChange={(e) => setCapOn(e.target.checked)} />
                <span>Tight market rule: ask at most 1.5 times bid</span>
              </label>

              <button className="arena-start" onClick={submit} disabled={!validQuote}>Submit market</button>
            </>
          ) : (
            <div className="summary-block">
              <div className="headline-score">
                <span>Final PnL</span>
                <strong className={finalPnl >= 0 ? "pos" : "neg"}>{fmtSigned(finalPnl)}</strong>
              </div>
              <div className="stat-grid">
                <Stat label="Settlement" value={compact(question.answer)} tone="accent" />
                <Stat label="Your estimate" value={hasEstimate ? compact(estNum) : "."} tone={estError === null ? "neutral" : estError < 0.3 ? "good" : estError < 0.7 ? "warn" : "bad"} />
                <Stat label="Estimate off by" value={estError === null ? "." : `${fmt(estError, 1)} decades`} />
                <Stat label="Remaining position" value={fmtSigned(position)} tone={position === 0 ? "neutral" : "warn"} />
              </div>
              <ol className="fermi-steps">
                {question.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
              <button className="ghost-btn wide" onClick={newGame}><RefreshCcw size={16} /> New question</button>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHead kicker="Tape and constraints" title="Last price, position, width" />
          <div className="stat-grid">
            <Stat label="Last price" value={lastTrade?.price == null ? "." : compact(lastTrade.price)} />
            <Stat label="Contracts" value={String(trades.filter((t) => t.price !== null).length)} />
            <Stat label="Markets made" value={String(trades.length)} />
          </div>
          <p className="implication" style={{ marginTop: 12 }}>
            The interviewer knows the settlement value and trades only when your range is on the wrong
            side of it. Tight markets that still contain the answer keep you out of trouble.
          </p>

          <div className="history">
            <span className="pnl-rail-title">Trade tape</span>
            {trades.length === 0 ? (
              <div className="locked-hint">No markets yet. Start with your best estimate, then adapt to flow and inventory.</div>
            ) : (
              trades.slice().reverse().map((t) => {
                const copy = actionCopy(t.action);
                const contains = marketContains(t.quote.bid, t.quote.ask, question.answer);
                const pnl = t.action === "buy"
                  ? (t.price ?? 0) - question.answer
                  : t.action === "sell"
                    ? question.answer - (t.price ?? 0)
                    : 0;
                return (
                  <div key={t.round} className="history-row dice-history-row">
                    <span>#{t.round}</span>
                    <Pill tone={settled ? (contains ? "good" : "bad") : copy.tone}>{copy.text}</Pill>
                    <span className="history-quote">{compact(t.quote.bid)}/{compact(t.quote.ask)} · pos {fmtSigned(t.positionAfter)}</span>
                    <strong className={settled ? (pnl >= 0 ? "pos" : "neg") : ""}>{settled ? fmtSigned(pnl) : "open"}</strong>
                  </div>
                );
              })
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
