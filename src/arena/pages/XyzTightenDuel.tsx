import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { ArenaSession } from "../ArenaApp";
import { Panel, PanelHead, Pill, Stat } from "../components/ui";
import { fmt, fmtSigned } from "../format";
import { Topline } from "./FairValueDrill";

type DuelPhase = "your_quote" | "their_quote" | "done";
type DuelAction = "they_buy" | "they_sell" | "they_tighten" | "you_buy" | "you_sell" | "stale";

type Market = { bid: number; ask: number };

type DuelLog = {
  turn: number;
  action: DuelAction;
  market: Market;
  pnl: number;
  note: string;
};

const YOUR_THEO = 100;

function hiddenTheo(): number {
  return 90 + Math.random() * 20;
}

function rounded(n: number): number {
  return Math.round(n * 100) / 100;
}

function interviewerTighten(current: Market, theirTheo: number): Market {
  const width = Math.max(0.5, (current.ask - current.bid) * 0.55);
  const minCenter = current.bid + width / 2;
  const maxCenter = current.ask - width / 2;
  const center = Math.min(maxCenter, Math.max(minCenter, theirTheo));
  return {
    bid: rounded(center - width / 2),
    ask: rounded(center + width / 2),
  };
}

function actionTone(action: DuelAction): "good" | "bad" | "warn" {
  if (action === "you_buy" || action === "you_sell") return "good";
  if (action === "they_buy" || action === "they_sell") return "bad";
  return "warn";
}

function actionLabel(action: DuelAction): string {
  if (action === "they_buy") return "they buy";
  if (action === "they_sell") return "they sell";
  if (action === "they_tighten") return "they tighten";
  if (action === "you_buy") return "you buy";
  if (action === "you_sell") return "you sell";
  return "no trade";
}

