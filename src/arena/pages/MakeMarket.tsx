import { useMemo, useState } from "react";
import { ArrowRight, Play, RefreshCcw, RotateCcw } from "lucide-react";
import {
  CounterpartyType,
  TradeAction,
  bestQuotesByObjective,
  computePayoffDistribution,
  computeStats,
  computeUserPnl,
  decideCounterpartyAction,
  drawTrueState,
  enumerateStates,
  findPayoff,
} from "../engine";
import { BankEntry, MARKET_BANK } from "../marketBank";
import { GameRules } from "../components/gameRules";
import { Panel, PanelHead, Pill, Stat, Topline } from "../components/ui";
import { fmt, fmtSigned } from "../format";
import { setupLabel } from "../session";
import { sessionStats } from "../objectives";
import { MarketBrowse } from "./MarketBrowse";

type LengthChoice = "5" | "10" | "20";

/** True when the full question text adds something the short title does not. */
function differs(full: string, title: string): boolean {
  const norm = (s: string) => s.replace(/\.$/, "").trim().toLowerCase();
  return norm(full) !== norm(title);
}

const COUNTERPARTIES: Array<{ id: CounterpartyType; label: string; blurb: string }> = [
  { id: "informed", label: "Informed", blurb: "Knows the true value and only trades when you are wrong." },
  { id: "noisy", label: "Noisy", blurb: "Mostly informed, but sometimes trades at random." },
  { id: "uninformed", label: "Uninformed", blurb: "Trades around the public average, so the edge is yours." },
];

export function MakeMarket({ onExit }: { onExit: () => void }) {
  const [entry, setEntry] = useState<BankEntry | null>(null);
  const [started, setStarted] = useState(false);
  const [counterparty, setCounterparty] = useState<CounterpartyType>("informed");
  const [length, setLength] = useState<LengthChoice>("10");

  function pick(e: BankEntry) {
    setEntry(e);
    setStarted(false);
  }
  function back() {
    setEntry(null);
    setStarted(false);
  }

  if (!entry) {
    return (
      <div className="arena-shell">
        <Topline title="Make a Market" onExit={onExit} rules={<GameRules game="make_market" />} right={<span className="cp-chip">{MARKET_BANK.length} contracts</span>} />
        <MarketBrowse onSelect={pick} />
      </div>
    );
  }

  if (!started) {
    return (
      <SetupPage
        entry={entry}
        counterparty={counterparty}
        setCounterparty={setCounterparty}
        length={length}
        setLength={setLength}
        onStart={() => setStarted(true)}
        onExit={onExit}
        onBack={back}
      />
    );
  }

  return <MarketSession entry={entry} counterparty={counterparty} rounds={Number(length)} onExit={onExit} onBack={back} />;
}

// --- setup page (rules + settings, shown before the game) -------------------

function SetupPage({
  entry, counterparty, setCounterparty, length, setLength, onStart, onExit, onBack,
}: {
  entry: BankEntry;
  counterparty: CounterpartyType;
  setCounterparty: (c: CounterpartyType) => void;
  length: LengthChoice;
  setLength: (l: LengthChoice) => void;
  onStart: () => void;
  onExit: () => void;
  onBack: () => void;
}) {
  const selected = COUNTERPARTIES.find((c) => c.id === counterparty)!;
  return (
    <div className="arena-shell">
      <Topline
        title="Make a Market"
        onExit={onExit}
        rules={<GameRules game="make_market" />}
        right={<button className="ghost-btn compact" onClick={onBack}><RefreshCcw size={14} /> Change question</button>}
      />

      <div className="mm-setup">
        <aside className="mm-setup-config">
          <div className="mm-question">
            <span className="a-kicker">Your question</span>
            <h2>{entry.name}</h2>
            {differs(entry.prompt, entry.name) ? <p>{entry.prompt}</p> : null}
          </div>

          <div className="config-block">
            <span className="config-legend">Counterparty</span>
            <div className="seg seg-wrap">
              {COUNTERPARTIES.map((c) => (
                <button type="button" key={c.id} className={`seg-btn ${counterparty === c.id ? "active" : ""}`} onClick={() => setCounterparty(c.id)}>{c.label}</button>
              ))}
            </div>
            <p className="prompt-sub">{selected.blurb}</p>
          </div>

          <div className="config-block">
            <span className="config-legend">Rounds</span>
            <div className="seg">
              {(["5", "10", "20"] as LengthChoice[]).map((l) => (
                <button type="button" key={l} className={`seg-btn ${length === l ? "active" : ""}`} onClick={() => setLength(l)}>{l}</button>
              ))}
            </div>
          </div>

          <button className="arena-start" onClick={onStart}><Play size={16} /> Start game</button>
        </aside>

        <section className="mm-setup-rules">
          <GameRules game="make_market" />
        </section>
      </div>
    </div>
  );
}

