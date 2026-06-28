import {
  Activity,
  ArrowDownToLine,
  ArrowUpToLine,
  BookOpenCheck,
  Brain,
  Calculator,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  Crosshair,
  Gauge,
  Layers,
  LineChart,
  NotebookTabs,
  Percent,
  Play,
  RefreshCcw,
  RotateCcw,
  ScrollText,
  Sigma,
  SlidersHorizontal,
  Target,
  TimerReset,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { conceptCards, interviewCases, makeMentalMathProblem, makeProbabilityProblem, makeQuoteScenario } from "./data";
import {
  advanceSimulation,
  bookImbalance,
  createBook,
  formatPrice,
  formatSigned,
  initialSimState,
  microprice,
  scoreQuote,
} from "./marketMath";
import { DrillChoice, DrillResult, InterviewCase, PrepProblem, Progress, QuoteChoice, QuoteScenario, SimState, SimulatorAction } from "./types";

const defaultProgress: Progress = {
  quoteAttempts: 0,
  quoteCorrect: 0,
  probabilityAttempts: 0,
  probabilityCorrect: 0,
  mathAttempts: 0,
  mathCorrect: 0,
  caseAttempts: 0,
  caseCorrect: 0,
  bestStreak: 0,
  currentStreak: 0,
  simRuns: 0,
};

const progressKey = "markable-progress-v1";

type PrepTabId = "quote" | "book" | "inventory" | "probability" | "math" | "concepts" | "cases";
type ProgressKind = "quote" | "probability" | "math" | "case";

const prepTabs: Array<{ id: PrepTabId; label: string; detail: string; Icon: LucideIcon }> = [
  { id: "quote", label: "Quote Speed", detail: "Pick bid/ask markets under time pressure.", Icon: Crosshair },
  { id: "book", label: "Order Book", detail: "Read depth, microprice, and imbalance.", Icon: Layers },
  { id: "inventory", label: "Inventory", detail: "Practice skew, width, and PnL control.", Icon: SlidersHorizontal },
  { id: "probability", label: "Probability", detail: "Convert signals and fill risk into fair value.", Icon: Percent },
  { id: "math", label: "Mental Math", detail: "Drill bps, sizing, and spread arithmetic.", Icon: Calculator },
  { id: "concepts", label: "Concepts", detail: "Review microstructure flashcards.", Icon: NotebookTabs },
  { id: "cases", label: "Cases", detail: "Work through interview-style decisions.", Icon: ClipboardList },
];

function readProgress(): Progress {
  try {
    const saved = window.localStorage.getItem(progressKey);
    return saved ? { ...defaultProgress, ...JSON.parse(saved) } : defaultProgress;
  } catch {
    return defaultProgress;
  }
}

function saveProgress(progress: Progress) {
  window.localStorage.setItem(progressKey, JSON.stringify(progress));
}

function totalAttempts(progress: Progress) {
  return progress.quoteAttempts + progress.probabilityAttempts + progress.mathAttempts + progress.caseAttempts;
}

function totalCorrect(progress: Progress) {
  return progress.quoteCorrect + progress.probabilityCorrect + progress.mathCorrect + progress.caseCorrect;
}

function progressAccuracy(correct: number, attempts: number) {
  return attempts ? Math.round((correct / attempts) * 100) : 0;
}

function applyPrepResult(progress: Progress, kind: ProgressKind, correct: boolean): Progress {
  const currentStreak = correct ? progress.currentStreak + 1 : 0;
  const next = {
    ...progress,
    currentStreak,
    bestStreak: Math.max(progress.bestStreak, currentStreak),
  };

  if (kind === "quote") {
    return {
      ...next,
      quoteAttempts: next.quoteAttempts + 1,
      quoteCorrect: next.quoteCorrect + (correct ? 1 : 0),
    };
  }

  if (kind === "probability") {
    return {
      ...next,
      probabilityAttempts: next.probabilityAttempts + 1,
      probabilityCorrect: next.probabilityCorrect + (correct ? 1 : 0),
    };
  }

  if (kind === "math") {
    return {
      ...next,
      mathAttempts: next.mathAttempts + 1,
      mathCorrect: next.mathCorrect + (correct ? 1 : 0),
    };
  }

  return {
    ...next,
    caseAttempts: next.caseAttempts + 1,
    caseCorrect: next.caseCorrect + (correct ? 1 : 0),
  };
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function useElapsed(activeKey: number, running: boolean) {
  const startedAt = useRef(performance.now());
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    startedAt.current = performance.now();
    setElapsedMs(0);
    if (!running) return undefined;

    const id = window.setInterval(() => {
      setElapsedMs(performance.now() - startedAt.current);
    }, 80);

    return () => window.clearInterval(id);
  }, [activeKey, running]);

  return elapsedMs;
}

