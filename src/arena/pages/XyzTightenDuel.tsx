import { useMemo, useState } from "react";
import { RefreshCcw, RotateCcw } from "lucide-react";
import { Panel, PanelHead, Pill, Stat, Topline } from "../components/ui";
import { fmt, fmtSigned } from "../format";

type DuelPhase = "your_quote" | "their_quote" | "done";
type DuelAction = "they_buy" | "they_sell" | "they_tighten" | "you_buy" | "you_sell";

type Market = { bid: number; ask: number };
type DuelLog = { turn: number; action: DuelAction; market: Market; pnl: number; note: string };

const DUELS = 5;
const THEO_CYCLE = [100, 80, 120, 60, 140];

function rounded(n: number): number {
  return Math.round(n * 100) / 100;
}

function interviewerTighten(current: Market, theirTheo: number): Market {
  const width = Math.max(0.5, (current.ask - current.bid) * 0.55);
  const minCenter = current.bid + width / 2;
  const maxCenter = current.ask - width / 2;
  const center = Math.min(maxCenter, Math.max(minCenter, theirTheo));
  return { bid: rounded(center - width / 2), ask: rounded(center + width / 2) };
}

function actionTone(action: DuelAction): "good" | "bad" {
  return action === "you_buy" || action === "you_sell" ? "good" : "bad";
}

function actionLabel(action: DuelAction): string {
  if (action === "they_buy") return "they buy";
  if (action === "they_sell") return "they sell";
  if (action === "they_tighten") return "they tighten";
  if (action === "you_buy") return "you buy";
  return "you sell";
}