// --- market model + session -------------------------------------------------

type Benchmark = { quote: { bid: number; ask: number }; rationale: string; expectedPnl: number; worstCasePnl: number };
type MarketModel = { name: string; setup: string; description: string; fair: number; std: number; drawTrue: () => number; benchmark: Benchmark };

const ACTION_PILL: Record<TradeAction, { label: string; tone: "good" | "bad" | "warn" }> = {
  buy_from_user: { label: "you sold", tone: "bad" },
  sell_to_user: { label: "you bought", tone: "bad" },
  pass: { label: "no trade", tone: "warn" },
};
const FLOW_LABEL: Record<TradeAction, string> = {
  buy_from_user: "They lifted your ask",
  sell_to_user: "They hit your bid",
  pass: "They passed",
};

type RoundLog = { round: number; quote: { bid: number; ask: number }; action: TradeAction; size: number; truePayoff: number; pnl: number };

function tradeSize(action: TradeAction, quote: { bid: number; ask: number }, truePayoff: number, std: number): number {
  if (action === "pass") return 0;
  const edge = action === "buy_from_user" ? truePayoff - quote.ask : quote.bid - truePayoff;
  const scale = Math.max(1, std * 0.6);
  return Math.max(1, Math.min(5, Math.round(edge / scale)));
}
function unitsLabel(size: number): string {
  return `${size} unit${size > 1 ? "s" : ""}`;
}

function useMarketModel(entry: BankEntry, counterparty: CounterpartyType): MarketModel {
  return useMemo(() => {
    const payoff = findPayoff(entry.payoffId)!;
    const config = entry.config;
    const states = enumerateStates(config);
    const stats = computeStats(computePayoffDistribution(states, payoff));
    const bench = bestQuotesByObjective(states, payoff, counterparty).fair;
    return {
      name: entry.name,
      setup: setupLabel(config),
      description: payoff.description,
      fair: stats.ev,
      std: stats.std,
      drawTrue: () => payoff.evaluate(drawTrueState(states)),
      benchmark: { quote: bench.quote, rationale: bench.rationale, expectedPnl: bench.expectedPnl, worstCasePnl: bench.worstCasePnl },
    };
  }, [entry, counterparty]);
}