export function XyzTightenDuel({
  onExit,
}: {
  session: ArenaSession;
  onExit: () => void;
}) {
  const [gameId, setGameId] = useState(0);
  const theirTheo = useMemo(() => hiddenTheo(), [gameId]);
  const [phase, setPhase] = useState<DuelPhase>("your_quote");
  const [turn, setTurn] = useState(1);
  const [currentMarket, setCurrentMarket] = useState<Market | null>(null);
  const [bid, setBid] = useState("");
  const [ask, setAsk] = useState("");
  const [logs, setLogs] = useState<DuelLog[]>([]);
  const [finalPnl, setFinalPnl] = useState(0);

  const bidNum = Number(bid);
  const askNum = Number(ask);
  const hasNumbers = bid.trim() !== "" && ask.trim() !== "" && Number.isFinite(bidNum) && Number.isFinite(askNum);
  const crossed = hasNumbers && bidNum > askNum;
  const outsideCurrent =
    hasNumbers &&
    currentMarket !== null &&
    (bidNum < currentMarket.bid || askNum > currentMarket.ask);
  const validQuote = hasNumbers && !crossed && !outsideCurrent;
  const edgeToBuy = currentMarket ? YOUR_THEO - currentMarket.ask : 0;
  const edgeToSell = currentMarket ? currentMarket.bid - YOUR_THEO : 0;
  const canBuy = phase === "their_quote" && currentMarket !== null && edgeToBuy > 0;
  const canSell = phase === "their_quote" && currentMarket !== null && edgeToSell > 0;

  function finish(action: DuelAction, market: Market, pnl: number, note: string) {
    setLogs((prev) => [...prev, { turn, action, market, pnl, note }]);
    setFinalPnl(pnl);
    setPhase("done");
  }

  function submitYourQuote() {
    if (!validQuote || phase === "done") return;
    const market = { bid: bidNum, ask: askNum };
    setBid("");
    setAsk("");

    if (theirTheo > market.ask) {
      finish("they_buy", market, market.ask - YOUR_THEO, "They value XYZ above your ask, so they buy from you.");
      return;
    }
    if (theirTheo < market.bid) {
      finish("they_sell", market, YOUR_THEO - market.bid, "They value XYZ below your bid, so they sell to you.");
      return;
    }

    const next = interviewerTighten(market, theirTheo);
    setLogs((prev) => [
      ...prev,
      { turn, action: "they_tighten", market: next, pnl: 0, note: "Their theoretical value sits inside your market, so they tighten." },
    ]);
    setCurrentMarket(next);
    setTurn((t) => t + 1);
    setPhase("their_quote");
  }

  function tradeOnTheirMarket(side: "buy" | "sell") {
    if (!currentMarket) return;
    if (side === "buy") {
      finish("you_buy", currentMarket, YOUR_THEO - currentMarket.ask, "You buy below your 100 theoretical value.");
    } else {
      finish("you_sell", currentMarket, currentMarket.bid - YOUR_THEO, "You sell above your 100 theoretical value.");
    }
  }

  function prepareTighten() {
    if (!currentMarket) return;
    setBid(String(rounded(currentMarket.bid + (currentMarket.ask - currentMarket.bid) * 0.2)));
    setAsk(String(rounded(currentMarket.ask - (currentMarket.ask - currentMarket.bid) * 0.2)));
    setPhase("your_quote");
  }

  function reset() {
    setGameId((id) => id + 1);
    setPhase("your_quote");
    setTurn(1);
    setCurrentMarket(null);
    setBid("");
    setAsk("");
    setLogs([]);
    setFinalPnl(0);
  }

  return (
    <div className="arena-shell">
      <Topline title="XYZ Tighten Duel" onExit={onExit} right={<span className="cp-chip">your theo = 100</span>} />

      <div className="session-bar">
        <Stat label="Turn" value={phase === "done" ? "done" : String(turn)} />
        <Stat label="Your theo" value={String(YOUR_THEO)} tone="accent" />
        <Stat label="Current market" value={currentMarket ? `${fmt(currentMarket.bid)} / ${fmt(currentMarket.ask)}` : "."} />
        <Stat label="PnL" value={phase === "done" ? fmtSigned(finalPnl) : "."} tone={finalPnl >= 0 ? "good" : "bad"} />
      </div>

      <div className="play-grid">
        <Panel className="prompt-panel">
          <PanelHead kicker="Uniform 90 to 110 theoretical values" title={phase === "their_quote" ? "They tightened the market" : "Make the next market"} />
          <p className="prompt-text">
            You know your theoretical value is 100. The interviewer has their own hidden theoretical
            value from 90 to 110. Whoever sees positive edge may trade; otherwise the market tightens.
          </p>

          {phase === "their_quote" && currentMarket ? (
            <div className="duel-market">
              <span>Interviewer market</span>
              <strong>{fmt(currentMarket.bid)} @ {fmt(currentMarket.ask)}</strong>
              <p>Buy edge {fmtSigned(edgeToBuy)}. Sell edge {fmtSigned(edgeToSell)}.</p>
            </div>
          ) : null}

          {phase !== "done" ? (
            <>
              <div className="quote-form">
                <label className="bidask bid">
                  <span>Bid</span>
                  <input type="number" inputMode="decimal" value={bid} placeholder="your bid" onChange={(e) => setBid(e.target.value)} />
                </label>
                <div className="bidask-spread">
                  <span>width</span>
                  <strong>{validQuote ? fmt(askNum - bidNum) : "."}</strong>
                </div>
                <label className="bidask ask">
                  <span>Ask</span>
                  <input type="number" inputMode="decimal" value={ask} placeholder="your ask" onChange={(e) => setAsk(e.target.value)} />
                </label>
              </div>
              {crossed ? <p className="quote-error">Bid must be at or below ask.</p> : null}
              {outsideCurrent ? <p className="quote-error">A tightened market must stay inside the current market.</p> : null}

              <div className="result-actions">
                <button className="arena-start compact" onClick={submitYourQuote} disabled={!validQuote}>
                  {currentMarket ? "Submit tighter market" : "Open market"}
                </button>
                {phase === "their_quote" ? (
                  <>
                    <button className="ghost-btn" onClick={() => tradeOnTheirMarket("buy")} disabled={!canBuy}>Buy ask</button>
                    <button className="ghost-btn" onClick={() => tradeOnTheirMarket("sell")} disabled={!canSell}>Sell bid</button>
                  </>
                ) : null}
              </div>
              {phase === "their_quote" ? (
                <button className="ghost-btn wide" onClick={prepareTighten}>
                  Pre-fill tighter market
                </button>
              ) : null}
            </>
          ) : (
            <div className="summary-block">
              <div className="headline-score">
                <span>Trade PnL by your theory</span>
                <strong className={finalPnl >= 0 ? "pos" : "neg"}>{fmtSigned(finalPnl)}</strong>
              </div>
              <div className="stat-grid">
                <Stat label="Their hidden theo" value={fmt(theirTheo)} tone="accent" />
                <Stat label="Your theo" value={String(YOUR_THEO)} />
                <Stat label="Turns" value={String(turn)} />
              </div>
              <button className="ghost-btn wide" onClick={reset}>
                <RefreshCcw size={16} /> New XYZ duel
              </button>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHead kicker="Decision log" title="Trade or tighten" />
          <p className="implication">
            If their market gives you positive edge versus 100, trade. If not, tighten inside it
            while avoiding a quote that gives their hidden value easy edge.
          </p>
          <div className="history">
            <span className="pnl-rail-title">Turns</span>
            {logs.length === 0 ? (
              <div className="locked-hint">Open with a market around 100. The interviewer will trade or tighten.</div>
            ) : (
              logs.slice().reverse().map((l, i) => (
                <div key={`${l.turn}-${i}`} className="history-row dice-history-row">
                  <span>#{l.turn}</span>
                  <Pill tone={actionTone(l.action)}>{actionLabel(l.action)}</Pill>
                  <span className="history-quote">{fmt(l.market.bid)} / {fmt(l.market.ask)}</span>
                  <strong className={l.pnl >= 0 ? "pos" : "neg"}>{l.action === "they_tighten" ? "tight" : fmtSigned(l.pnl)}</strong>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
