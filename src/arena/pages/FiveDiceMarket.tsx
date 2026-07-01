import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { ArenaSession } from "../ArenaApp";
import { Panel, PanelHead, Pill, Stat } from "../components/ui";
import { fmt, fmtSigned } from "../format";
import { Topline } from "../components/ui";

type TradeSide = "interviewer_buys" | "interviewer_sells" | "pass";

type DiceTrade = {
  round: number;
  revealed: number[];
  quote: { bid: number; ask: number };
  action: TradeSide;
  price: number | null;
  positionAfter: number;
  cashAfter: number;
};

const DICE_COUNT = 5;

function rollFive(): number[] {
  return Array.from({ length: DICE_COUNT }, () => 1 + Math.floor(Math.random() * 6));
}

function remainingSumDistribution(count: number): Array<{ value: number; count: number }> {
  let dist = new Map<number, number>([[0, 1]]);
  for (let i = 0; i < count; i++) {
    const next = new Map<number, number>();
    for (const [sum, ways] of dist) {
      for (let face = 1; face <= 6; face++) {
        next.set(sum + face, (next.get(sum + face) ?? 0) + ways);
      }
    }
    dist = next;
  }
  return [...dist.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value - b.value);
}

function quantile(dist: Array<{ value: number; count: number }>, q: number): number {
  const total = dist.reduce((acc, x) => acc + x.count, 0);
  const target = q * total;
  let cumulative = 0;
  for (const x of dist) {
    cumulative += x.count;
    if (cumulative >= target) return x.value;
  }
  return dist[dist.length - 1]?.value ?? 0;
}

function actionForQuote(finalSum: number, quote: { bid: number; ask: number }): TradeSide {
  if (finalSum > quote.ask) return "interviewer_buys";
  if (finalSum < quote.bid) return "interviewer_sells";
  return "pass";
}

function actionCopy(action: TradeSide): { label: string; tone: "good" | "bad" | "warn" } {
  if (action === "interviewer_buys") return { label: "They buy your ask", tone: "bad" };
  if (action === "interviewer_sells") return { label: "They sell your bid", tone: "bad" };
  return { label: "No trade", tone: "warn" };
}