function Header({ progress }: { progress: Progress }) {
  const attempts = totalAttempts(progress);
  const accuracy = progressAccuracy(totalCorrect(progress), attempts);

  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="brand-mark">
          <LineChart size={20} />
        </div>
        <div>
          <h1>Markable</h1>
          <p>Market-making practice cockpit</p>
        </div>
      </div>
      <div className="topbar-stats" aria-label="Training progress">
        <div>
          <span>Overall</span>
          <strong>{accuracy}%</strong>
        </div>
        <div>
          <span>Reps</span>
          <strong>{attempts}</strong>
        </div>
        <div>
          <span>Streak</span>
          <strong>{progress.currentStreak}</strong>
        </div>
      </div>
    </header>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad" | "warn";
}) {
  return (
    <div className={cn("stat-tile", `tone-${tone}`)}>
      <div className="stat-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ScenarioBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="scenario-badge">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function QuoteButton({
  choice,
  selected,
  correct,
  disabled,
  onSelect,
}: {
  choice: QuoteChoice;
  selected: boolean;
  correct: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={cn("quote-choice", selected && "selected", disabled && correct && "correct", disabled && selected && !correct && "wrong")}
      onClick={onSelect}
      disabled={disabled}
      title={choice.rationale}
    >
      <span className="choice-title">
        {disabled && correct ? <Check size={16} /> : disabled && selected ? <X size={16} /> : <Crosshair size={16} />}
        {choice.label}
      </span>
      <span className="quote-prices">
        <b>{formatPrice(choice.bid)}</b>
        <ChevronRight size={15} />
        <b>{formatPrice(choice.ask)}</b>
      </span>
      <small>{choice.rationale}</small>
    </button>
  );
}

function QuoteDrill({
  scenario,
  onResult,
  onNext,
}: {
  scenario: QuoteScenario;
  onResult: (result: DrillResult) => void;
  onNext: () => void;
}) {
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const elapsedMs = useElapsed(scenario.id, selectedChoiceId === null);
  const selectedChoice = scenario.choices.find((choice) => choice.id === selectedChoiceId);
  const correct = selectedChoiceId === scenario.correctChoiceId;
  const resultScore = selectedChoiceId ? scoreQuote(correct, elapsedMs) : 0;

  useEffect(() => {
    setSelectedChoiceId(null);
  }, [scenario.id]);

  function selectChoice(choiceId: string) {
    if (selectedChoiceId) return;
    setSelectedChoiceId(choiceId);
    onResult({
      scenarioId: scenario.id,
      correct: choiceId === scenario.correctChoiceId,
      elapsedMs,
      selectedChoiceId: choiceId,
    });
  }

  return (
    <section className="training-panel quote-drill" aria-labelledby="quote-drill-heading">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Speed drill</span>
          <h2 id="quote-drill-heading">Choose the quote</h2>
        </div>
        <div className="timer-pill" title="Elapsed time">
          <Clock3 size={16} />
          {(elapsedMs / 1000).toFixed(1)}s
        </div>
      </div>

      <div className="scenario-grid">
        <ScenarioBadge label="Fair" value={formatPrice(scenario.fair)} />
        <ScenarioBadge label="Inventory" value={`${scenario.inventory}/${scenario.positionLimit}`} />
        <ScenarioBadge label="Vol" value={scenario.volatility} />
        <ScenarioBadge label="Flow" value={scenario.flow} />
      </div>

      <div className="news-strip">
        <Activity size={16} />
        <span>{scenario.news}</span>
      </div>

      <div className="imbalance-meter" aria-label="Displayed order book imbalance">
        <span>Bid depth</span>
        <div>
          <i style={{ width: `${scenario.bookImbalance * 100}%` }} />
        </div>
        <span>Ask depth</span>
      </div>

      <div className="choice-grid">
        {scenario.choices.map((choice) => (
          <QuoteButton
            key={choice.id}
            choice={choice}
            selected={choice.id === selectedChoiceId}
            correct={choice.id === scenario.correctChoiceId}
            disabled={selectedChoiceId !== null}
            onSelect={() => selectChoice(choice.id)}
          />
        ))}
      </div>

      <div className={cn("feedback-bar", selectedChoiceId && (correct ? "good" : "bad"))}>
        {selectedChoiceId ? (
          <>
            <strong>{correct ? "Good quote" : "Missed edge"}</strong>
            <span>
              {selectedChoice?.rationale} Score {resultScore}.
            </span>
            <button className="icon-button label-button" onClick={onNext} title="Next scenario">
              <Play size={16} />
              Next
            </button>
          </>
        ) : (
          <>
            <strong>Read fair, flow, inventory.</strong>
            <span>Pick the quote you would show if you had one second to answer.</span>
          </>
        )}
      </div>
    </section>
  );
}

