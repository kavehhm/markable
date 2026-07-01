import { useEffect, useMemo, useState } from "react";
import { Dice5, RotateCcw, Settings2, Spade, TrendingDown, TrendingUp } from "lucide-react";
import {
  Side,
  TradeRound,
  TradeUnit,
  generateTradeRound,
  isValidOrder,
  maxBuyUnits,
  maxSellUnits,
  tradePnl,
} from "../engine";
import { Panel, PanelHead, Pill, Stat, Topline } from "../components/ui";
import { GameRules } from "../components/gameRules";
import { fmt, fmtSigned } from "../format";

type Difficulty = "easy" | "medium" | "hard" | "custom";
type Phase = "setup" | "trade" | "result" | "summary";
type Source = "cards" | "dice";
const BUDGET = 500;

const PRESETS: Record<Exclude<Difficulty, "custom">, { count: number; rounds: number; time: number; showBalance: boolean; events: boolean }> = {
  easy: { count: 3, rounds: 3, time: 60, showBalance: true, events: false },
  medium: { count: 5, rounds: 5, time: 30, showBalance: true, events: false },
  hard: { count: 7, rounds: 7, time: 20, showBalance: false, events: true },
};

type Order = { side: Side | "none"; units: number; price: number; pnl: number };
type RoundLog = { round: number; side: Side | "none"; units: number; pnl: number; balanceAfter: number; retOk: boolean; balOk: boolean };

