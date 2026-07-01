import { useMemo, useState } from "react";
import { Binary, Eye, Flag, RefreshCcw, RotateCcw, Shuffle } from "lucide-react";
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
  inventoryDelta,
} from "../engine";
import { BankEntry, MARKET_BANK } from "../marketBank";
import { FvGrade, gradeFv, shuffledOrder } from "../fvSprint";
import { Histogram } from "../components/Histogram";
import { Panel, PanelHead, Pill, Stat, Topline } from "../components/ui";
import { fmt, fmtSigned } from "../format";
import { setupLabel } from "../session";
import { sessionStats } from "../objectives";
import { MarketBrowse } from "./MarketBrowse";

type LengthChoice = "5" | "10" | "20" | "endless";

const COUNTERPARTIES: Array<{ id: CounterpartyType; label: string; blurb: string }> = [
  { id: "informed", label: "Informed", blurb: "Knows the true payoff. Only takes the side that hurts you." },
  { id: "noisy", label: "Noisy", blurb: "Mostly informed, sometimes trades at random." },
  { id: "uninformed", label: "Uninformed", blurb: "Trades off the public fair value. The edge is yours." },
];

export function MakeMarket({ onExit }: { onExit: () => void }) {
  const [entry, setEntry] = useState<BankEntry | null>(null);
  const [counterparty, setCounterparty] = useState<CounterpartyType>("informed");
  const [length, setLength] = useState<LengthChoice>("10");
  const [target, setTarget] = useState("10");

  if (!entry) {
    return (
      <div className="arena-shell">
        <Topline title="Make a Market" onExit={onExit} right={<span className="cp-chip">{MARKET_BANK.length} questions</span>} />
        <MarketBrowse
          onSelect={setEntry}
          controls={
            <div className="config-row">
              <div className="config-block">
                <span className="config-legend">Counterparty (market questions)</span>
                <div className="cp-grid">
                  {COUNTERPARTIES.map(({ id, label, blurb }) => (
                    <button
                      type="button"
                      key={id}
                      className={`cp-card ${counterparty === id ? "active" : ""}`}
                      onClick={() => setCounterparty(id)}
                      aria-pressed={counterparty === id}
                    >
                      <span className="cp-icon">
                        {id === "informed" ? <Eye size={16} /> : id === "noisy" ? <Binary size={16} /> : <Shuffle size={16} />}
                      </span>
                      <strong>{label}</strong>
                      <span>{blurb}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="config-block">
                <span className="config-legend">Session length</span>
                <div className="seg">
                  {(["5", "10", "20", "endless"] as LengthChoice[]).map((l) => (
                    <button
                      type="button"
                      key={l}
                      className={`seg-btn ${length === l ? "active" : ""}`}
                      onClick={() => setLength(l)}
                      aria-pressed={length === l}
                    >
                      {l === "endless" ? "Endless" : `${l} rounds`}
                    </button>
                  ))}
                </div>
                {length === "endless" ? (
                  <label className="inline-input">
                    <span>Play until PnL reaches</span>
                    <input type="number" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
                  </label>
                ) : null}
                <p className="prompt-sub">Estimate questions are graded solo. Counterparty and length apply to market questions.</p>
              </div>
            </div>
          }
        />
      </div>
    );
  }

  if (entry.kind === "estimate") {
    return <EstimatePlay entry={entry} onExit={onExit} onBack={() => setEntry(null)} />;
  }

  return (
    <MarketPlay
      entry={entry}
      counterparty={counterparty}
      length={length}
      target={Number(target) || 10}
      onExit={onExit}
      onBack={() => setEntry(null)}
    />
  );
}

// --- market path ----------------------------------------------------------

const ACTION_COPY: Record<TradeAction, { label: string; tone: "good" | "bad" | "warn" }> = {
  buy_from_user: { label: "They lifted your ask", tone: "bad" },
  sell_to_user: { label: "They hit your bid", tone: "bad" },
  pass: { label: "They passed", tone: "warn" },
};

type RoundLog = {
  round: number;
  quote: { bid: number; ask: number };
  action: TradeAction;
  truePayoff: number;
  pnl: number;
};

type Phase = "quote" | "result" | "summary";

function MarketPlay({
  entry,
  counterparty,
  length,
  target,
  onExit,
  onBack,
}: {
  entry: BankEntry;
  counterparty: CounterpartyType;
  length: LengthChoice;
  target: number;
  onExit: () => void;
  onBack: () => void;
}) {
  const config = entry.config!;
  const payoff = useMemo(() => findPayoff(entry.payoffId!)!, [entry.payoffId]);
  const states = useMemo(() => enumerateStates(config), [config]);
  const dist = useMemo(() => computePayoffDistribution(states, payoff), [states, payoff]);
  const baseStats = useMemo(() => computeStats(dist), [dist]);
  const benchQuote = useMemo(
    () => bestQuotesByObjective(states, payoff, counterparty).fair,
    [states, payoff, counterparty],
  );

  const endless = length === "endless";
  const totalRounds = endless ? Infinity : Number(length);
  const bust = -2 * target;

  const [roundId, setRoundId] = useState(0);
  const trueState = useMemo(
    () => drawTrueState(states),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [states, roundId],
  );
  const noiseDraw = useMemo(
    () => Math.random(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roundId],
  );
  const truePayoff = payoff.evaluate(trueState);

  const [bid, setBid] = useState("");
  const [ask, setAsk] = useState("");
  const [phase, setPhase] = useState<Phase>("quote");
  const [logs, setLogs] = useState<RoundLog[]>([]);
  const [inventory, setInventory] = useState(0);
  const [current, setCurrent] = useState<RoundLog | null>(null);
  const [fvGuess, setFvGuess] = useState("");
  const [fvRevealed, setFvRevealed] = useState(false);

  const roundPnls = logs.map((l) => l.pnl);
  const total = roundPnls.reduce((a, b) => a + b, 0);
  const roundsPlayed = logs.length;

  const bidNum = Number(bid);
  const askNum = Number(ask);
  const validQuote =
    bid.trim() !== "" && ask.trim() !== "" &&
    Number.isFinite(bidNum) && Number.isFinite(askNum) && bidNum <= askNum;
  const crossed = bid.trim() !== "" && ask.trim() !== "" && bidNum > askNum;

  const sessionOver = endless ? total >= target || total <= bust : roundsPlayed >= totalRounds;
  const stats = sessionStats(roundPnls);

  function submit() {
    if (!validQuote) return;
    const quote = { bid: bidNum, ask: askNum };
    const action = decideCounterpartyAction(quote, {
      type: counterparty,
      fairValue: baseStats.ev,
      truePayoff,
      noise: counterparty === "noisy" ? 0.18 : undefined,
      noiseDraw,
    });
    const pnl = computeUserPnl(action, quote, truePayoff);
    const log: RoundLog = { round: roundsPlayed + 1, quote, action, truePayoff, pnl };
    setLogs((l) => [...l, log]);
    setCurrent(log);
    setInventory((inv) => inv + inventoryDelta(action));
    setBid("");
    setAsk("");
    setPhase("result");
  }

  function next() {
    setRoundId((r) => r + 1);
    setFvGuess("");
    setFvRevealed(false);
    setPhase("quote");
  }

  function reset() {
    setLogs([]);
    setInventory(0);
    setCurrent(null);
    setRoundId((r) => r + 1);
    setFvGuess("");
    setFvRevealed(false);
    setPhase("quote");
  }

  const fvGuessNum = Number(fvGuess);
  const fvError = fvGuess.trim() !== "" && Number.isFinite(fvGuessNum) ? Math.abs(fvGuessNum - baseStats.ev) : null;

  return (
    <div className="arena-shell">
      <Topline
        title="Make a Market"
        onExit={onExit}
        right={
          <span className="topline-tags">
            <button className="ghost-btn compact" onClick={onBack}><RefreshCcw size={14} /> Change question</button>
            <span className="cp-chip muted">vs {counterparty}</span>
          </span>
        }
      />

      <div className="session-bar">
        <Stat
          label="Round"
          value={endless ? `${roundsPlayed}` : `${Math.min(roundsPlayed + (phase === "quote" ? 1 : 0), totalRounds)} / ${totalRounds}`}
        />
        <Stat label="Total PnL" value={fmtSigned(total)} tone={total >= 0 ? "good" : "bad"} hint={endless ? `target ${fmt(target)}` : undefined} />
        <Stat label="Worst round" value={roundsPlayed ? fmt(stats.worst) : "."} tone={stats.worst >= 0 ? "good" : "bad"} />
        <Stat label="Inventory" value={String(inventory)} tone={Math.abs(inventory) >= 3 ? "warn" : "neutral"} hint={inventory > 0 ? "long" : inventory < 0 ? "short" : "flat"} />
      </div>

      <div className="play-grid">
        <Panel className="prompt-panel">
          <PanelHead kicker="Quote a two sided market" title={payoff.name} />
          <span className="setup-chip">{setupLabel(config)}</span>
          <p className="prompt-text">{payoff.description}</p>
          <p className="prompt-sub">
            A fresh hidden {config.source === "cards" ? "hand" : config.source === "dice" ? "roll" : "sequence"} is
            drawn each round. Your {counterparty} counterparty trades only when your price helps them.
          </p>

          {phase !== "summary" ? (
            <>
              <div className="quote-form">
                <label className="bidask bid">
                  <span>Bid</span>
                  <input type="number" inputMode="decimal" value={bid} placeholder="you buy at" onChange={(e) => setBid(e.target.value)} disabled={phase === "result"} />
                </label>
                <div className="bidask-spread">
                  <span>width</span>
                  <strong>{validQuote ? fmt(askNum - bidNum) : "."}</strong>
                </div>
                <label className="bidask ask">
                  <span>Ask</span>
                  <input type="number" inputMode="decimal" value={ask} placeholder="you sell at" onChange={(e) => setAsk(e.target.value)} disabled={phase === "result"} />
                </label>
              </div>
              {crossed ? <p className="quote-error">Bid must be at or below ask.</p> : null}

              {phase === "quote" ? (
                <button className="arena-start" onClick={submit} disabled={!validQuote}>Submit quote</button>
              ) : null}

              {phase === "result" && current ? (
                <ResultBlock
                  log={current}
                  counterparty={counterparty}
                  fairValue={baseStats.ev}
                  sessionOver={sessionOver}
                  onNext={next}
                  onFinish={() => setPhase("summary")}
                />
              ) : null}
            </>
          ) : (
            <SummaryBlock stats={stats} benchQuote={benchQuote} endless={endless} total={total} target={target} pnls={roundPnls} onAgain={reset} onExit={onBack} />
          )}
        </Panel>

        <Panel>
          <PanelHead
            kicker="Coaching for this contract"
            title="Fair value benchmark"
            right={<Pill tone="accent">{fmt(benchQuote.quote.bid)} / {fmt(benchQuote.quote.ask)}</Pill>}
          />
          <p className="implication">{benchQuote.rationale}</p>
          <div className="stat-grid two" style={{ marginTop: 12 }}>
            <Stat label="Fair value" value={fmt(baseStats.ev)} tone="accent" />
            <Stat label="Spread (std)" value={fmt(baseStats.std)} tone="warn" />
          </div>

          <div className="fv-practice">
            <span className="config-legend">Practice: estimate the fair value first</span>
            <div className="fv-practice-row">
              <input type="number" inputMode="decimal" value={fvGuess} placeholder="your estimate" onChange={(e) => setFvGuess(e.target.value)} disabled={fvRevealed} />
              <button className="ghost-btn compact" onClick={() => setFvRevealed(true)} disabled={fvGuess.trim() === "" || fvRevealed}>Reveal</button>
            </div>
            {fvRevealed ? (
              <>
                <p className="implication small">
                  You said {fmt(fvGuessNum)}. Fair value is {fmt(baseStats.ev)}{fvError !== null ? `, off by ${fmt(fvError)}` : ""}.
                </p>
                <Histogram
                  dist={dist}
                  markers={[
                    { value: baseStats.ev, label: `fair ${fmt(baseStats.ev)}`, tone: "fair" },
                    ...(fvError !== null ? [{ value: fvGuessNum, label: "you", tone: "true" as const }] : []),
                  ]}
                />
              </>
            ) : null}
          </div>

          {logs.length ? (
            <div className="history">
              <span className="pnl-rail-title">Round history</span>
              {logs.slice().reverse().map((l) => (
                <div key={l.round} className="history-row">
                  <span>#{l.round}</span>
                  <Pill tone={ACTION_COPY[l.action].tone}>
                    {l.action === "buy_from_user" ? "sold" : l.action === "sell_to_user" ? "bought" : "pass"}
                  </Pill>
                  <span className="history-quote">{fmt(l.quote.bid)}/{fmt(l.quote.ask)}</span>
                  <strong className={l.pnl >= 0 ? "pos" : "neg"}>{fmtSigned(l.pnl)}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}

function ResultBlock({
  log, counterparty, fairValue, sessionOver, onNext, onFinish,
}: {
  log: RoundLog;
  counterparty: string;
  fairValue: number;
  sessionOver: boolean;
  onNext: () => void;
  onFinish: () => void;
}) {
  const informed = counterparty !== "uninformed";
  const action = ACTION_COPY[log.action];
  return (
    <div className="result-block">
      <div className="reveal-outcome">
        <div className="result-payoff-line">
          <Pill tone={action.tone}>{action.label}</Pill>
          <span className="result-pnl">round <strong className={log.pnl >= 0 ? "pos" : "neg"}>{fmtSigned(log.pnl)}</strong></span>
        </div>
        <div className="reveal-payoff">
          <span>True payoff</span>
          <strong>{fmt(log.truePayoff)}</strong>
        </div>
      </div>
      <p className="implication small">{lessonFor(log, fairValue, informed)}</p>
      {sessionOver ? (
        <button className="arena-start" onClick={onFinish}><Flag size={16} /> See results</button>
      ) : (
        <div className="result-actions">
          <button className="arena-start compact" onClick={onNext}><RefreshCcw size={16} /> Next round</button>
          <button className="ghost-btn" onClick={onFinish}><Flag size={16} /> End now</button>
        </div>
      )}
    </div>
  );
}

function SummaryBlock({
  stats, benchQuote, endless, total, target, pnls, onAgain, onExit,
}: {
  stats: ReturnType<typeof sessionStats>;
  benchQuote: ReturnType<typeof bestQuotesByObjective>["fair"];
  endless: boolean;
  total: number;
  target: number;
  pnls: number[];
  onAgain: () => void;
  onExit: () => void;
}) {
  const benchTotal = benchQuote.expectedPnl * stats.rounds;
  const good = stats.total >= benchTotal - 1e-9;
  return (
    <div className="summary-block">
      {endless ? (
        <div className={`verdict ${total >= target ? "good" : "bad"}`}>
          <strong>{total >= target ? "Target reached" : "Busted out"}</strong>
          <span>You {total >= target ? "hit" : "missed"} the {fmt(target)} target over {stats.rounds} rounds.</span>
        </div>
      ) : null}

      <div className="headline-score">
        <span>Total PnL</span>
        <strong className={stats.total >= 0 ? "pos" : "neg"}>{fmtSigned(stats.total)}</strong>
      </div>

      <EquityCurve pnls={pnls} />

      <div className="stat-grid">
        <Stat label="Total PnL" value={fmtSigned(stats.total)} tone={stats.total >= 0 ? "good" : "bad"} />
        <Stat label="Per round" value={fmtSigned(stats.mean)} />
        <Stat label="Std dev" value={fmt(stats.std)} />
        <Stat label="Worst round" value={fmt(stats.worst)} tone={stats.worst >= 0 ? "good" : "bad"} />
        <Stat label="Best round" value={fmt(stats.best)} tone="good" />
        <Stat label="Rounds" value={String(stats.rounds)} />
      </div>

      <div className={`lesson ${good ? "good" : "warn"}`}>
        <strong>{good ? "Edge captured" : "Left money on the table"}</strong>
        <p>
          {good
            ? `You booked ${fmtSigned(stats.total)} over ${stats.rounds} rounds, ahead of the ${fmtSigned(benchTotal)} the fair benchmark quote expects.`
            : `You booked ${fmtSigned(stats.total)}. The fair quote ${fmt(benchQuote.quote.bid)} to ${fmt(benchQuote.quote.ask)} expects about ${fmtSigned(benchTotal)} here. Tighten toward fair where the counterparty cannot punish you.`}
        </p>
      </div>

      <div className="lab-actions">
        <button className="ghost-btn" onClick={onExit}>Pick another</button>
        <button className="arena-start compact" onClick={onAgain}><RotateCcw size={16} /> Play again</button>
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
    <svg className="equity" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Cumulative PnL">
      <polyline points={pts} />
    </svg>
  );
}

function lessonFor(log: RoundLog, fairValue: number, informed: boolean): string {
  const { action, quote, truePayoff, pnl } = log;
  if (action === "pass") {
    return informed
      ? `No trade. Your market ${fmt(quote.bid)} to ${fmt(quote.ask)} contained the true payoff ${fmt(truePayoff)}, so the informed desk had no edge.`
      : `No trade. Fair value ${fmt(fairValue)} sat inside your market. Tighten to capture spread.`;
  }
  if (action === "buy_from_user") {
    return informed
      ? `They lifted your ask at ${fmt(quote.ask)}; the true payoff was ${fmt(truePayoff)}. You sold too cheap. Lift the ask or widen.`
      : `Flow bought your ask at ${fmt(quote.ask)}. You booked ${fmtSigned(pnl)} versus the settled ${fmt(truePayoff)}.`;
  }
  return informed
    ? `They hit your bid at ${fmt(quote.bid)}; the true payoff was only ${fmt(truePayoff)}. You bought too rich. Lower the bid or widen.`
    : `Flow sold into your bid at ${fmt(quote.bid)}. You booked ${fmtSigned(pnl)} versus the settled ${fmt(truePayoff)}.`;
}

// --- estimate path (rapid fire fair value) --------------------------------

const ESTIMATE_POOL = MARKET_BANK.filter((e) => e.kind === "estimate");
const GRADE_COPY: Record<FvGrade, { title: string; tone: "good" | "warn" | "bad" }> = {
  good: { title: "Sharp estimate", tone: "good" },
  warn: { title: "Close, tighten it up", tone: "warn" },
  bad: { title: "Re derive from counts", tone: "bad" },
};

function EstimatePlay({ entry, onExit, onBack }: { entry: BankEntry; onExit: () => void; onBack: () => void }) {
  // A shuffled queue over the estimate bank, seeded at the picked question.
  const order = useMemo(() => {
    const start = ESTIMATE_POOL.findIndex((e) => e.id === entry.id);
    const shuffled = shuffledOrder(ESTIMATE_POOL.length).map((i) => ESTIMATE_POOL[i]);
    if (start >= 0) {
      const without = shuffled.filter((e) => e.id !== entry.id);
      return [entry, ...without];
    }
    return shuffled;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id]);

  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [counts, setCounts] = useState({ good: 0, warn: 0, bad: 0, total: 0 });

  const q = order[index % order.length];
  const guessNum = Number(guess);
  const hasGuess = guess.trim() !== "" && Number.isFinite(guessNum);
  const grade = revealed && hasGuess ? gradeFv(guessNum, q.fv!) : null;
  const error = hasGuess ? Math.abs(guessNum - q.fv!) : null;

  function reveal() {
    if (!hasGuess || revealed) return;
    const g = gradeFv(guessNum, q.fv!);
    setCounts((c) => ({ good: c.good + (g === "good" ? 1 : 0), warn: c.warn + (g === "warn" ? 1 : 0), bad: c.bad + (g === "bad" ? 1 : 0), total: c.total + 1 }));
    setRevealed(true);
  }

  function next() {
    setIndex((i) => i + 1);
    setGuess("");
    setRevealed(false);
  }

  return (
    <div className="arena-shell">
      <Topline
        title="Make a Market"
        onExit={onExit}
        right={
          <span className="topline-tags">
            <button className="ghost-btn compact" onClick={onBack}><RefreshCcw size={14} /> Change question</button>
            <span className="cp-chip muted">fair value drill</span>
          </span>
        }
      />

      <div className="session-bar">
        <Stat label="Answered" value={String(counts.total)} />
        <Stat label="Sharp" value={String(counts.good)} tone="good" />
        <Stat label="Close" value={String(counts.warn)} tone="warn" />
        <Stat label="Missed" value={String(counts.bad)} tone="bad" />
      </div>

      <div className="play-grid">
        <Panel className="prompt-panel">
          <PanelHead kicker="Estimate the fair value" title={q.name} />
          <span className="setup-chip">{q.category} · {q.difficulty}</span>
          <p className="prompt-text">{q.prompt}</p>

          <label className="big-input">
            <span>Your fair value</span>
            <input type="number" inputMode="decimal" value={guess} placeholder="a number" onChange={(e) => setGuess(e.target.value)} disabled={revealed} />
          </label>

          {!revealed ? (
            <button className="arena-start" onClick={reveal} disabled={!hasGuess}>Reveal fair value</button>
          ) : (
            <button className="ghost-btn wide" onClick={next}><RefreshCcw size={16} /> Next question</button>
          )}

          {revealed && grade ? (
            <div className={`verdict ${GRADE_COPY[grade].tone}`}>
              <strong>You said {fmt(guessNum)}. Fair value is {fmt(q.fv!)}.</strong>
              <span>{GRADE_COPY[grade].title}. Off by {fmt(error ?? 0)}.</span>
            </div>
          ) : null}
        </Panel>

        <Panel>
          <PanelHead kicker="Why a fast estimate" title="Build the first number" />
          <p className="mental-model">
            The drill rewards a quick, defensible fair value. Decompose the prompt into a count or a
            per item average, multiply, and commit. A guess within about 10 percent scores as sharp.
          </p>
          {counts.total ? (
            <div className="stat-grid two" style={{ marginTop: 12 }}>
              <Stat label="Hit rate" value={`${Math.round((counts.good / counts.total) * 100)}%`} tone="accent" />
              <Stat label="Within close band" value={`${Math.round(((counts.good + counts.warn) / counts.total) * 100)}%`} />
            </div>
          ) : (
            <div className="locked-hint" style={{ marginTop: 12 }}>Commit a number to reveal the fair value. Your running accuracy builds here.</div>
          )}
        </Panel>
      </div>
    </div>
  );
}
