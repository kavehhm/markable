import { useMemo, useState } from "react";
import {
  ArrowRight,
  Binary,
  BrainCircuit,
  Coins,
  Dice5,
  Eye,
  Lightbulb,
  Scale,
  Search,
  Shuffle,
  Spade,
  Target,
} from "lucide-react";
import {
  CounterpartyType,
  Difficulty,
  LAB_SCENARIOS,
  INFERENCE_SCENARIOS,
  SourceKind,
  catalogFor,
  findInferenceScenario,
  findPayoff,
} from "../engine";
import { ArenaMode, ArenaSession, SessionObjective } from "../ArenaApp";
import { SESSION_OBJECTIVES, objectiveMeta } from "../objectives";

type LengthChoice = "5" | "10" | "20" | "endless";

const MODES: Array<{
  id: ArenaMode;
  title: string;
  blurb: string;
  Icon: typeof Target;
}> = [
  {
    id: "make_market",
    title: "Make a Market",
    blurb: "Quote a bid and ask on a hidden payoff. Trade, settle, and review.",
    Icon: Scale,
  },
  {
    id: "fair_value",
    title: "Fair Value Drill",
    blurb: "Estimate the fair value, then reveal the exact distribution.",
    Icon: Target,
  },
  {
    id: "inference",
    title: "Hidden State Inference",
    blurb: "Three quotes against an informed desk. Narrow the hidden cards.",
    Icon: Search,
  },
  {
    id: "objective",
    title: "Objective Lab",
    blurb: "Build a portfolio for max EV, max Sharpe, or max worst case.",
    Icon: Binary,
  },
  {
    id: "fermi",
    title: "Fermi Markets",
    blurb: "Make a market on a real world quantity, then check your estimate.",
    Icon: Lightbulb,
  },
  {
    id: "five_dice",
    title: "Five Dice Market",
    blurb: "Quote the final sum as dice reveal, manage inventory, then settle PnL.",
    Icon: Dice5,
  },
  {
    id: "tanzania",
    title: "Tanzania Population",
    blurb: "Make repeated markets with ask capped at 1.5 times bid.",
    Icon: Lightbulb,
  },
  {
    id: "xyz_tighten",
    title: "XYZ Tighten Duel",
    blurb: "Open a market, trade or tighten, and exploit your 100 fair value.",
    Icon: Scale,
  },
  {
    id: "confidence_interval",
    title: "Confidence Interval",
    blurb: "Give realistic 90% intervals for Fermi-style interview quantities.",
    Icon: Target,
  },
  {
    id: "trader_memory",
    title: "Trader Memory Arena",
    blurb: "Flash events, compress state, then answer position, PnL, flow, and quote direction.",
    Icon: BrainCircuit,
  },
];

const SOURCES: Array<{ id: SourceKind; label: string; Icon: typeof Spade }> = [
  { id: "cards", label: "Cards", Icon: Spade },
  { id: "dice", label: "Dice", Icon: Dice5 },
  { id: "coins", label: "Coins", Icon: Coins },
];

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

const COUNTERPARTIES: Array<{
  id: CounterpartyType;
  label: string;
  blurb: string;
}> = [
  { id: "uninformed", label: "Uninformed", blurb: "Trades off the public fair value. The edge is yours." },
  { id: "informed", label: "Informed", blurb: "Knows the true payoff. Only takes the side that hurts you." },
  { id: "noisy", label: "Noisy", blurb: "Mostly informed, sometimes trades at random." },
];