export function FiveDiceMarket({
  onExit,
}: {
  session: ArenaSession;
  onExit: () => void;
}) {
  const [gameId, setGameId] = useState(0);
  const dice = useMemo(() => rollFive(), [gameId]);
  const finalSum = dice.reduce((acc, d) => acc + d, 0);

  const [revealedCount, setRevealedCount] = useState(1);
  const [bid, setBid] = useState("");
  const [ask, setAsk] = useState("");
  const [position, setPosition] = useState(0);
  const [cash, setCash] = useState(0);
  const [trades, setTrades] = useState<DiceTrade[]>([]);
  const [settled, setSettled] = useState(false);

  const revealed = dice.slice(0, revealedCount);
  const revealedSum = revealed.reduce((acc, d) => acc + d, 0);
  const remaining = DICE_COUNT - revealedCount;
  const remainingDist = useMemo(() => remainingSumDistribution(remaining), [remaining]);
  const theoretical = revealedSum + remaining * 3.5;
  const ciLow = revealedSum + quantile(remainingDist, 0.05);
  const ciHigh = revealedSum + quantile(remainingDist, 0.95);
  const lastTrade = [...trades].reverse().find((t) => t.price !== null);
  const finalPnl = cash + position * finalSum;
  const publicMarkPnl = cash + position * theoretical;

  const bidNum = Number(bid);
  const askNum = Number(ask);
  const validQuote =
    bid.trim() !== "" &&
    ask.trim() !== "" &&
    Number.isFinite(bidNum) &&
    Number.isFinite(askNum) &&
    bidNum <= askNum;
  const crossed = bid.trim() !== "" && ask.trim() !== "" && bidNum > askNum;

  function submitQuote() {
    if (!validQuote || settled) return;
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

    setTrades((prev) => [
      ...prev,
      {
        round: revealedCount,
        revealed,
        quote,
        action,
        price,
        positionAfter: nextPosition,
        cashAfter: nextCash,
      },
    ]);
    setPosition(nextPosition);
    setCash(nextCash);
    setBid("");
    setAsk("");

    if (revealedCount >= DICE_COUNT) {
      setSettled(true);
    } else {
      setRevealedCount((n) => n + 1);
    }
  }

  function reset() {
    setGameId((id) => id + 1);
    setRevealedCount(1);
    setBid("");
    setAsk("");
    setPosition(0);
    setCash(0);
    setTrades([]);
    setSettled(false);
  }

  const suggestedSkew = position === 0
    ? "Flat book: a symmetric market around theoretical value is natural."
    : position > 0
      ? "You are long. Shade your market lower to make selling easier and buying less attractive."
      : "You are short. Shade your market higher to make buying back easier and selling less attractive.";

  return (
    <div className="arena-shell">
      <Topline title="Five Dice Market" onExit={onExit} right={<span className="cp-chip">sequential interview drill</span>} />

      <div className="session-bar">
        <Stat label="Reveal" value={settled ? "settled" : `${revealedCount} / ${DICE_COUNT}`} />
        <Stat label="Position" value={fmtSigned(position)} tone={position === 0 ? "neutral" : "warn"} hint={position > 0 ? "long" : position < 0 ? "short" : "flat"} />
        <Stat label="Cash" value={fmtSigned(cash)} tone={cash >= 0 ? "good" : "bad"} />
        <Stat
          label={settled ? "Final PnL" : "Mark PnL"}
          value={fmtSigned(settled ? finalPnl : publicMarkPnl)}
          tone={(settled ? finalPnl : publicMarkPnl) >= 0 ? "good" : "bad"}
        />
      </div>

      <div className="play-grid">
        <Panel className="prompt-panel">
          <PanelHead kicker="Quote the final five-dice sum" title="A die has just been revealed" />
          <div className="dice-strip" aria-label="Revealed dice">
            {dice.map((d, i) => (
              <span key={i} className={`die ${i < revealedCount ? "" : "hidden"}`}>
                {i < revealedCount ? d : "?"}
              </span>
            ))}
          </div>
          <p className="prompt-text">
            Make a market on the final sum of all five dice. The interviewer knows the final sum
            and will trade only when your market gives them edge.
          </p>
          <p className="prompt-sub">
            Theoretical value is {fmt(theoretical)} from revealed sum {revealedSum} plus {remaining}
            remaining dice at 3.5 each.
          </p>

          {!settled ? (
            <>
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
              {crossed ? <p className="quote-error">Bid must be at or below ask.</p> : null}
              <button className="arena-start" onClick={submitQuote} disabled={!validQuote}>
                Submit market
              </button>
            </>
          ) : (
            <div className="summary-block">
              <div className={`headline-score ${finalPnl >= 0 ? "good" : "bad"}`}>
                <span>Final PnL</span>
                <strong className={finalPnl >= 0 ? "pos" : "neg"}>{fmtSigned(finalPnl)}</strong>
              </div>
              <div className="stat-grid">
                <Stat label="Final sum" value={String(finalSum)} tone="accent" />
                <Stat label="Remaining position" value={fmtSigned(position)} tone={position === 0 ? "neutral" : "warn"} />
                <Stat label="Cash ledger" value={fmtSigned(cash)} tone={cash >= 0 ? "good" : "bad"} />
              </div>
              <button className="ghost-btn wide" onClick={reset}>
                <RefreshCcw size={16} /> New five dice game
              </button>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHead kicker="Market-making theory" title="Value, last trade, position" />
          <div className="stat-grid">
            <Stat label="Theo" value={fmt(theoretical)} tone="accent" />
            <Stat label="90% CI" value={`${fmt(ciLow)} to ${fmt(ciHigh)}`} tone="warn" />
            <Stat label="Last price" value={lastTrade?.price == null ? "." : fmt(lastTrade.price)} />
          </div>
          <p className="implication" style={{ marginTop: 12 }}>{suggestedSkew}</p>
          <p className="prompt-sub">
            Wider markets reduce adverse trades, but absurd width gets no flow. If your position grows,
            skew the whole market to invite the offsetting side.
          </p>

          <div className="history">
            <span className="pnl-rail-title">Trade tape</span>
            {trades.length === 0 ? (
              <div className="locked-hint">No trades yet. Quote after each reveal and watch how inventory changes.</div>
            ) : (
              trades.slice().reverse().map((t) => {
                const copy = actionCopy(t.action);
                const tradePnl = t.action === "interviewer_buys"
                  ? (t.price ?? 0) - finalSum
                  : t.action === "interviewer_sells"
                    ? finalSum - (t.price ?? 0)
                    : 0;
                return (
                  <div key={t.round} className="history-row dice-history-row">
                    <span>#{t.round}</span>
                    <Pill tone={copy.tone}>{copy.label}</Pill>
                    <span className="history-quote">
                      {fmt(t.quote.bid)}/{fmt(t.quote.ask)} - pos {fmtSigned(t.positionAfter)}
                    </span>
                    <strong className={settled ? (tradePnl >= 0 ? "pos" : "neg") : ""}>
                      {settled ? fmtSigned(tradePnl) : "open"}
                    </strong>
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
