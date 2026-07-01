import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, Play, RefreshCcw } from "lucide-react";
import {
  LedgerEvent,
  LedgerState,
  initLedger,
  markedPnl,
  runLedger,
} from "../engine";
import { Panel, PanelHead, Pill, Stat, Topline } from "../components/ui";
import { GameRules } from "../components/gameRules";
import { fmt, fmtSigned } from "../format";

type Phase = "setup" | "watch" | "gap" | "quiz" | "review";

type Settings = {
  displayMs: number; // 0 means always visible, no flashing
  eventCount: number;
  riskBound: number;
  tolerance: number; // for cash and pnl
};

const DEFAULT_SETTINGS: Settings = { displayMs: 1500, eventCount: 6, riskBound: 5, tolerance: 1 };

type Round = {
  startFv: number;
  riskBound: number;
  events: LedgerEvent[];
  trajectory: LedgerState[];
  truth: LedgerState;
};

type NumKey = "position" | "cash" | "avgEntry" | "pnl" | "fv";
type Answers = Record<NumKey, string> & { withinLimit: "" | "yes" | "no" };

const NUM_QUESTIONS: Array<{ key: NumKey; label: string; truth: (t: LedgerState) => number }> = [
  { key: "position", label: "Net position", truth: (t) => t.position },
  { key: "avgEntry", label: "Average entry price", truth: (t) => t.avgEntry },
  { key: "cash", label: "Cash / premium", truth: (t) => t.cash },
  { key: "pnl", label: "Current PnL", truth: (t) => markedPnl(t) },
  { key: "fv", label: "Fair value", truth: (t) => t.fv },
];

function emptyAnswers(): Answers {
  return { position: "", cash: "", avgEntry: "", pnl: "", fv: "", withinLimit: "" };
}

