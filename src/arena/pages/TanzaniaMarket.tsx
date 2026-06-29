import { useState } from "react";
import { RefreshCcw } from "lucide-react";
import { ArenaSession } from "../ArenaApp";
import { Panel, PanelHead, Pill, Stat } from "../components/ui";
import { fmt, fmtSigned } from "../format";
import { Topline } from "./FairValueDrill";

type PopAction = "buy" | "sell" | "pass";

type PopTrade = {
  round: number;
  quote: { bid: number; ask: number };
  action: PopAction;
  price: number | null;
  positionAfter: number;
  cashAfter: number;
};

const TRUE_POP_MILLIONS = 68.6;
const ROUNDS = 5;

function actionForPopulation(bid: number, ask: number): PopAction {
  if (TRUE_POP_MILLIONS > ask) return "buy";
  if (TRUE_POP_MILLIONS < bid) return "sell";
  return "pass";
}

function tradeLabel(action: PopAction): { text: string; tone: "bad" | "warn" } {
  if (action === "buy") return { text: "They buy your ask", tone: "bad" };
  if (action === "sell") return { text: "They sell your bid", tone: "bad" };
  return { text: "No trade", tone: "warn" };
}

export function TanzaniaMarket({
  onExit,
}: {
  session: ArenaSession;
  onExit: () => void;
}) {
  const [round, setRound] = useState(1);
  const [bid, setBid] = useState("");
  const [ask, setAsk] = useState("");
  const [position, setPosition] = useState(0);
  const [cash, setCash] = useState(0);
  const [trades, setTrades] = useState<PopTrade[]>([]);
  const [settled, setSettled] = useState(false);

  const bidNum = Number(bid);
  const askNum = Number(ask);
  const hasNumbers = bid.trim() !== "" && ask.trim() !== "" && Number.isFinite(bidNum) && Number.isFinite(askNum);
  const crossed = hasNumbers && bidNum > askNum;
  const badBid = hasNumbers && bidNum <= 0;
  const breaksCap = hasNumbers && askNum > 1.5 * bidNum;
  const validQuote = hasNumbers && !crossed && !badBid && !breaksCap;
  const lastTrade = [...trades].reverse().find((t) => t.price !== null);
  const mark = lastTrade?.price ?? (hasNumbers && !crossed ? (bidNum + askNum) / 2 : 65);
  const publicMarkPnl = cash + position * mark;
  const finalPnl = cash + position * TRUE_POP_MILLIONS;

  function submit() {
    if (!validQuote || settled) return;
    const action = actionForPopulation(bidNum, askNum);
    let nextPosition = position;
    let nextCash = cash;
    let price: number | null = null;

    if (action === "buy") {
      price = askNum;
      nextPosition -= 1;
      nextCash += askNum;
    } else if (action === "sell") {
      price = bidNum;
      nextPosition += 1;
      nextCash -= bidNum;
    }

    setTrades((prev) => [
      ...prev,
      { round, quote: { bid: bidNum, ask: askNum }, action, price, positionAfter: nextPosition, cashAfter: nextCash },
    ]);
    setPosition(nextPosition);
    setCash(nextCash);
    setBid("");
    setAsk("");

    if (round >= ROUNDS) setSettled(true);
    else setRound((r) => r + 1);
  }

  function reset() {
    setRound(1);
    setBid("");
    setAsk("");
    setPosition(0);
    setCash(0);
    setTrades([]);
    setSettled(false);
  }

  const skewHint = position === 0
    ? "Flat book: start from your population estimate and choose a width someone might actually trade."
    : position > 0
      ? "You are long population. Lower your market to invite selling and reduce exposure."
      : "You are short population. Raise your market to invite buying and reduce exposure.";

  return (
    <div className="arena-shell">
      <Topline title="Tanzania Population" onExit={onExit} right={<span className="cp-chip">ask at most 1.5 x bid</span>} />

      <div className="session-bar">
        <Stat label="Market" value={settled ? "settled" : `${round} / ${ROUNDS}`} />
        <Stat label="Position" value={fmtSigned(position)} tone={position === 0 ? "neutral" : "warn"} hint={position > 0 ? "long" : position < 0 ? "short" : "flat"} />
        <Stat label="Cash" value={fmtSigned(cash)} tone={cash >= 0 ? "good" : "bad"} />
        <Stat label={settled ? "Final PnL" : "Marked PnL"} value={fmtSigned(settled ? finalPnl : publicMarkPnl)} tone={(settled ? finalPnl : publicMarkPnl) >= 0 ? "good" : "bad"} />
      </div>

      <div className="play-grid">
        <Panel className="prompt-panel">
          <PanelHead kicker="Repeated Fermi market" title="Make a market on Tanzania's population" />
          <p className="prompt-text">
            Quote in millions of people. The interviewer knows the settlement value and may trade
            after each market. Your ask can be at most 1.5 times your bid.
          </p>
          <p className="prompt-sub">{skewHint}</p>

          {!settled ? (
            <>
              <div className="quote-form">
                <label className="bidask bid">
                  <span>Bid</span>
                  <input type="number" inputMode="decimal" value={bid} placeholder="buy at" onChange={(e) => setBid(e.target.value)} />
                </label>
                <div className="bidask-spread">
                  <span>cap</span>
                  <strong>{hasNumbers && bidNum > 0 ? fmt(askNum / bidNum, 2) : "."}x</strong>
                </div>
                <label className="bidask ask">
                  <span>Ask</span>
                  <input type="number" inputMode="decimal" value={ask} placeholder="sell at" onChange={(e) => setAsk(e.target.value)} />
                </label>
              </div>
              {crossed ? <p className="quote-error">Bid must be at or below ask.</p> : null}
              {badBid ? <p className="quote-error">Bid must be positive.</p> : null}
              {breaksCap ? <p className="quote-error">Ask must be at most 1.5 times bid.</p> : null}
              <button className="arena-start" onClick={submit} disabled={!validQuote}>
                Submit market
              </button>
            </>
          ) : (
            <div className="summary-block">
              <div className="headline-score">
                <span>Final PnL</span>
                <strong className={finalPnl >= 0 ? "pos" : "neg"}>{fmtSigned(finalPnl)}</strong>
              </div>
              <div className="stat-grid">
                <Stat label="Settlement" value={`${fmt(TRUE_POP_MILLIONS, 1)}M`} tone="accent" />
                <Stat label="Remaining position" value={fmtSigned(position)} tone={position === 0 ? "neutral" : "warn"} />
                <Stat label="Cash ledger" value={fmtSigned(cash)} tone={cash >= 0 ? "good" : "bad"} />
              </div>
              <button className="ghost-btn wide" onClick={reset}>
                <RefreshCcw size={16} /> New Tanzania game
              </button>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHead kicker="Tape and constraints" title="Last price, position, width" />
          <div className="stat-grid">
            <Stat label="Last price" value={lastTrade?.price == null ? "." : `${fmt(lastTrade.price)}M`} />
            <Stat label="Max legal ask" value={hasNumbers && bidNum > 0 ? fmt(1.5 * bidNum) : "."} tone="warn" />
            <Stat label="Contracts" value={String(trades.filter((t) => t.price !== null).length)} />
          </div>
          <p className="implication" style={{ marginTop: 12 }}>
            The game rewards realistic width. A huge interval may contain truth, but it also avoids the
            trade flow interviewers are trying to test.
          </p>

          <div className="history">
            <span className="pnl-rail-title">Trade tape</span>
            {trades.length === 0 ? (
              <div className="locked-hint">No markets yet. Start with your best estimate, then adapt to flow and inventory.</div>
            ) : (
              trades.slice().reverse().map((t) => {
                const copy = tradeLabel(t.action);
                const pnl = t.action === "buy"
                  ? (t.price ?? 0) - TRUE_POP_MILLIONS
                  : t.action === "sell"
                    ? TRUE_POP_MILLIONS - (t.price ?? 0)
                    : 0;
                return (
                  <div key={t.round} className="history-row dice-history-row">
                    <span>#{t.round}</span>
                    <Pill tone={copy.tone}>{copy.text}</Pill>
                    <span className="history-quote">{fmt(t.quote.bid)}/{fmt(t.quote.ask)} - pos {fmtSigned(t.positionAfter)}</span>
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