export function XyzTightenDuel({ onExit }: { onExit: () => void }) {
  const [duel, setDuel] = useState(1);
  const [cumPnl, setCumPnl] = useState(0);
  const [wins, setWins] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);

  const [gameId, setGameId] = useState(0);
  const yourTheo = THEO_CYCLE[(duel - 1) % THEO_CYCLE.length];
  const theirTheo = useMemo(
    () => rounded(yourTheo - 10 + Math.random() * 20),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameId],
  );

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
  const outsideCurrent = hasNumbers && currentMarket !== null && (bidNum < currentMarket.bid || askNum > currentMarket.ask);
  const validQuote = hasNumbers && !crossed && !outsideCurrent;
  const edgeToBuy = currentMarket ? yourTheo - currentMarket.ask : 0;
  const edgeToSell = currentMarket ? currentMarket.bid - yourTheo : 0;
  const canBuy = phase === "their_quote" && currentMarket !== null && edgeToBuy > 0;
  const canSell = phase === "their_quote" && currentMarket !== null && edgeToSell > 0;

  // Number line axis comfortably spans both theos and the working market.
  const axisLo = Math.min(yourTheo, theirTheo) - 14;
  const axisHi = Math.max(yourTheo, theirTheo) + 14;
  const market = currentMarket ?? (hasNumbers && !crossed ? { bid: bidNum, ask: askNum } : null);

  function finish(action: DuelAction, m: Market, pnl: number, note: string) {
    setLogs((prev) => [...prev, { turn, action, market: m, pnl, note }]);
    setFinalPnl(pnl);
    setPhase("done");
  }

  function submitYourQuote() {
    if (!validQuote || phase === "done") return;
    const m = { bid: bidNum, ask: askNum };
    setBid("");
    setAsk("");
    if (theirTheo > m.ask) {
      finish("they_buy", m, m.ask - yourTheo, "They value XYZ above your ask, so they buy from you.");
      return;
    }
    if (theirTheo < m.bid) {
      finish("they_sell", m, yourTheo - m.bid, "They value XYZ below your bid, so they sell to you.");
      return;
    }
    const next = interviewerTighten(m, theirTheo);
    setLogs((prev) => [...prev, { turn, action: "they_tighten", market: next, pnl: 0, note: "Their value sits inside your market, so they tighten." }]);
    setCurrentMarket(next);
    setTurn((t) => t + 1);
    setPhase("their_quote");
  }

  function tradeOnTheirMarket(side: "buy" | "sell") {
    if (!currentMarket) return;
    if (side === "buy") finish("you_buy", currentMarket, yourTheo - currentMarket.ask, "You buy below your theoretical value.");
    else finish("you_sell", currentMarket, currentMarket.bid - yourTheo, "You sell above your theoretical value.");
  }

  function prepareTighten() {
    if (!currentMarket) return;
    setBid(String(rounded(currentMarket.bid + (currentMarket.ask - currentMarket.bid) * 0.2)));
    setAsk(String(rounded(currentMarket.ask - (currentMarket.ask - currentMarket.bid) * 0.2)));
    setPhase("your_quote");
  }

  function nextDuel() {
    const booked = finalPnl;
    setCumPnl((p) => p + booked);
    setWins((w) => w + (booked > 0 ? 1 : 0));
    if (duel >= DUELS) {
      setSessionDone(true);
      return;
    }
    setDuel((d) => d + 1);
    setGameId((g) => g + 1);
    setPhase("your_quote");
    setTurn(1);
    setCurrentMarket(null);
    setBid("");
    setAsk("");
    setLogs([]);
    setFinalPnl(0);
  }

  function restart() {
    setDuel(1);
    setCumPnl(0);
    setWins(0);
    setSessionDone(false);
    setGameId((g) => g + 1);
    setPhase("your_quote");
    setTurn(1);
    setCurrentMarket(null);
    setBid("");
    setAsk("");
    setLogs([]);
    setFinalPnl(0);
  }

  if (sessionDone) {
    return (
      <div className="arena-shell">
        <Topline title="XYZ Tighten Duel" onExit={onExit} right={<span className="cp-chip">{DUELS} duels</span>} />
        <Panel className="prompt-panel">
          <PanelHead kicker="Session review" title="How the duels went" />
          <div className="headline-score">
            <span>Total PnL by your theory</span>
            <strong className={cumPnl >= 0 ? "pos" : "neg"}>{fmtSigned(cumPnl)}</strong>
          </div>
          <div className="stat-grid">
            <Stat label="Duels" value={String(DUELS)} />
            <Stat label="Profitable" value={`${wins} / ${DUELS}`} tone={wins >= DUELS / 2 ? "good" : "warn"} />
            <Stat label="Per duel" value={fmtSigned(cumPnl / DUELS)} />
          </div>
          <div className="lesson good">
            <strong>The edge</strong>
            <p>
              When their market hands you positive edge versus your theo, take it. When it does not,
              tighten inside their market without giving their hidden value an easy fill.
            </p>
          </div>
          <button className="arena-start" onClick={restart}><RotateCcw size={16} /> New session</button>
        </Panel>
      </div>
    );
  }

  return (
    <div className="arena-shell">
      <Topline title="XYZ Tighten Duel" onExit={onExit} right={<span className="cp-chip">your theo = {yourTheo}</span>} />

      <div className="session-bar">
        <Stat label="Duel" value={`${duel} / ${DUELS}`} />
        <Stat label="Your theo" value={String(yourTheo)} tone="accent" />
        <Stat label="Session PnL" value={fmtSigned(cumPnl)} tone={cumPnl >= 0 ? "good" : "bad"} hint={`${wins} won`} />
        <Stat label="This duel" value={phase === "done" ? fmtSigned(finalPnl) : "."} tone={finalPnl >= 0 ? "good" : "bad"} />
      </div>

      <div className="play-grid">
        <Panel className="prompt-panel">
          <PanelHead kicker="Hidden value within 10 of yours" title={phase === "their_quote" ? "They tightened the market" : phase === "done" ? "Duel settled" : "Make the next market"} />
          <p className="prompt-text">
            Your theoretical value is {yourTheo}. The interviewer has a hidden value within 10 of yours.
            Whoever sees positive edge may trade; otherwise the market tightens.
          </p>

          <NumberLine
            lo={axisLo}
            hi={axisHi}
            yourTheo={yourTheo}
            market={market}
            theirTheo={phase === "done" ? theirTheo : null}
          />

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
                <button className="ghost-btn wide" onClick={prepareTighten}>Pre-fill tighter market</button>
              ) : null}
            </>
          ) : (
            <div className="summary-block">
              <div className="headline-score">
                <span>Duel PnL by your theory</span>
                <strong className={finalPnl >= 0 ? "pos" : "neg"}>{fmtSigned(finalPnl)}</strong>
              </div>
              <div className="stat-grid">
                <Stat label="Their hidden theo" value={fmt(theirTheo)} tone="accent" />
                <Stat label="Your theo" value={String(yourTheo)} />
                <Stat label="Turns" value={String(turn)} />
              </div>
              <button className="arena-start" onClick={nextDuel}>
                {duel >= DUELS ? "See session review" : "Next duel"} <RefreshCcw size={16} />
              </button>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHead kicker="Decision log" title="Trade or tighten" />
          <p className="implication">
            If their market gives you positive edge versus {yourTheo}, trade. If not, tighten inside it
            while avoiding a quote that gives their hidden value easy edge.
          </p>
          <div className="history">
            <span className="pnl-rail-title">Turns</span>
            {logs.length === 0 ? (
              <div className="locked-hint">Open with a market around {yourTheo}. The interviewer will trade or tighten.</div>
            ) : (
              logs.slice().reverse().map((l, i) => (
                <div key={`${l.turn}-${i}`} className="history-row dice-history-row">
                  <span>#{l.turn}</span>
                  <Pill tone={l.action === "they_tighten" ? "warn" : actionTone(l.action)}>{actionLabel(l.action)}</Pill>
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

function NumberLine({
  lo,
  hi,
  yourTheo,
  market,
  theirTheo,
}: {
  lo: number;
  hi: number;
  yourTheo: number;
  market: Market | null;
  theirTheo: number | null;
}) {
  const span = Math.max(1e-6, hi - lo);
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - lo) / span) * 100));
  return (
    <div className="numline">
      <div className="numline-track">
        {market ? (
          <div className="numline-band" style={{ left: `${pos(market.bid)}%`, width: `${Math.max(0.5, pos(market.ask) - pos(market.bid))}%` }} />
        ) : null}
        <div className="numline-mark you" style={{ left: `${pos(yourTheo)}%` }}><span>you {fmt(yourTheo)}</span></div>
        {theirTheo !== null ? (
          <div className="numline-mark them" style={{ left: `${pos(theirTheo)}%` }}><span>them {fmt(theirTheo)}</span></div>
        ) : null}
      </div>
      <div className="numline-scale"><span>{fmt(lo)}</span><span>{fmt(hi)}</span></div>
    </div>
  );
}