function randInt(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function pick<T>(xs: T[]): T {
  return xs[randInt(0, xs.length - 1)];
}

function eventLabel(e: LedgerEvent): string {
  if (e.kind === "fv") return `FV moves to ${fmt(e.fv)}`;
  return `${e.side === "buy" ? "Buy" : "Sell"} ${e.qty} @ ${fmt(e.price)}`;
}

function generateRound(settings: Settings): Round {
  const startFv = pick([30, 50, 100]);
  const riskBound = settings.riskBound;
  const events: LedgerEvent[] = [];
  let pos = 0;
  let fv = startFv;
  for (let i = 0; i < settings.eventCount; i++) {
    const doFv = i > 0 && Math.random() < 0.3;
    if (doFv) {
      fv = fv + pick([-4, -3, -2, 2, 3, 4]);
      events.push({ kind: "fv", fv });
      continue;
    }
    // Slight mean reversion toward the bound so breaches happen sometimes, not always.
    let side: "buy" | "sell";
    if (pos >= riskBound) side = Math.random() < 0.75 ? "sell" : "buy";
    else if (pos <= -riskBound) side = Math.random() < 0.75 ? "buy" : "sell";
    else side = Math.random() < 0.5 ? "buy" : "sell";
    const qty = randInt(1, 2);
    const price = fv + randInt(-3, 3);
    pos += side === "buy" ? qty : -qty;
    events.push({ kind: "trade", side, qty, price });
  }
  const trajectory = runLedger(initLedger(startFv, riskBound), events);
  return { startFv, riskBound, events, trajectory, truth: trajectory[trajectory.length - 1] };
}

function numericScore(answer: string, truth: number, tol: number): boolean {
  const n = Number(answer);
  if (answer.trim() === "" || !Number.isFinite(n)) return false;
  return Math.abs(n - truth) <= tol;
}

export function TraderMemoryArena({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<Phase>("setup");
  const [round, setRound] = useState<Round | null>(null);
  const [eventIndex, setEventIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);

  const alwaysVisible = settings.displayMs === 0;

  useEffect(() => {
    if (!round || alwaysVisible) return;
    if (phase === "watch") {
      const t = window.setTimeout(() => {
        if (eventIndex >= round.events.length - 1) setPhase("quiz");
        else setPhase("gap");
      }, settings.displayMs);
      return () => window.clearTimeout(t);
    }
    if (phase === "gap") {
      const t = window.setTimeout(() => {
        setEventIndex((i) => i + 1);
        setPhase("watch");
      }, 450);
      return () => window.clearTimeout(t);
    }
  }, [phase, eventIndex, round, settings.displayMs, alwaysVisible]);

  function start() {
    const next = generateRound(settings);
    setRound(next);
    setEventIndex(0);
    setAnswers(emptyAnswers());
    setPhase("watch");
  }

  function toQuiz() {
    setPhase("quiz");
  }

  function submit() {
    setPhase("review");
  }

  function update<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  const score = useMemo(() => {
    if (!round) return null;
    const t = round.truth;
    let got = 0;
    const total = NUM_QUESTIONS.length + 1;
    const tolFor: Record<NumKey, number> = { position: 0, fv: 0, avgEntry: 0.5, cash: settings.tolerance, pnl: settings.tolerance };
    const detail: Record<string, boolean> = {};
    for (const q of NUM_QUESTIONS) {
      const ok = numericScore(answers[q.key], q.truth(t), tolFor[q.key]);
      detail[q.key] = ok;
      if (ok) got += 1;
    }
    const withinTruth = t.breached ? "no" : "yes";
    const limitOk = answers.withinLimit === withinTruth;
    detail.withinLimit = limitOk;
    if (limitOk) got += 1;
    return { pct: Math.round((got / total) * 100), got, total, detail, withinTruth };
  }, [round, answers, settings.tolerance]);

  return (
    <div className="arena-shell">
      <Topline title="Trader Memory Arena" onExit={onExit} rules={<GameRules game="trader_memory" />} right={<span className="cp-chip">mental ledger drill</span>} />

      {phase === "setup" ? (
        <div className="memory-layout">
          <Panel className="prompt-panel">
            <PanelHead kicker="Real time risk engine" title="Carry the book in your head" right={<BrainCircuit size={18} className="hint-icon" />} />
            <p className="prompt-text">
              Interviewers expect you to track four things live while the game moves: fair value,
              position, cash, and your average entry price, all inside a hard risk limit. Watch the
              events, hold the running ledger, then answer the checkpoint from memory. Crossing the
              inventory limit is an automatic bust.
            </p>
            <div className="memory-state-grid">
              <Stat label="Fair value" value="running mark" />
              <Stat label="Position" value="signed inventory" />
              <Stat label="Cash" value="sell adds, buy spends" />
              <Stat label="Risk bound" value={`plus or minus ${settings.riskBound}`} />
            </div>
          </Panel>

          <Panel>
            <PanelHead kicker="Drill settings" title="Make it feel like the interview" />
            <div className="memory-settings">
              <label>
                <span>Event pace</span>
                <select value={settings.displayMs} onChange={(e) => setSettings((s) => ({ ...s, displayMs: Number(e.target.value) }))}>
                  <option value={0}>always visible</option>
                  {[3000, 2000, 1500, 1000].map((ms) => <option key={ms} value={ms}>{ms / 1000}s flash</option>)}
                </select>
              </label>
              <label>
                <span>Events</span>
                <select value={settings.eventCount} onChange={(e) => setSettings((s) => ({ ...s, eventCount: Number(e.target.value) }))}>
                  {[5, 6, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label>
                <span>Risk bound</span>
                <select value={settings.riskBound} onChange={(e) => setSettings((s) => ({ ...s, riskBound: Number(e.target.value) }))}>
                  {[3, 5, 8].map((n) => <option key={n} value={n}>plus or minus {n}</option>)}
                </select>
              </label>
              <label>
                <span>Cash / PnL tolerance</span>
                <select value={settings.tolerance} onChange={(e) => setSettings((s) => ({ ...s, tolerance: Number(e.target.value) }))}>
                  <option value={0}>exact</option>
                  <option value={1}>+/- 1</option>
                  <option value={2}>+/- 2</option>
                </select>
              </label>
            </div>
            <button className="arena-start" type="button" onClick={start}>
              <Play size={16} /> Start drill
            </button>
          </Panel>
        </div>
      ) : null}

      {(phase === "watch" || phase === "gap") && round ? (
        alwaysVisible ? (
          <Panel className="memory-stage">
            <PanelHead kicker="Watch the tape" title="Hold the running ledger" />
            <p className="prompt-text">Start flat. Fair value opens at {fmt(round.startFv)}. Risk bound is plus or minus {round.riskBound}.</p>
            <div className="ledger-events">
              {round.events.map((e, i) => (
                <div key={i} className={`ledger-event ${e.kind}`}>
                  <span>#{i + 1}</span>
                  <strong>{eventLabel(e)}</strong>
                </div>
              ))}
            </div>
            <button className="arena-start" type="button" onClick={toQuiz}>Go to checkpoint</button>
          </Panel>
        ) : (
          <div className="memory-flash-wrap">
            <div className={`memory-flash-card ${phase === "gap" ? "blank" : ""}`}>
              {phase === "watch" ? (
                <>
                  <span>FV opened at {fmt(round.startFv)} · limit +/- {round.riskBound}</span>
                  <strong>{eventLabel(round.events[eventIndex])}</strong>
                  <em>{eventIndex + 1} / {round.events.length}</em>
                </>
              ) : (
                <strong>Update your ledger</strong>
              )}
            </div>
          </div>
        )
      ) : null}

      {phase === "quiz" && round ? (
        <div className="memory-layout">
          <Panel className="prompt-panel">
            <PanelHead kicker="Checkpoint" title="Answer from your ledger" />
            <div className="memory-quiz-grid">
              {NUM_QUESTIONS.map((q) => (
                <label key={q.key}>
                  <span>{q.label}</span>
                  <input value={answers[q.key]} onChange={(e) => update(q.key, e.target.value)} inputMode="decimal" />
                </label>
              ))}
            </div>
            <button className="arena-start" type="button" onClick={submit}>Submit checkpoint</button>
          </Panel>

          <Panel>
            <PanelHead kicker="Risk check" title="Did you stay inside the limit?" />
            <div className="memory-choice-group">
              <span>Position stayed within plus or minus {round.riskBound}</span>
              <div>
                {(["yes", "no"] as const).map((o) => (
                  <button key={o} type="button" className={answers.withinLimit === o ? "active" : ""} onClick={() => update("withinLimit", o)}>{o}</button>
                ))}
              </div>
            </div>
            <p className="implication" style={{ marginTop: 12 }}>
              Cash adds when you sell and drops when you buy. Current PnL marks your position at the
              latest fair value. Crossing the inventory limit at any point is a bust.
            </p>
          </Panel>
        </div>
      ) : null}

      {phase === "review" && round && score ? (
        <div className="play-grid">
          <Panel className="prompt-panel">
            <PanelHead kicker="Review" title="Your ledger vs the truth" />
            <div className="headline-score">
              <span>Score</span>
              <strong className={score.pct >= 70 ? "pos" : "neg"}>{score.pct}</strong>
            </div>
            {round.truth.breached ? (
              <div className="verdict bad"><strong>Risk bound busted</strong><span>The position moved outside plus or minus {round.riskBound}. In the real game that is an automatic fail.</span></div>
            ) : null}
            <div className="memory-answer-list">
              {NUM_QUESTIONS.map((q) => (
                <div key={q.key} className={score.detail[q.key] ? "ok" : "miss"}>
                  <span>{q.label}</span>
                  <em>you {answers[q.key].trim() === "" ? "." : fmt(Number(answers[q.key]))}</em>
                  <strong>{fmt(q.truth(round.truth))}</strong>
                </div>
              ))}
              <div className={score.detail.withinLimit ? "ok" : "miss"}>
                <span>Within risk limit</span>
                <em>you {answers.withinLimit || "."}</em>
                <strong>{score.withinTruth}</strong>
              </div>
            </div>
            <div className="result-actions">
              <button className="ghost-btn" type="button" onClick={() => setPhase("setup")}>Settings</button>
              <button className="arena-start compact" type="button" onClick={start}><RefreshCcw size={16} /> Run again</button>
            </div>
          </Panel>

          <Panel>
            <PanelHead kicker="Correct trajectory" title="How the ledger moved" />
            <div className="ledger-table">
              <div className="ledger-row head">
                <span>Event</span><span>FV</span><span>Pos</span><span>Cash</span><span>Entry</span><span>PnL</span>
              </div>
              {round.events.map((e, i) => {
                const st = round.trajectory[i];
                const breach = Math.abs(st.position) > round.riskBound;
                return (
                  <div key={i} className={`ledger-row ${breach ? "breach" : ""}`}>
                    <span>{eventLabel(e)}</span>
                    <span>{fmt(st.fv)}</span>
                    <span>{fmtSigned(st.position)}</span>
                    <span>{fmtSigned(st.cash)}</span>
                    <span>{st.position === 0 ? "." : fmt(st.avgEntry)}</span>
                    <span>{fmtSigned(markedPnl(st))}</span>
                  </div>
                );
              })}
            </div>
            {round.truth.breached ? <Pill tone="bad">bust: inventory left the limit</Pill> : <Pill tone="good">stayed within the limit</Pill>}
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