export function ArenaHome({ onStart }: { onStart: (s: ArenaSession) => void }) {
  const [mode, setMode] = useState<ArenaMode>("make_market");
  const [source, setSource] = useState<SourceKind>("cards");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [counterparty, setCounterparty] = useState<CounterpartyType>("informed");
  const [scenarioId, setScenarioId] = useState<string>(LAB_SCENARIOS[0].id);
  const [objective, setObjective] = useState<SessionObjective>("max_ev");
  const [length, setLength] = useState<LengthChoice>("10");
  const [target, setTarget] = useState("10");
  const [inferRounds, setInferRounds] = useState(3);

  const usesContract = mode === "fair_value" || mode === "make_market";
  const entries = useMemo(
    () => (usesContract ? catalogFor(source, difficulty) : []),
    [usesContract, source, difficulty],
  );
  const [payoffId, setPayoffId] = useState<string>(entries[0]?.payoffId ?? "card_sum");

  const contractList = usesContract
    ? entries.map((e) => e.payoffId)
    : mode === "inference"
      ? INFERENCE_SCENARIOS.map((s) => s.payoffId)
      : [];
  const effectivePayoff = contractList.includes(payoffId)
    ? payoffId
    : contractList[0] ?? "";

  const selectedMode = MODES.find((m) => m.id === mode) ?? MODES[0];
  const SelectedModeIcon = selectedMode.Icon;
  const selectedPayoff = effectivePayoff ? findPayoff(effectivePayoff) : null;
  const selectedInference = findInferenceScenario(effectivePayoff);
  const activeScenario = LAB_SCENARIOS.find((s) => s.id === scenarioId) ?? LAB_SCENARIOS[0];
  const marketLabel = mode === "objective"
    ? activeScenario.title
    : mode === "fermi"
      ? "Order of magnitude"
      : mode === "five_dice"
        ? "Final sum of five dice"
        : mode === "tanzania"
          ? "Population of Tanzania"
          : mode === "xyz_tighten"
            ? "Stock XYZ"
      : mode === "confidence_interval"
        ? "90% interval"
      : mode === "trader_memory"
        ? "Working memory state"
      : mode === "inference"
        ? selectedInference.title
        : selectedPayoff?.name ?? "Hidden state";
  const flowLabel = mode === "make_market"
    ? counterparty
    : mode === "inference"
      ? "vs informed"
      : mode === "objective"
        ? objectiveMeta(objective).label
        : mode === "five_dice"
          ? "interviewer trades"
          : mode === "tanzania"
            ? "informed interviewer"
            : mode === "xyz_tighten"
              ? "tighten or trade"
        : mode === "confidence_interval"
          ? "coverage score"
        : mode === "trader_memory"
          ? "flash checkpoint"
          : "solo drill";
  const lengthLabel = mode === "make_market"
    ? length === "endless"
      ? `target ${target || "10"}`
      : `${length} rounds`
    : mode === "inference"
      ? `${inferRounds} rounds`
      : mode === "objective"
        ? activeScenario.difficulty
        : mode === "five_dice"
          ? "5 reveals"
          : mode === "tanzania"
            ? "5 markets"
            : mode === "xyz_tighten"
              ? "one trade"
          : mode === "confidence_interval"
            ? "one prompt"
          : mode === "trader_memory"
            ? "timed events"
            : difficulty;

  function start() {
    const session: ArenaSession = { mode, difficulty };
    if (usesContract) {
      session.source = source;
      session.payoffId = effectivePayoff;
      if (mode === "make_market") session.counterparty = counterparty;
    }
    if (mode === "inference") {
      session.inferenceId = selectedInference.id;
      session.source = selectedInference.source;
      session.payoffId = selectedInference.payoffId;
      session.rounds = inferRounds;
    }
    if (mode === "objective") session.scenarioId = scenarioId;
    if (mode === "make_market") {
      session.objective = objective;
      if (length === "endless") {
        session.endless = true;
        const t = Number(target);
        session.target = Number.isFinite(t) && t > 0 ? t : 10;
      } else {
        session.rounds = Number(length);
      }
    }
    onStart(session);
  }

  return (
    <div className="arena-shell">
      <header className="arena-hero">
        <div className="arena-hero-content">
          <span className="arena-eyebrow">Quant Arena</span>
          <h1>Quant Arena</h1>
          <p>
            Probability markets, adverse selection, and risk-aware quoting for
            quant interview prep.
          </p>
          <div className="arena-hero-metrics" aria-label="Arena highlights">
            <span><strong>10</strong> market drills</span>
            <span><strong>EV</strong> scoring</span>
            <span><strong>Live</strong> feedback</span>
          </div>
        </div>

        <div className="arena-market-preview" aria-hidden="true">
          <div className="preview-head">
            <span>QA-LIVE</span>
            <strong>Adverse flow</strong>
          </div>
          <div className="preview-book">
            <div className="book-row ask"><span>ASK</span><i style={{ width: "62%" }} /><strong>12.80</strong></div>
            <div className="book-row ask"><span>ASK</span><i style={{ width: "44%" }} /><strong>12.45</strong></div>
            <div className="book-mid"><span>fair</span><strong>12.20</strong><span>+0.18 edge</span></div>
            <div className="book-row bid"><span>BID</span><i style={{ width: "76%" }} /><strong>11.95</strong></div>
            <div className="book-row bid"><span>BID</span><i style={{ width: "52%" }} /><strong>11.60</strong></div>
          </div>
          <div className="preview-tape">
            <span>pass</span>
            <span>lifted ask</span>
            <span>hit bid</span>
          </div>
        </div>
      </header>

      <div className="arena-lobby-grid">
        <section className="config-block mode-section" aria-labelledby="arena-mode-heading">
          <span id="arena-mode-heading" className="config-legend">Choose a mode</span>
          <div className="mode-grid">
            {MODES.map(({ id, title, blurb, Icon }) => (
              <button
                type="button"
                key={id}
                className={`mode-card ${mode === id ? "active" : ""}`}
                onClick={() => setMode(id)}
                aria-pressed={mode === id}
              >
                <span className="mode-card-icon">
                  <Icon size={18} />
                </span>
                <strong>{title}</strong>
                <span className="mode-card-blurb">{blurb}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="arena-setup-panel" aria-label="Session setup">
          <div className="ticket-head">
            <span className="ticket-icon">
              <SelectedModeIcon size={20} />
            </span>
            <div>
              <span className="config-legend">Session ticket</span>
              <strong>{selectedMode.title}</strong>
            </div>
          </div>

          <div className="ticket-rows">
            <div><span>Market</span><strong>{marketLabel}</strong></div>
            <div><span>Flow</span><strong>{flowLabel}</strong></div>
            <div><span>Run</span><strong>{lengthLabel}</strong></div>
          </div>

          <div className="ticket-controls">
            {usesContract ? (
              <div className="config-block">
                <span className="config-legend">Source</span>
                <div className="seg">
                  {SOURCES.map(({ id, label, Icon }) => (
                    <button
                      type="button"
                      key={id}
                      className={`seg-btn ${source === id ? "active" : ""}`}
                      onClick={() => setSource(id)}
                      aria-pressed={source === id}
                    >
                      <Icon size={15} /> {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {mode !== "objective" && mode !== "inference" ? (
              <div className="config-block">
                <span className="config-legend">Difficulty</span>
                <div className="seg">
                  {DIFFICULTIES.map((d) => (
                    <button
                      type="button"
                      key={d}
                      className={`seg-btn ${difficulty === d ? "active" : ""}`}
                      onClick={() => setDifficulty(d)}
                      aria-pressed={difficulty === d}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {contractList.length ? (
              <div className="config-block">
                <span className="config-legend">{mode === "inference" ? "Inference game" : "Contract"}</span>
                <div className="contract-grid compact">
                  {mode === "inference"
                    ? INFERENCE_SCENARIOS.map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          className={`contract-card ${s.payoffId === effectivePayoff ? "active" : ""}`}
                          onClick={() => {
                            setPayoffId(s.payoffId);
                            setInferRounds(s.rounds);
                          }}
                          aria-pressed={s.payoffId === effectivePayoff}
                        >
                          <strong>
                            {s.title} <span className="diff-tag">{s.difficulty}</span>
                          </strong>
                          <span>{s.prompt}</span>
                        </button>
                      ))
                    : contractList.map((id) => {
                        const payoff = findPayoff(id);
                        if (!payoff) return null;
                        return (
                          <button
                            type="button"
                            key={id}
                            className={`contract-card ${id === effectivePayoff ? "active" : ""}`}
                            onClick={() => setPayoffId(id)}
                            aria-pressed={id === effectivePayoff}
                          >
                            <strong>{payoff.name}</strong>
                            <span>{payoff.description}</span>
                          </button>
                        );
                      })}
                </div>
              </div>
            ) : null}

            {mode === "objective" ? (
              <div className="config-block">
                <span className="config-legend">Scenario</span>
                <div className="contract-grid compact">
                  {LAB_SCENARIOS.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      className={`contract-card ${s.id === scenarioId ? "active" : ""}`}
                      onClick={() => setScenarioId(s.id)}
                      aria-pressed={s.id === scenarioId}
                    >
                      <strong>
                        {s.title} <span className="diff-tag">{s.difficulty}</span>
                      </strong>
                      <span>{s.prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {mode === "make_market" ? (
              <div className="config-block">
                <span className="config-legend">Counterparty</span>
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
            ) : null}

            {mode === "make_market" ? (
              <>
                <div className="config-block">
                  <span className="config-legend">What you are playing for</span>
                  <div className="seg seg-wrap">
                    {SESSION_OBJECTIVES.map((o) => (
                      <button
                        type="button"
                        key={o.id}
                        className={`seg-btn ${objective === o.id ? "active" : ""}`}
                        onClick={() => setObjective(o.id)}
                        aria-pressed={objective === o.id}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <p className="prompt-sub">{objectiveMeta(objective).blurb}</p>
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
                      <input
                        type="number"
                        inputMode="decimal"
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                      />
                    </label>
                  ) : null}
                </div>
              </>
            ) : null}

            {mode === "inference" ? (
              <div className="config-block">
                <span className="config-legend">Quote rounds before you guess</span>
                <div className="seg">
                  {[3, 5, 8].map((n) => (
                    <button
                      type="button"
                      key={n}
                      className={`seg-btn ${inferRounds === n ? "active" : ""}`}
                      onClick={() => setInferRounds(n)}
                      aria-pressed={inferRounds === n}
                    >
                      {n} rounds
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <button type="button" className="arena-start" onClick={start}>
            Start session <ArrowRight size={18} />
          </button>
        </aside>
      </div>
    </div>
  );
}