export function TradingFloor({ onExit }: { onExit: () => void }) {
  const [source, setSource] = useState<Source>("cards");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [count, setCount] = useState(3);
  const [rounds, setRounds] = useState(3);
  const [time, setTime] = useState(60);
  const [showBalance, setShowBalance] = useState(true);
  const [events, setEvents] = useState(false);

  const [phase, setPhase] = useState<Phase>("setup");
  const [roundNo, setRoundNo] = useState(1);
  const [balance, setBalance] = useState(BUDGET);
  const [round, setRound] = useState<TradeRound | null>(null);
  const [unitsStr, setUnitsStr] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [report, setReport] = useState({ ret: "", bal: "", checked: false });
  const [logs, setLogs] = useState<RoundLog[]>([]);

  function applyDifficulty(d: Difficulty) {
    setDifficulty(d);
    if (d === "custom") return;
    const p = PRESETS[d];
    setCount(p.count);
    setRounds(p.rounds);
    setTime(p.time);
    setShowBalance(p.showBalance);
    setEvents(p.events);
  }

  function startGame() {
    setBalance(BUDGET);
    setRoundNo(1);
    setLogs([]);
    setRound(generateTradeRound(source, count, events));
    setUnitsStr("");
    setOrder(null);
    setReport({ ret: "", bal: "", checked: false });
    setSecondsLeft(time);
    setPhase("trade");
  }

  function settle(side: Side | "none", units: number) {
    if (!round) return;
    const price = round.trueSum;
    const pnl = side === "none" ? 0 : tradePnl(side, units, round.quote, price);
    setOrder({ side, units, price, pnl });
    setReport({ ret: "", bal: "", checked: false });
    setPhase("result");
  }

  // Per round countdown. Running out of time voids the order for the round.
  useEffect(() => {
    if (phase !== "trade" || !round) return;
    if (secondsLeft <= 0) {
      settle("none", 0);
      return;
    }
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsLeft, round]);

  function nextRound() {
    if (!order || !round) return;
    const balanceAfter = balance + order.pnl;
    const actualBal = balanceAfter;
    const retOk = report.ret.trim() !== "" && Number(report.ret) === order.pnl;
    const balOk = showBalance || (report.bal.trim() !== "" && Number(report.bal) === actualBal);
    setLogs((l) => [...l, { round: roundNo, side: order.side, units: order.units, pnl: order.pnl, balanceAfter, retOk, balOk }]);
    setBalance(balanceAfter);
    if (roundNo >= rounds) {
      setPhase("summary");
      return;
    }
    setRoundNo((n) => n + 1);
    setRound(generateTradeRound(source, count, events));
    setUnitsStr("");
    setOrder(null);
    setReport({ ret: "", bal: "", checked: false });
    setSecondsLeft(time);
    setPhase("trade");
  }

  if (phase === "setup") {
    return (
      <SetupScreen
        source={source} setSource={setSource}
        difficulty={difficulty} applyDifficulty={applyDifficulty}
        count={count} setCount={(v) => { setCount(v); setDifficulty("custom"); }}
        rounds={rounds} setRounds={(v) => { setRounds(v); setDifficulty("custom"); }}
        time={time} setTime={(v) => { setTime(v); setDifficulty("custom"); }}
        showBalance={showBalance} setShowBalance={(v) => { setShowBalance(v); setDifficulty("custom"); }}
        events={events} setEvents={(v) => { setEvents(v); setDifficulty("custom"); }}
        onStart={startGame} onExit={onExit}
      />
    );
  }

  if (phase === "summary") {
    const totalPnl = balance - BUDGET;
    const retHits = logs.filter((l) => l.retOk).length;
    const balHits = logs.filter((l) => l.balOk).length;
    return (
      <div className="arena-shell">
        <Topline title="Trading Floor" onExit={onExit} rules={<GameRules game="trade_floor" />} right={<span className="cp-chip">{source}</span>} />
        <Panel className="prompt-panel">
          <PanelHead kicker="Session review" title="How you traded the maker" />
          <div className="headline-score">
            <span>Total PnL</span>
            <strong className={totalPnl >= 0 ? "pos" : "neg"}>{fmtSigned(totalPnl)}</strong>
          </div>
          <div className="stat-grid">
            <Stat label="Final balance" value={fmt(balance)} tone={balance >= BUDGET ? "good" : "bad"} />
            <Stat label="Rounds" value={String(rounds)} />
            <Stat label="Return calls right" value={`${retHits} / ${logs.length}`} tone={retHits === logs.length ? "good" : "warn"} />
            {!showBalance ? <Stat label="Balance calls right" value={`${balHits} / ${logs.length}`} tone={balHits === logs.length ? "good" : "warn"} /> : null}
          </div>
          <div className="ledger-table" style={{ marginTop: 12 }}>
            <div className="ledger-row head"><span>Round</span><span>Order</span><span>PnL</span><span>Balance</span></div>
            {logs.map((l) => (
              <div key={l.round} className="ledger-row">
                <span>#{l.round}</span>
                <span>{l.side === "none" ? "no trade" : `${l.side} ${l.units}`}</span>
                <span className={l.pnl >= 0 ? "pos" : "neg"}>{fmtSigned(l.pnl)}</span>
                <span>{fmt(l.balanceAfter)}</span>
              </div>
            ))}
          </div>
          <button className="arena-start" onClick={() => setPhase("setup")}><RotateCcw size={16} /> New game</button>
        </Panel>
      </div>
    );
  }

  if (!round) return null;

  const unitsNum = Number(unitsStr);
  const hasUnits = unitsStr.trim() !== "" && Number.isInteger(unitsNum) && unitsNum > 0;
  const canBuy = hasUnits && isValidOrder("buy", unitsNum, balance, round.quote, round.maxSum);
  const canSell = hasUnits && isValidOrder("sell", unitsNum, balance, round.quote, round.maxSum);
  const maxBuy = maxBuyUnits(balance, round.quote.ask);
  const maxSell = maxSellUnits(balance, round.quote.bid, round.maxSum);

  return (
    <div className="arena-shell">
      <Topline
        title="Trading Floor"
        onExit={onExit}
        rules={<GameRules game="trade_floor" />}
        right={
          <span className="topline-tags">
            <span className="cp-chip">{source}</span>
            <span className="cp-chip muted">{difficulty}</span>
          </span>
        }
      />

      <div className="session-bar">
        <Stat label="Round" value={`${roundNo} / ${rounds}`} />
        <Stat label="Balance" value={showBalance ? fmt(balance) : "hidden"} tone={showBalance ? (balance >= BUDGET ? "good" : "bad") : "neutral"} hint={showBalance ? undefined : "track it yourself"} />
        <Stat label="Market maker" value={`${fmt(round.quote.bid)} at ${fmt(round.quote.ask)}`} tone="accent" />
        <Stat label="Time" value={phase === "trade" ? `${secondsLeft}s` : "."} tone={phase === "trade" && secondsLeft <= 5 ? "bad" : "neutral"} />
      </div>

      <div className="play-grid">
        <Panel className="prompt-panel">
          <PanelHead kicker={source === "cards" ? "Sum of the cards" : "Sum of the dice"} title={phase === "result" ? "Market settled" : "Read the board, beat the quote"} />

          {round.event ? <div className="event-banner">Market event: {round.event.label}</div> : null}

          <UnitBoard units={round.units} reveal={phase === "result"} source={source} />

          {phase === "trade" ? (
            <>
              <div className="mm-quote">
                <div className="mm-side bid"><span>Bid</span><strong>{fmt(round.quote.bid)}</strong><em>you sell here</em></div>
                <div className="mm-at">at</div>
                <div className="mm-side ask"><span>Ask</span><strong>{fmt(round.quote.ask)}</strong><em>you buy here</em></div>
              </div>

              <div className="trade-timer"><i style={{ width: `${Math.max(0, (secondsLeft / time) * 100)}%` }} /></div>

              <label className="big-input">
                <span>Units to trade</span>
                <input type="number" inputMode="numeric" value={unitsStr} placeholder="how many" onChange={(e) => setUnitsStr(e.target.value)} />
              </label>
              <p className="prompt-sub">You can buy up to {maxBuy} at the ask, or sell up to {maxSell} at the bid, given your balance.</p>

              <div className="trade-actions">
                <button className="trade-btn buy" onClick={() => canBuy && settle("buy", unitsNum)} disabled={!canBuy}>
                  <TrendingUp size={16} /> Buy {hasUnits ? unitsNum : ""} at {fmt(round.quote.ask)}
                </button>
                <button className="trade-btn sell" onClick={() => canSell && settle("sell", unitsNum)} disabled={!canSell}>
                  <TrendingDown size={16} /> Sell {hasUnits ? unitsNum : ""} at {fmt(round.quote.bid)}
                </button>
              </div>
              <button className="ghost-btn wide" onClick={() => settle("none", 0)}>Pass this round</button>
            </>
          ) : null}

          {phase === "result" && order ? (
            <ResultPanel
              order={order}
              round={round}
              balanceBefore={balance}
              showBalance={showBalance}
              report={report}
              setReport={setReport}
              onNext={nextRound}
              lastRound={roundNo >= rounds}
            />
          ) : null}
        </Panel>

        <Panel>
          <PanelHead kicker="Your edge" title="Fair value vs the quote" />
          <p className="implication">
            The maker quotes at random. Estimate the total from the face up {source} and the average
            of the {round.hiddenCount} hidden one{round.hiddenCount === 1 ? "" : "s"}. Buy when the ask
            sits below your fair value, sell when the bid sits above it.
          </p>
          {phase === "result" ? (
            <div className="stat-grid two" style={{ marginTop: 12 }}>
              <Stat label="Fair value" value={fmt(round.fair)} tone="accent" />
              <Stat label="Settled sum" value={fmt(round.trueSum)} tone="good" />
            </div>
          ) : (
            <div className="stat-grid two" style={{ marginTop: 12 }}>
              <Stat label="Possible range" value={`${fmt(round.minSum)} to ${fmt(round.maxSum)}`} />
              <Stat label="Hidden units" value={String(round.hiddenCount)} tone="warn" />
            </div>
          )}
          <div className="history">
            <span className="pnl-rail-title">Round history</span>
            {logs.length === 0 ? (
              <div className="locked-hint">No trades yet. Watch the quote drift from fair value and pounce.</div>
            ) : (
              logs.slice().reverse().map((l) => (
                <div key={l.round} className="history-row">
                  <span>#{l.round}</span>
                  <Pill tone={l.side === "none" ? "warn" : l.pnl >= 0 ? "good" : "bad"}>{l.side === "none" ? "pass" : l.side}</Pill>
                  <span className="history-quote">{l.side === "none" ? "." : `${l.units}u`}</span>
                  <strong className={l.pnl >= 0 ? "pos" : "neg"}>{fmtSigned(l.pnl)}</strong>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ResultPanel({
  order, round, balanceBefore, showBalance, report, setReport, onNext, lastRound,
}: {
  order: Order;
  round: TradeRound;
  balanceBefore: number;
  showBalance: boolean;
  report: { ret: string; bal: string; checked: boolean };
  setReport: (r: { ret: string; bal: string; checked: boolean }) => void;
  onNext: () => void;
  lastRound: boolean;
}) {
  const balanceAfter = balanceBefore + order.pnl;
  const retOk = report.ret.trim() !== "" && Number(report.ret) === order.pnl;
  const balOk = report.bal.trim() !== "" && Number(report.bal) === balanceAfter;
  const canCheck = report.ret.trim() !== "" && (showBalance || report.bal.trim() !== "");

  return (
    <div className="result-block">
      <div className="reveal-outcome">
        <div className="result-payoff-line">
          <Pill tone={order.side === "none" ? "warn" : order.pnl >= 0 ? "good" : "bad"}>
            {order.side === "none" ? "No trade" : `${order.side === "buy" ? "Bought" : "Sold"} ${order.units} at ${fmt(order.side === "buy" ? round.quote.ask : round.quote.bid)}`}
          </Pill>
          <span className="result-pnl">round <strong className={order.pnl >= 0 ? "pos" : "neg"}>{fmtSigned(order.pnl)}</strong></span>
        </div>
        <div className="reveal-payoff"><span>Market price</span><strong>{fmt(round.trueSum)}</strong></div>
      </div>

      {!report.checked ? (
        <div className="report-form">
          <label className="report-field">
            <span className="config-legend">Report your return this round</span>
            <input type="number" inputMode="numeric" value={report.ret} placeholder="your PnL" onChange={(e) => setReport({ ...report, ret: e.target.value })} />
          </label>
          {!showBalance ? (
            <label className="report-field">
              <span className="config-legend">Report your running balance</span>
              <input type="number" inputMode="numeric" value={report.bal} placeholder="balance now" onChange={(e) => setReport({ ...report, bal: e.target.value })} />
            </label>
          ) : null}
          <button className="arena-start" onClick={() => setReport({ ...report, checked: true })} disabled={!canCheck}>Check</button>
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <Stat label="Actual return" value={fmtSigned(order.pnl)} tone={order.pnl >= 0 ? "good" : "bad"} />
            <Stat label="You reported" value={report.ret === "" ? "." : fmtSigned(Number(report.ret))} tone={retOk ? "good" : "bad"} />
            {!showBalance ? <Stat label="Actual balance" value={fmt(balanceAfter)} /> : null}
            {!showBalance ? <Stat label="You reported" value={report.bal === "" ? "." : fmt(Number(report.bal))} tone={balOk ? "good" : "bad"} /> : null}
          </div>
          <button className="arena-start" onClick={onNext}>{lastRound ? "See results" : "Next round"}</button>
        </>
      )}
    </div>
  );
}

function UnitBoard({ units, reveal, source }: { units: TradeUnit[]; reveal: boolean; source: Source }) {
  return (
    <div className={`trade-units ${source}`}>
      {units.map((u, i) => {
        const shown = u.faceUp || reveal;
        if (!shown) return <div key={i} className="unit back"><span>?</span></div>;
        if (source === "cards") {
          const rank = u.faceLabel.slice(0, -1);
          return (
            <div key={i} className={`playing-card ${u.color}`}>
              <span className="pc-rank">{rank}</span>
              <span className="pc-suit">{u.suit}</span>
              <span className="pc-value">{u.value}</span>
            </div>
          );
        }
        return (
          <div key={i} className="die trade-die">
            <span>{u.faceLabel}</span>
            {u.value !== Number(u.faceLabel) ? <em>={u.value}</em> : null}
          </div>
        );
      })}
    </div>
  );
}

function SetupScreen(props: {
  source: Source; setSource: (s: Source) => void;
  difficulty: Difficulty; applyDifficulty: (d: Difficulty) => void;
  count: number; setCount: (v: number) => void;
  rounds: number; setRounds: (v: number) => void;
  time: number; setTime: (v: number) => void;
  showBalance: boolean; setShowBalance: (v: boolean) => void;
  events: boolean; setEvents: (v: boolean) => void;
  onStart: () => void; onExit: () => void;
}) {
  const { source, setSource, difficulty, applyDifficulty, count, setCount, rounds, setRounds, time, setTime, showBalance, setShowBalance, events, setEvents, onStart, onExit } = props;
  const unitNoun = source === "cards" ? "cards" : "dice";
  return (
    <div className="arena-shell">
      <Topline title="Trading Floor" onExit={onExit} rules={<GameRules game="trade_floor" />} />
      <Panel className="tg-setup">
        <PanelHead kicker="Settings" title="Beat the market maker" right={<Settings2 size={18} className="hint-icon" />} />

        <div className="config-block">
          <span className="config-legend">Instrument</span>
          <div className="seg">
            <button type="button" className={`seg-btn ${source === "cards" ? "active" : ""}`} onClick={() => setSource("cards")}><Spade size={15} /> Cards</button>
            <button type="button" className={`seg-btn ${source === "dice" ? "active" : ""}`} onClick={() => setSource("dice")}><Dice5 size={15} /> Dice</button>
          </div>
        </div>

        <div className="tg-grid">
          <div className="config-block">
            <span className="config-legend">Game difficulty</span>
            <div className="tg-radios">
              {(["easy", "medium", "hard", "custom"] as Difficulty[]).map((d) => (
                <button key={d} type="button" className={`tg-radio ${difficulty === d ? "active" : ""}`} onClick={() => applyDifficulty(d)}>
                  <span className="tg-dot" />{d}
                </button>
              ))}
            </div>
            <label className="tg-toggle">
              <span>Show balance</span>
              <input type="checkbox" checked={showBalance} onChange={(e) => setShowBalance(e.target.checked)} />
              <i />
            </label>
            <label className="tg-toggle">
              <span>Enable market events</span>
              <input type="checkbox" checked={events} onChange={(e) => setEvents(e.target.checked)} />
              <i />
            </label>
          </div>

          <div className="config-block">
            <label className="tg-slider">
              <span>Number of {unitNoun}: {count}</span>
              <input type="range" min={2} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </label>
            <label className="tg-slider">
              <span>Number of rounds: {rounds}</span>
              <input type="range" min={1} max={15} value={rounds} onChange={(e) => setRounds(Number(e.target.value))} />
            </label>
            <label className="tg-slider">
              <span>Time to answer: {time} seconds</span>
              <input type="range" min={5} max={90} step={5} value={time} onChange={(e) => setTime(Number(e.target.value))} />
            </label>
          </div>
        </div>

        <button type="button" className="arena-start" onClick={onStart}>Start game</button>
        <p className="tg-budget">Starting budget: {BUDGET}</p>
      </Panel>
    </div>
  );
}
