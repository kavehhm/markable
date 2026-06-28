export type Side = "bid" | "ask";

export type BookLevel = {
  price: number;
  size: number;
  queue: number;
};

export type BookSnapshot = {
  bids: BookLevel[];
  asks: BookLevel[];
  mid: number;
};

export type FlowBias = "sell pressure" | "balanced flow" | "buy pressure";
export type Volatility = "quiet" | "normal" | "jumpy";

export type QuoteChoice = {
  id: string;
  label: string;
  bid: number;
  ask: number;
  rationale: string;
};

export type QuoteScenario = {
  id: number;
  fair: number;
  inventory: number;
  positionLimit: number;
  volatility: Volatility;
  flow: FlowBias;
  bookImbalance: number;
  news: string;
  correctChoiceId: string;
  choices: QuoteChoice[];
};

export type DrillResult = {
  scenarioId: number;
  correct: boolean;
  elapsedMs: number;
  selectedChoiceId: string;
};

export type SimulatorAction = {
  width: "tight" | "balanced" | "wide";
  lean: "bid" | "neutral" | "ask";
};

export type SimState = {
  fair: number;
  mid: number;
  inventory: number;
  cash: number;
  pnl: number;
  step: number;
  spreadCapture: number;
  adverseSelection: number;
  lastEvent: string;
  history: number[];
};

export type Concept = {
  title: string;
  tag: string;
  prompt: string;
  answer: string;
};

export type DrillChoice = {
  id: string;
  label: string;
  detail?: string;
};

export type PrepProblem = {
  id: number;
  title: string;
  tag: string;
  prompt: string;
  givens: string[];
  correctChoiceId: string;
  choices: DrillChoice[];
  explanation: string;
};

export type InterviewCase = {
  id: number;
  title: string;
  focus: string;
  setup: string;
  question: string;
  correctChoiceId: string;
  choices: DrillChoice[];
  explanation: string;
};

export type Progress = {
  quoteAttempts: number;
  quoteCorrect: number;
  probabilityAttempts: number;
  probabilityCorrect: number;
  mathAttempts: number;
  mathCorrect: number;
  caseAttempts: number;
  caseCorrect: number;
  bestStreak: number;
  currentStreak: number;
  simRuns: number;
};
