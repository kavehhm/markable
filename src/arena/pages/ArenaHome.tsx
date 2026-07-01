import { useMemo, useState } from "react";
import {
  ArrowRight,
  Binary,
  BrainCircuit,
  Calculator,
  Dice5,
  Lightbulb,
  LineChart,
  Scale,
  Search,
  Swords,
  Target,
} from "lucide-react";
import { Difficulty, LAB_SCENARIOS, INFERENCE_SCENARIOS, findInferenceScenario } from "../engine";
import { ArenaMode, ArenaSession } from "../ArenaApp";

const MODES: Array<{ id: ArenaMode; title: string; blurb: string; Icon: typeof Target }> = [
  { id: "make_market", title: "Make a Market", blurb: "Pick a contract, quote a two sided market, and trade against a counterparty.", Icon: Scale },
  { id: "fair_value", title: "Fair Value", blurb: "Work through a bank of estimation questions and check your number against the answer.", Icon: Calculator },
  { id: "trade_floor", title: "Trading Floor", blurb: "Beat a random market maker quote on hidden cards or dice. Budget, timer, and events.", Icon: LineChart },
  { id: "inference", title: "Hidden State Inference", blurb: "Quote against an informed desk, narrow the hidden state, then guess it.", Icon: Search },
  { id: "fermi", title: "Fermi Markets", blurb: "Make repeated markets on real world quantities, manage inventory, settle PnL.", Icon: Lightbulb },
  { id: "trader_memory", title: "Trader Memory Arena", blurb: "Track fair value, position, cash, and risk limits live as the interviewer probes.", Icon: BrainCircuit },
  { id: "xyz_tighten", title: "XYZ Tighten Duel", blurb: "Open a market, tighten or trade, and exploit your known theoretical value.", Icon: Swords },
  { id: "five_dice", title: "Five Dice Market", blurb: "Quote the final sum as dice reveal, manage inventory, then settle PnL.", Icon: Dice5 },
  { id: "objective", title: "Objective Lab", blurb: "Build a portfolio for max EV, max Sharpe, or max worst case.", Icon: Binary },
  { id: "confidence_interval", title: "Confidence Interval", blurb: "Give realistic 90% intervals for Fermi-style interview quantities.", Icon: Target },
];

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const USES_DIFFICULTY: ArenaMode[] = ["fermi", "five_dice", "confidence_interval"];

export function ArenaHome({ onStart }: { onStart: (s: ArenaSession) => void }) {
  const [mode, setMode] = useState<ArenaMode>("make_market");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [scenarioId, setScenarioId] = useState<string>(LAB_SCENARIOS[0].id);
  const [inferenceId, setInferenceId] = useState<string>(INFERENCE_SCENARIOS[0].id);
  const [inferRounds, setInferRounds] = useState(3);

  const selectedMode = MODES.find((m) => m.id === mode) ?? MODES[0];
  const SelectedModeIcon = selectedMode.Icon;
  const selectedInference = useMemo(() => findInferenceScenario(inferenceId), [inferenceId]);
  const activeScenario = LAB_SCENARIOS.find((s) => s.id === scenarioId) ?? LAB_SCENARIOS[0];

  const usesDifficulty = USES_DIFFICULTY.includes(mode);

  function start() {
    const session: ArenaSession = { mode, difficulty };
    if (mode === "inference") {
      session.inferenceId = selectedInference.id;
      session.source = selectedInference.source;
      session.payoffId = selectedInference.payoffId;
      session.rounds = inferRounds;
    }
    if (mode === "objective") session.scenarioId = scenarioId;
    onStart(session);
  }

  return (
    <div className="arena-shell">
      <header className="arena-hero">
        <div className="arena-hero-content">
          <span className="arena-eyebrow">Quant Arena</span>
          <h1>Quant Arena</h1>
          <p>
            Probability markets, adverse selection, and risk-aware quoting for quant interview prep.
          </p>
          <div className="arena-hero-metrics" aria-label="Arena highlights">
            <span><strong>{MODES.length}</strong> arenas</span>
            <span><strong>120</strong> question bank</span>
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
          <span id="arena-mode-heading" className="config-legend">Choose an arena</span>
          <div className="mode-grid">
            {MODES.map(({ id, title, blurb, Icon }) => (
              <button
                type="button"
                key={id}
                className={`mode-card ${mode === id ? "active" : ""}`}
                onClick={() => setMode(id)}
                aria-pressed={mode === id}
              >
                <span className="mode-card-icon"><Icon size={18} /></span>
                <strong>{title}</strong>
                <span className="mode-card-blurb">{blurb}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="arena-setup-panel" aria-label="Session setup">
          <div className="ticket-head">
            <span className="ticket-icon"><SelectedModeIcon size={20} /></span>
            <div>
              <span className="config-legend">Session ticket</span>
              <strong>{selectedMode.title}</strong>
            </div>
          </div>

          <p className="prompt-sub">{selectedMode.blurb}</p>

          <div className="ticket-controls">
            {usesDifficulty ? (
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

            {mode === "inference" ? (
              <>
                <div className="config-block">
                  <span className="config-legend">Inference game</span>
                  <div className="contract-grid compact">
                    {INFERENCE_SCENARIOS.map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        className={`contract-card ${s.id === inferenceId ? "active" : ""}`}
                        onClick={() => {
                          setInferenceId(s.id);
                          setInferRounds(s.rounds);
                        }}
                        aria-pressed={s.id === inferenceId}
                      >
                        <strong>{s.title} <span className="diff-tag">{s.difficulty}</span></strong>
                        <span>{s.prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
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
              </>
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
                      <strong>{s.title} <span className="diff-tag">{s.difficulty}</span></strong>
                      <span>{s.prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {mode === "objective" ? <p className="prompt-sub">{activeScenario.prompt}</p> : null}
          </div>

          <button type="button" className="arena-start" onClick={start}>
            Start session <ArrowRight size={18} />
          </button>
        </aside>
      </div>
    </div>
  );
}