function TabNav({ activeTab, onChange }: { activeTab: PrepTabId; onChange: (tab: PrepTabId) => void }) {
  return (
    <nav className="prep-tabs" role="tablist" aria-label="Prep type">
      {prepTabs.map(({ id, label, detail, Icon }) => (
        <button
          key={id}
          className={cn("prep-tab", activeTab === id && "active")}
          role="tab"
          aria-selected={activeTab === id}
          onClick={() => onChange(id)}
          title={detail}
        >
          <Icon size={17} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function AnswerChoiceButton({
  choice,
  selected,
  correct,
  disabled,
  onSelect,
}: {
  choice: DrillChoice;
  selected: boolean;
  correct: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={cn("answer-choice", selected && "selected", disabled && correct && "correct", disabled && selected && !correct && "wrong")}
      onClick={onSelect}
      disabled={disabled}
      title={choice.detail ?? choice.label}
    >
      <span>
        {disabled && correct ? <Check size={16} /> : disabled && selected ? <X size={16} /> : <Target size={16} />}
        <b>{choice.label}</b>
      </span>
      {choice.detail ? <small>{choice.detail}</small> : null}
    </button>
  );
}

function GeneratedDrill({
  problem,
  heading,
  kicker,
  icon,
  onAnswer,
  onNext,
}: {
  problem: PrepProblem;
  heading: string;
  kicker: string;
  icon: ReactNode;
  onAnswer: (correct: boolean, elapsedMs: number) => void;
  onNext: () => void;
}) {
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const elapsedMs = useElapsed(problem.id, selectedChoiceId === null);
  const correct = selectedChoiceId === problem.correctChoiceId;

  useEffect(() => {
    setSelectedChoiceId(null);
  }, [problem.id]);

  function selectChoice(choiceId: string) {
    if (selectedChoiceId) return;
    setSelectedChoiceId(choiceId);
    onAnswer(choiceId === problem.correctChoiceId, elapsedMs);
  }

  return (
    <section className="training-panel generated-panel" aria-labelledby={`${heading.replace(/\s+/g, "-").toLowerCase()}-heading`}>
      <div className="panel-heading">
        <div>
          <span className="section-kicker">{kicker}</span>
          <h2 id={`${heading.replace(/\s+/g, "-").toLowerCase()}-heading`}>{heading}</h2>
        </div>
        <div className="timer-pill" title="Elapsed time">
          {icon}
          {(elapsedMs / 1000).toFixed(1)}s
        </div>
      </div>

      <div className="problem-card">
        <span>{problem.tag}</span>
        <h3>{problem.title}</h3>
        <p>{problem.prompt}</p>
        <div className="given-grid">
          {problem.givens.map((given) => (
            <strong key={given}>{given}</strong>
          ))}
        </div>
      </div>

      <div className="answer-grid">
        {problem.choices.map((choice) => (
          <AnswerChoiceButton
            key={choice.id}
            choice={choice}
            selected={choice.id === selectedChoiceId}
            correct={choice.id === problem.correctChoiceId}
            disabled={selectedChoiceId !== null}
            onSelect={() => selectChoice(choice.id)}
          />
        ))}
      </div>

      <div className={cn("feedback-bar", selectedChoiceId && (correct ? "good" : "bad"))}>
        {selectedChoiceId ? (
          <>
            <strong>{correct ? "Clean read" : "Reprice the reasoning"}</strong>
            <span>{problem.explanation}</span>
            <button className="icon-button label-button" onClick={onNext} title="Next problem">
              <Play size={16} />
              Next
            </button>
          </>
        ) : (
          <>
            <strong>Solve before the timer wins.</strong>
            <span>Pick the best answer, then compare your mental model to the explanation.</span>
          </>
        )}
      </div>
    </section>
  );
}

function ProbabilityDrill({ onAnswer }: { onAnswer: (correct: boolean, elapsedMs: number) => void }) {
  const [index, setIndex] = useState(1);
  const problem = useMemo(() => makeProbabilityProblem(index), [index]);

  return (
    <GeneratedDrill
      problem={problem}
      heading="Probability reps"
      kicker="Signals and EV"
      icon={<Percent size={16} />}
      onAnswer={onAnswer}
      onNext={() => setIndex((current) => current + 1)}
    />
  );
}

function MentalMathDrill({ onAnswer }: { onAnswer: (correct: boolean, elapsedMs: number) => void }) {
  const [index, setIndex] = useState(1);
  const problem = useMemo(() => makeMentalMathProblem(index), [index]);

  return (
    <GeneratedDrill
      problem={problem}
      heading="Mental math reps"
      kicker="Fast arithmetic"
      icon={<Sigma size={16} />}
      onAnswer={onAnswer}
      onNext={() => setIndex((current) => current + 1)}
    />
  );
}

function CaseDrill({ onAnswer }: { onAnswer: (correct: boolean, elapsedMs: number) => void }) {
  const [active, setActive] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const activeCase: InterviewCase = interviewCases[active];
  const elapsedMs = useElapsed(activeCase.id, selectedChoiceId === null);
  const correct = selectedChoiceId === activeCase.correctChoiceId;

  useEffect(() => {
    setSelectedChoiceId(null);
  }, [activeCase.id]);

  function selectChoice(choiceId: string) {
    if (selectedChoiceId) return;
    setSelectedChoiceId(choiceId);
    onAnswer(choiceId === activeCase.correctChoiceId, elapsedMs);
  }

  function next() {
    setActive((current) => (current + 1) % interviewCases.length);
  }

  return (
    <section className="training-panel case-panel" aria-labelledby="case-heading">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Interview cases</span>
          <h2 id="case-heading">Decision reps</h2>
        </div>
        <span className="deck-count">
          {active + 1}/{interviewCases.length}
        </span>
      </div>

      <div className="problem-card case-card">
        <span>{activeCase.focus}</span>
        <h3>{activeCase.title}</h3>
        <p>{activeCase.setup}</p>
        <strong>{activeCase.question}</strong>
      </div>

      <div className="answer-grid">
        {activeCase.choices.map((choice) => (
          <AnswerChoiceButton
            key={choice.id}
            choice={choice}
            selected={choice.id === selectedChoiceId}
            correct={choice.id === activeCase.correctChoiceId}
            disabled={selectedChoiceId !== null}
            onSelect={() => selectChoice(choice.id)}
          />
        ))}
      </div>

      <div className={cn("feedback-bar", selectedChoiceId && (correct ? "good" : "bad"))}>
        {selectedChoiceId ? (
          <>
            <strong>{correct ? "Good interview instinct" : "Watch this trap"}</strong>
            <span>{activeCase.explanation}</span>
            <button className="icon-button label-button" onClick={next} title="Next case">
              <ScrollText size={16} />
              Next case
            </button>
          </>
        ) : (
          <>
            <strong>Say what you would do first.</strong>
            <span>These are curated prompts for the judgment part of market-making interviews.</span>
          </>
        )}
      </div>
    </section>
  );
}

function BookLadder({ scenario }: { scenario: QuoteScenario }) {
  const book = useMemo(() => createBook(scenario.fair, scenario.bookImbalance, scenario.volatility), [scenario]);
  const imbalance = bookImbalance(book);
  const micro = microprice(book);
  const maxSize = Math.max(...book.bids.map((level) => level.size), ...book.asks.map((level) => level.size));
  const ladderRows = [
    ...book.asks
      .slice()
      .reverse()
      .map((level) => ({ side: "ask" as const, price: level.price, size: level.size })),
    ...book.bids.map((level) => ({ side: "bid" as const, price: level.price, size: level.size })),
  ];

  return (
    <section className="training-panel book-panel" aria-labelledby="book-heading">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Microstructure</span>
          <h2 id="book-heading">Limit order book</h2>
        </div>
        <div className={cn("micro-pill", micro > scenario.fair ? "up" : "down")} title="Microprice">
          {micro > scenario.fair ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {formatPrice(micro)}
        </div>
      </div>

      <div className="book-summary">
        <StatTile icon={<ArrowDownToLine size={18} />} label="Imbalance" value={`${Math.round(imbalance * 100)}%`} tone={imbalance > 0.58 ? "good" : imbalance < 0.42 ? "bad" : "neutral"} />
        <StatTile icon={<Gauge size={18} />} label="Spread" value={formatPrice(book.asks[0].price - book.bids[0].price)} tone="warn" />
      </div>

      <div className="ladder" role="table" aria-label="Order book ladder">
        <div className="ladder-head" role="row">
          <span>Ask size</span>
          <span>Price</span>
          <span>Bid size</span>
        </div>
        {ladderRows.slice(0, 8).map((row) => (
          <div className="ladder-row ask-row" role="row" key={`ask-${row.price}`}>
            <div className="depth-cell ask">
              <i style={{ width: `${(row.size / maxSize) * 100}%` }} />
              <span>{row.size}</span>
            </div>
            <strong className="ask-price">{formatPrice(row.price)}</strong>
            <div className="depth-cell bid empty" />
          </div>
        ))}
        <div className="ladder-mid" role="row">
          <span>Mid {formatPrice(book.mid)}</span>
        </div>
        {ladderRows.slice(8).map((row) => (
          <div className="ladder-row bid-row" role="row" key={`bid-${row.price}`}>
            <div className="depth-cell ask empty" />
            <strong className="bid-price">{formatPrice(row.price)}</strong>
            <div className="depth-cell bid">
              <i style={{ width: `${(row.size / maxSize) * 100}%` }} />
              <span>{row.size}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OrderBookCoach({ scenario }: { scenario: QuoteScenario }) {
  const book = useMemo(() => createBook(scenario.fair, scenario.bookImbalance, scenario.volatility), [scenario]);
  const imbalance = bookImbalance(book);
  const micro = microprice(book);
  const lean = micro > scenario.fair ? "raise quote center" : "lower quote center";
  const pressure = imbalance > 0.58 ? "bid-heavy" : imbalance < 0.42 ? "ask-heavy" : "balanced";

  return (
    <section className="training-panel coach-panel" aria-labelledby="book-coach-heading">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Book reading</span>
          <h2 id="book-coach-heading">Read the next tick</h2>
        </div>
        <BrainCircuitIcon />
      </div>

      <div className="coach-list">
        <div>
          <span>Pressure</span>
          <strong>{pressure}</strong>
          <p>Displayed depth says whether near-touch liquidity is leaning bid, ask, or neutral.</p>
        </div>
        <div>
          <span>Microprice</span>
          <strong>{formatPrice(micro)}</strong>
          <p>Compare it to fair value before you decide whether the mid is too naive.</p>
        </div>
        <div>
          <span>Quote adjustment</span>
          <strong>{lean}</strong>
          <p>Let the book inform center, but keep flow toxicity and inventory in the decision.</p>
        </div>
      </div>
    </section>
  );
}

function BrainCircuitIcon() {
  return (
    <div className="stat-icon standalone-icon">
      <Brain size={18} />
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const width = 280;
  const height = 82;
  const min = Math.min(...values, -1);
  const max = Math.max(...values, 1);
  const span = Math.max(1, max - min);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="PnL sparkline">
      <line x1="0" x2={width} y1={height / 2} y2={height / 2} />
      <polyline points={points} />
    </svg>
  );
}

function Simulator({ onStep }: { onStep?: () => void }) {
  const [state, setState] = useState<SimState>(() => initialSimState());
  const [action, setAction] = useState<SimulatorAction>({ width: "balanced", lean: "neutral" });

  function step() {
    setState((current) => advanceSimulation(current, action));
    onStep?.();
  }

  function reset() {
    setState(initialSimState());
  }

  return (
    <section className="training-panel simulator-panel" aria-labelledby="sim-heading">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Inventory lab</span>
          <h2 id="sim-heading">Run a market</h2>
        </div>
        <button className="icon-button" onClick={reset} title="Reset simulator">
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="sim-stats">
        <StatTile icon={<Target size={18} />} label="Fair" value={formatPrice(state.fair)} />
        <StatTile icon={<BookOpenCheck size={18} />} label="Inv" value={String(state.inventory)} tone={Math.abs(state.inventory) > 6 ? "warn" : "neutral"} />
        <StatTile icon={<LineChart size={18} />} label="PnL" value={formatSigned(state.pnl)} tone={state.pnl >= 0 ? "good" : "bad"} />
      </div>

      <Sparkline values={state.history} />

      <div className="control-row" aria-label="Quote width">
        {(["tight", "balanced", "wide"] as SimulatorAction["width"][]).map((width) => (
          <button
            key={width}
            className={cn("segmented-button", action.width === width && "active")}
            onClick={() => setAction((current) => ({ ...current, width }))}
            title={`Use ${width} quote width`}
          >
            {width}
          </button>
        ))}
      </div>

      <div className="control-row" aria-label="Quote lean">
        {(["bid", "neutral", "ask"] as SimulatorAction["lean"][]).map((lean) => (
          <button
            key={lean}
            className={cn("segmented-button", action.lean === lean && "active")}
            onClick={() => setAction((current) => ({ ...current, lean }))}
            title={`Lean quote ${lean}`}
          >
            {lean === "bid" ? <ArrowUpToLine size={15} /> : lean === "ask" ? <ArrowDownToLine size={15} /> : <Crosshair size={15} />}
            {lean}
          </button>
        ))}
      </div>

      <div className="sim-event">
        <strong>Last event</strong>
        <span>{state.lastEvent}</span>
      </div>

      <button className="primary-action" onClick={step}>
        <Play size={18} />
        Quote next tick
      </button>
    </section>
  );
}

function InventoryPlaybook({ simRuns }: { simRuns: number }) {
  return (
    <section className="training-panel playbook-panel" aria-labelledby="inventory-playbook-heading">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Skew playbook</span>
          <h2 id="inventory-playbook-heading">Inventory rules</h2>
        </div>
        <span className="deck-count">{simRuns} ticks</span>
      </div>

      <div className="coach-list">
        <div>
          <span>Too long</span>
          <strong>lean ask</strong>
          <p>Lower the ask to sell inventory and lower the bid so you buy less.</p>
        </div>
        <div>
          <span>Too short</span>
          <strong>lean bid</strong>
          <p>Raise the bid so sellers can hit you and you can buy back inventory.</p>
        </div>
        <div>
          <span>Uncertain fair</span>
          <strong>widen first</strong>
          <p>Width buys time when volatility or toxic flow makes your fair value stale.</p>
        </div>
      </div>
    </section>
  );
}

function ConceptDeck() {
  const [active, setActive] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = conceptCards[active];

  function next() {
    setActive((current) => (current + 1) % conceptCards.length);
    setRevealed(false);
  }

  return (
    <section className="training-panel concept-panel" aria-labelledby="concept-heading">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Concept reps</span>
          <h2 id="concept-heading">Microstructure deck</h2>
        </div>
        <span className="deck-count">
          {active + 1}/{conceptCards.length}
        </span>
      </div>

      <div className="concept-card">
        <span>{card.tag}</span>
        <h3>{card.title}</h3>
        <p>{card.prompt}</p>
        {revealed ? <strong>{card.answer}</strong> : <button onClick={() => setRevealed(true)}>Reveal answer</button>}
      </div>

      <button className="icon-button label-button" onClick={next} title="Next concept">
        <RefreshCcw size={16} />
        Next card
      </button>
    </section>
  );
}

function FocusMap() {
  const nodes = [
    { label: "Fair value", value: "Anchor quote center", x: 50, y: 12 },
    { label: "Volatility", value: "Choose width", x: 18, y: 40 },
    { label: "Flow toxicity", value: "Avoid stale fills", x: 82, y: 40 },
    { label: "Inventory", value: "Skew center", x: 28, y: 76 },
    { label: "Queue", value: "Estimate fill odds", x: 72, y: 76 },
  ];

  return (
    <section className="focus-map" aria-labelledby="map-heading">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Mental model</span>
          <h2 id="map-heading">Quote in five checks</h2>
        </div>
      </div>
      <div className="map-canvas">
        {nodes.map((node) => (
          <div className="map-node" style={{ left: `${node.x}%`, top: `${node.y}%` }} key={node.label}>
            <strong>{node.label}</strong>
            <span>{node.value}</span>
          </div>
        ))}
        <div className="map-center">
          <Brain size={24} />
          <strong>Bid / Ask</strong>
        </div>
      </div>
    </section>
  );
}

function PracticeSummary({ progress, recentResults }: { progress: Progress; recentResults: DrillResult[] }) {
  const avgSpeed = recentResults.length
    ? recentResults.reduce((sum, result) => sum + result.elapsedMs, 0) / recentResults.length / 1000
    : 0;
  const sessionAccuracy = recentResults.length
    ? Math.round((recentResults.filter((result) => result.correct).length / recentResults.length) * 100)
    : 0;

  return (
    <section className="summary-band" aria-label="Session summary">
      <StatTile icon={<TimerReset size={18} />} label="Session speed" value={recentResults.length ? `${avgSpeed.toFixed(1)}s` : "0.0s"} tone={avgSpeed && avgSpeed < 1.2 ? "good" : "neutral"} />
      <StatTile icon={<Check size={18} />} label="Quote hit rate" value={`${sessionAccuracy}%`} tone={sessionAccuracy >= 70 ? "good" : sessionAccuracy ? "warn" : "neutral"} />
      <StatTile icon={<Crosshair size={18} />} label="Total reps" value={String(totalAttempts(progress))} />
      <StatTile icon={<Gauge size={18} />} label="Best streak" value={String(progress.bestStreak)} tone="warn" />
    </section>
  );
}

function PrepProgressBreakdown({ progress }: { progress: Progress }) {
  const rows = [
    { label: "Quotes", attempts: progress.quoteAttempts, correct: progress.quoteCorrect },
    { label: "Probability", attempts: progress.probabilityAttempts, correct: progress.probabilityCorrect },
    { label: "Math", attempts: progress.mathAttempts, correct: progress.mathCorrect },
    { label: "Cases", attempts: progress.caseAttempts, correct: progress.caseCorrect },
  ];

  return (
    <section className="training-panel progress-panel" aria-labelledby="progress-heading">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Prep mix</span>
          <h2 id="progress-heading">Coverage</h2>
        </div>
      </div>
      <div className="coverage-list">
        {rows.map((row) => (
          <div key={row.label}>
            <span>{row.label}</span>
            <strong>
              {row.attempts} reps / {progressAccuracy(row.correct, row.attempts)}%
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivePrepView({
  activeTab,
  scenario,
  progress,
  onQuoteResult,
  onNextScenario,
  onPrepResult,
  onSimStep,
}: {
  activeTab: PrepTabId;
  scenario: QuoteScenario;
  progress: Progress;
  onQuoteResult: (result: DrillResult) => void;
  onNextScenario: () => void;
  onPrepResult: (kind: ProgressKind, correct: boolean, elapsedMs: number) => void;
  onSimStep: () => void;
}) {
  if (activeTab === "book") {
    return (
      <div className="tab-grid two-column-grid">
        <BookLadder scenario={scenario} />
        <OrderBookCoach scenario={scenario} />
      </div>
    );
  }

  if (activeTab === "inventory") {
    return (
      <div className="tab-grid two-column-grid">
        <Simulator onStep={onSimStep} />
        <InventoryPlaybook simRuns={progress.simRuns} />
      </div>
    );
  }

  if (activeTab === "probability") {
    return (
      <div className="tab-grid two-column-grid">
        <ProbabilityDrill onAnswer={(correct, elapsedMs) => onPrepResult("probability", correct, elapsedMs)} />
        <PrepProgressBreakdown progress={progress} />
      </div>
    );
  }

  if (activeTab === "math") {
    return (
      <div className="tab-grid two-column-grid">
        <MentalMathDrill onAnswer={(correct, elapsedMs) => onPrepResult("math", correct, elapsedMs)} />
        <PrepProgressBreakdown progress={progress} />
      </div>
    );
  }

  if (activeTab === "concepts") {
    return (
      <div className="tab-grid two-column-grid">
        <ConceptDeck />
        <FocusMap />
      </div>
    );
  }

  if (activeTab === "cases") {
    return (
      <div className="tab-grid two-column-grid">
        <CaseDrill onAnswer={(correct, elapsedMs) => onPrepResult("case", correct, elapsedMs)} />
        <PrepProgressBreakdown progress={progress} />
      </div>
    );
  }

  return (
    <div className="tab-grid quote-grid">
      <QuoteDrill scenario={scenario} onResult={onQuoteResult} onNext={onNextScenario} />
      <BookLadder scenario={scenario} />
      <PrepProgressBreakdown progress={progress} />
    </div>
  );
}

export default function App() {
  const [progress, setProgress] = useState<Progress>(() => readProgress());
  const [scenarioIndex, setScenarioIndex] = useState(1);
  const [activeTab, setActiveTab] = useState<PrepTabId>("quote");
  const [recentResults, setRecentResults] = useState<DrillResult[]>([]);
  const scenario = useMemo(() => makeQuoteScenario(scenarioIndex), [scenarioIndex]);
  const activePrep = prepTabs.find((tab) => tab.id === activeTab) ?? prepTabs[0];

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  function recordPrepResult(kind: ProgressKind, correct: boolean) {
    setProgress((current) => applyPrepResult(current, kind, correct));
  }

  function handleResult(result: DrillResult) {
    setRecentResults((results) => [result, ...results].slice(0, 12));
    recordPrepResult("quote", result.correct);
  }

  function nextScenario() {
    setScenarioIndex((index) => index + 1);
  }

  function resetProgress() {
    setProgress(defaultProgress);
    setRecentResults([]);
    window.localStorage.removeItem(progressKey);
  }

  function recordSimStep() {
    setProgress((current) => ({
      ...current,
      simRuns: current.simRuns + 1,
    }));
  }

  return (
    <main className="app-shell">
      <Header progress={progress} />

      <div className="toolbar">
        <div>
          <strong>{activePrep.label}</strong>
          <span>{activePrep.detail}</span>
        </div>
        <button className="icon-button label-button" onClick={resetProgress} title="Reset saved training progress">
          <RefreshCcw size={16} />
          Reset progress
        </button>
      </div>

      <TabNav activeTab={activeTab} onChange={setActiveTab} />

      <PracticeSummary progress={progress} recentResults={recentResults} />

      <ActivePrepView
        activeTab={activeTab}
        scenario={scenario}
        progress={progress}
        onQuoteResult={handleResult}
        onNextScenario={nextScenario}
        onPrepResult={(kind, correct) => recordPrepResult(kind, correct)}
        onSimStep={recordSimStep}
      />
    </main>
  );
}