function MarketSession({
  entry, counterparty, rounds, onExit, onBack,
}: {
  entry: BankEntry;
  counterparty: CounterpartyType;
  rounds: number;
  onExit: () => void;
  onBack: () => void;
}) {
  const model = useMarketModel(entry, counterparty);

  const [phase, setPhase] = useState<"quote" | "review">("quote");
  const [roundId, setRoundId] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const truePayoff = useMemo(() => model.drawTrue(), [model, roundId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const noiseDraw = useMemo(() => Math.random(), [roundId]);

  const [bid, setBid] = useState("");
  const [ask, setAsk] = useState("");
  const [logs, setLogs] = useState<RoundLog[]>([]);
  const [pending, setPending] = useState<RoundLog | null>(null);

  const roundsPlayed = logs.length;
  const bidNum = Number(bid);
  const askNum = Number(ask);
  const validQuote = bid.trim() !== "" && ask.trim() !== "" && Number.isFinite(bidNum) && Number.isFinite(askNum) && bidNum <= askNum;
  const crossed = bid.trim() !== "" && ask.trim() !== "" && bidNum > askNum;
  const stats = sessionStats(logs.map((l) => l.pnl));

  function submit() {
    if (!validQuote || phase !== "quote" || pending) return;
    const quote = { bid: bidNum, ask: askNum };
    const action = decideCounterpartyAction(quote, { type: counterparty, fairValue: model.fair, truePayoff, noise: counterparty === "noisy" ? 0.18 : undefined, noiseDraw });
    const size = tradeSize(action, quote, truePayoff, model.std);
    const pnl = computeUserPnl(action, quote, truePayoff) * Math.max(1, size);
    const log: RoundLog = { round: roundsPlayed + 1, quote, action, size, truePayoff, pnl };
    setLogs((l) => [...l, log]);
    setPending(log);
    setBid("");
    setAsk("");
  }

  function nextRound() {
    setPending(null);
    if (logs.length >= rounds) setPhase("review");
    else setRoundId((r) => r + 1);
  }

  function again() {
    setLogs([]);
    setPending(null);
    setPhase("quote");
    setRoundId((r) => r + 1);
    setBid("");
    setAsk("");
  }

  if (phase === "review") {
    const verdict = reviewVerdict(stats, model.benchmark);
    return (
      <div className="arena-shell">
        <Topline title="Make a Market" onExit={onExit} rules={<GameRules game="make_market" />} right={<span className="cp-chip muted">vs {counterparty}</span>} />
        <div className="play-grid">
          <Panel className="prompt-panel">
            <PanelHead kicker="Review" title="How your session went" />
            <div className="headline-score">
              <span>Total profit</span>
              <strong className={stats.total >= 0 ? "pos" : "neg"}>{fmtSigned(stats.total)}</strong>
            </div>
            <EquityCurve pnls={logs.map((l) => l.pnl)} />
            <div className="stat-grid">
              <Stat label="Total profit" value={fmtSigned(stats.total)} tone={stats.total >= 0 ? "good" : "bad"} />
              <Stat label="Per round" value={fmtSigned(stats.mean)} />
              <Stat label="Best round" value={fmt(stats.best)} tone="good" />
              <Stat label="Worst round" value={fmt(stats.worst)} tone={stats.worst >= 0 ? "good" : "bad"} />
            </div>
            <div className={`lesson ${verdict.tone}`}>
              <strong>{verdict.title}</strong>
              <p>{verdict.text}</p>
            </div>
            <div className="lab-actions">
              <button className="ghost-btn" onClick={onBack}>Pick another</button>
              <button className="arena-start compact" onClick={again}><RotateCcw size={16} /> Play again</button>
            </div>
          </Panel>

          <Panel>
            <PanelHead kicker="The answer" title="Fair value and a solid quote" right={<Pill tone="accent">{fmt(model.benchmark.quote.bid)} / {fmt(model.benchmark.quote.ask)}</Pill>} />
            <p className="implication">{model.benchmark.rationale}</p>
            <div className="stat-grid two" style={{ marginTop: 12 }}>
              <Stat label="Fair value" value={fmt(model.fair)} tone="accent" />
              <Stat label="Spread (std)" value={fmt(model.std)} tone="warn" />
            </div>
            <div className="history">
              <span className="pnl-rail-title">Round by round</span>
              {logs.map((l) => (
                <div key={l.round} className="history-row">
                  <span>#{l.round}</span>
                  <Pill tone={ACTION_PILL[l.action].tone}>{ACTION_PILL[l.action].label}{l.size > 0 ? ` ${l.size}` : ""}</Pill>
                  <span className="history-quote">{fmt(l.quote.bid)}/{fmt(l.quote.ask)} · settled {fmt(l.truePayoff)}</span>
                  <strong className={l.pnl >= 0 ? "pos" : "neg"}>{fmtSigned(l.pnl)}</strong>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="arena-shell">
      <Topline title="Make a Market" onExit={onExit} rules={<GameRules game="make_market" />} right={<span className="topline-tags"><button className="ghost-btn compact" onClick={onBack}><RefreshCcw size={14} /> Change question</button><span className="cp-chip muted">vs {counterparty}</span></span>} />

      <p className="mm-round">Round <strong>{Math.min(roundsPlayed + 1, rounds)}</strong> of {rounds}</p>

      <div className="mm-play">
        <section className="mm-board">
          <div className="mm-board-q">
            <span className="a-kicker">Quote a two sided market</span>
            <h2>{model.name}</h2>
            <span className="setup-chip">{model.setup}</span>
            {differs(model.description, model.name) ? <p className="prompt-text">{model.description}</p> : null}
          </div>

          {pending ? (
            <div className="mm-quote-bar result">
              <span className="mm-flow-line">
                <Pill tone={pending.action === "pass" ? "warn" : "bad"}>{FLOW_LABEL[pending.action]}</Pill>
                {pending.size > 0 ? <em>{unitsLabel(pending.size)}</em> : null}
              </span>
              <button className="arena-start compact" onClick={nextRound}>{logs.length >= rounds ? "See the review" : "Next round"} <ArrowRight size={15} /></button>
            </div>
          ) : (
            <div className="mm-quote-bar">
              <label className="bidask bid">
                <span>Bid</span>
                <input type="number" inputMode="decimal" value={bid} placeholder="you buy at" onChange={(e) => setBid(e.target.value)} />
              </label>
              <label className="bidask ask">
                <span>Ask</span>
                <input type="number" inputMode="decimal" value={ask} placeholder="you sell at" onChange={(e) => setAsk(e.target.value)} />
              </label>
              <button className="arena-start compact" onClick={submit} disabled={!validQuote}>Submit</button>
              {crossed ? <p className="quote-error mm-error">Your bid cannot be higher than your ask.</p> : null}
            </div>
          )}
        </section>

        <aside className="mm-flow">
          <span className="a-kicker">Order flow</span>
          {logs.length === 0 ? (
            <p className="mm-flow-empty">No trades yet. Quote a market and watch what the interviewer does.</p>
          ) : (
            <div className="mm-flow-list">
              {logs.slice().reverse().map((l) => (
                <div key={l.round} className="mm-flow-row">
                  <span className="mm-flow-n">#{l.round}</span>
                  <span className={l.action === "pass" ? "mm-flow-pass" : "mm-flow-trade"}>{FLOW_LABEL[l.action]}</span>
                  <span className="mm-flow-size">{l.size > 0 ? unitsLabel(l.size) : "flat"}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function EquityCurve({ pnls }: { pnls: number[] }) {
  if (pnls.length < 2) return null;
  const cumulative: number[] = [];
  let run = 0;
  for (const p of pnls) {
    run += p;
    cumulative.push(run);
  }
  const w = 280;
  const h = 70;
  const min = Math.min(0, ...cumulative);
  const max = Math.max(0, ...cumulative);
  const span = Math.max(1, max - min);
  const pts = cumulative.map((v, i) => `${(i / (cumulative.length - 1)) * w},${h - ((v - min) / span) * h}`).join(" ");
  return (
    <svg className="equity" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Cumulative profit">
      <polyline points={pts} />
    </svg>
  );
}

function reviewVerdict(stats: ReturnType<typeof sessionStats>, benchmark: Benchmark): { title: string; text: string; tone: "good" | "warn" } {
  const benchTotal = benchmark.expectedPnl * stats.rounds;
  const good = stats.total >= benchTotal - 1e-9;
  return {
    title: good ? "Edge captured" : "Room to sharpen",
    text: good
      ? `You booked ${fmtSigned(stats.total)} over ${stats.rounds} rounds, at or ahead of the ${fmtSigned(benchTotal)} that a fair benchmark quote expects. Good pricing.`
      : `You booked ${fmtSigned(stats.total)}. A fair quote near ${fmt(benchmark.quote.bid)} to ${fmt(benchmark.quote.ask)} expects about ${fmtSigned(benchTotal)} over these rounds. Centre your market on the fair value and only widen where the informed side can hurt you.`,
    tone: good ? "good" : "warn",
  };
}
