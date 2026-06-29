import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, Play, RefreshCcw } from "lucide-react";
import { ArenaSession } from "../ArenaApp";
import { Panel, PanelHead, Pill, Stat } from "../components/ui";
import { fmt, fmtSigned } from "../format";
import { Topline } from "./FairValueDrill";

type DrillId =
  | "inventory"
  | "edge_pnl"
  | "fv_shock"
  | "toxic_flow"
  | "two_market"
  | "interview";

type Phase = "setup" | "intro" | "flash" | "gap" | "quiz" | "review";
type FlowRead = "buy-heavy" | "sell-heavy" | "balanced";
type Direction = "up" | "down" | "stay";
type WidthMove = "widen" | "tighten" | "keep";
type Worry = "inventory" | "adverse selection" | "balanced";
type MarketKey = "A" | "B";

type MemorySettings = {
  displayMs: number;
  gapMs: number;
  eventCount: number;
  allowNotes: boolean;
  pnlTolerance: number;
};

type MarketMemory = {
  key: MarketKey;
  label: string;
  initialFv: number;
  fv: number;
  q: number;
  pnl: number;
  buyFlow: number;
  sellFlow: number;
};

type FlashEvent = {
  market: MarketKey;
  text: string;
  kind: "trade" | "fv" | "position";
};

type ReviewRow = {
  event: string;
  update: string;
};

type MemoryRound = {
  drill: DrillId;
  title: string;
  instructions: string;
  markets: Record<MarketKey, MarketMemory>;
  events: FlashEvent[];
  review: ReviewRow[];
  hiddenTrue?: number;
  asks: {
    positionA: boolean;
    pnlA: boolean;
    positionB: boolean;
    pnlB: boolean;
    flow: boolean;
    fvDirection: boolean;
    quoteMove: boolean;
    widthMove: boolean;
    worry: boolean;
    toxicMarket: boolean;
  };
  expected: {
    positionA: number;
    pnlA: number;
    positionB: number;
    pnlB: number;
    flow: FlowRead;
    fvDirection: Direction;
    quoteMove: Direction;
    widthMove: WidthMove;
    worry: Worry;
    toxicMarket: MarketKey;
  };
};

type Answers = {
  positionA: string;
  pnlA: string;
  positionB: string;
  pnlB: string;
  flow: FlowRead | "";
  fvDirection: Direction | "";
  quoteMove: Direction | "";
  widthMove: WidthMove | "";
  worry: Worry | "";
  toxicMarket: MarketKey | "";
  mistake: string;
  notes: string;
};

type ScoreResult = {
  score: number;
  position: number;
  pnl: number;
  fv: number;
  quote: number;
  speed: number;
  notesPenalty: boolean;
};

const DRILLS: Array<{ id: DrillId; title: string; blurb: string }> = [
  { id: "inventory", title: "Inventory Blitz", blurb: "Only track position. Nothing else matters." },
  { id: "edge_pnl", title: "Edge PnL Blitz", blurb: "Fixed fair value. Track inventory and marked edge PnL." },
  { id: "fv_shock", title: "FV Shock Drill", blurb: "Fair value moves while you carry inventory." },
  { id: "toxic_flow", title: "Toxic Flow Drill", blurb: "Repeated lifts or hits force an adverse-selection read." },
  { id: "two_market", title: "Two-Market Chaos", blurb: "Switch between two books without keeping the full tape." },
  { id: "interview", title: "Interview Mode", blurb: "Fast mixed events. No feedback until the checkpoint." },
];

const DEFAULT_SETTINGS: MemorySettings = {
  displayMs: 1500,
  gapMs: 500,
  eventCount: 5,
  allowNotes: false,
  pnlTolerance: 2,
};

function emptyAnswers(): Answers {
  return {
    positionA: "",
    pnlA: "",
    positionB: "",
    pnlB: "",
    flow: "",
    fvDirection: "",
    quoteMove: "",
    widthMove: "",
    worry: "",
    toxicMarket: "",
    mistake: "",
    notes: "",
  };
}

function randInt(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function pick<T>(xs: T[]): T {
  return xs[randInt(0, xs.length - 1)];
}

function makeMarket(key: MarketKey, label: string, fv: number): MarketMemory {
  return { key, label, initialFv: fv, fv, q: 0, pnl: 0, buyFlow: 0, sellFlow: 0 };
}

function cloneMarket(m: MarketMemory): MarketMemory {
  return { ...m };
}

function signedInt(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

function flowFor(m: MarketMemory): FlowRead {
  if (m.buyFlow >= m.sellFlow + 2) return "buy-heavy";
  if (m.sellFlow >= m.buyFlow + 2) return "sell-heavy";
  return "balanced";
}

function directionForFlow(flow: FlowRead): Direction {
  if (flow === "buy-heavy") return "up";
  if (flow === "sell-heavy") return "down";
  return "stay";
}

function widthForFlow(flow: FlowRead): WidthMove {
  return flow === "balanced" ? "keep" : "widen";
}

function worryFor(m: MarketMemory): Worry {
  const flowImbalance = Math.abs(m.buyFlow - m.sellFlow);
  if (flowImbalance >= Math.max(2, Math.abs(m.q))) return "adverse selection";
  if (Math.abs(m.q) >= 3) return "inventory";
  return "balanced";
}

function applyUserBuy(m: MarketMemory, qty: number, price: number): string {
  m.q += qty;
  const edge = qty * (m.fv - price);
  m.pnl += edge;
  m.sellFlow += qty;
  return `q=${signedInt(m.q)}, M += ${fmtSigned(edge)}, total M=${fmtSigned(m.pnl)}`;
}

function applyUserSell(m: MarketMemory, qty: number, price: number): string {
  m.q -= qty;
  const edge = qty * (price - m.fv);
  m.pnl += edge;
  m.buyFlow += qty;
  return `q=${signedInt(m.q)}, M += ${fmtSigned(edge)}, total M=${fmtSigned(m.pnl)}`;
}

function applyPositionOnly(m: MarketMemory, side: "buy" | "sell", qty: number): string {
  m.q += side === "buy" ? qty : -qty;
  if (side === "buy") m.sellFlow += qty;
  else m.buyFlow += qty;
  return `q=${signedInt(m.q)}`;
}

function applyFvMove(m: MarketMemory, newFv: number): string {
  const oldFv = m.fv;
  const mark = m.q * (newFv - oldFv);
  m.pnl += mark;
  m.fv = newFv;
  return `FV ${fmt(oldFv)} to ${fmt(newFv)}: M += q x dFV = ${signedInt(m.q)} x ${fmt(newFv - oldFv)} = ${fmtSigned(mark)}, total M=${fmtSigned(m.pnl)}`;
}

function commonAsks(overrides: Partial<MemoryRound["asks"]>): MemoryRound["asks"] {
  return {
    positionA: true,
    pnlA: true,
    positionB: false,
    pnlB: false,
    flow: false,
    fvDirection: false,
    quoteMove: false,
    widthMove: false,
    worry: false,
    toxicMarket: false,
    ...overrides,
  };
}

function expectedFrom(a: MarketMemory, b?: MarketMemory): MemoryRound["expected"] {
  const flow = flowFor(a);
  const toxicMarket = b && Math.abs(b.buyFlow - b.sellFlow) > Math.abs(a.buyFlow - a.sellFlow) ? "B" : "A";
  return {
    positionA: a.q,
    pnlA: a.pnl,
    positionB: b?.q ?? 0,
    pnlB: b?.pnl ?? 0,
    flow,
    fvDirection: directionForFlow(flow),
    quoteMove: directionForFlow(flow),
    widthMove: widthForFlow(flow),
    worry: worryFor(a),
    toxicMarket,
  };
}

function buildInventoryRound(count: number): MemoryRound {
  const a = makeMarket("A", "Inventory only", 0);
  const events: FlashEvent[] = [];
  const review: ReviewRow[] = [];
  for (let i = 0; i < count; i++) {
    const side = pick<"buy" | "sell">(["buy", "sell"]);
    const qty = randInt(1, 4);
    const text = side === "buy" ? `Buy ${qty}` : `Sell ${qty}`;
    const update = applyPositionOnly(a, side, qty);
    events.push({ market: "A", text, kind: "position" });
    review.push({ event: text, update });
  }
  return {
    drill: "inventory",
    title: "Inventory Blitz",
    instructions: "Only track net position. Drop everything else.",
    markets: { A: cloneMarket(a), B: makeMarket("B", "Unused", 0) },
    events,
    review,
    asks: commonAsks({ pnlA: false }),
    expected: expectedFrom(a),
  };
}

function buildEdgeRound(count: number): MemoryRound {
  const fv = pick([30, 50, 100]);
  const a = makeMarket("A", `Fixed FV ${fv}`, fv);
  const events: FlashEvent[] = [];
  const review: ReviewRow[] = [];
  for (let i = 0; i < count; i++) {
    const side = pick<"buy" | "sell">(["buy", "sell"]);
    const qty = randInt(1, 3);
    const price = fv + randInt(-5, 5);
    const text = side === "buy" ? `Bought ${qty} @ ${price}` : `Sold ${qty} @ ${price}`;
    const update = side === "buy" ? applyUserBuy(a, qty, price) : applyUserSell(a, qty, price);
    events.push({ market: "A", text, kind: "trade" });
    review.push({ event: `${text}, FV ${fmt(a.fv)}`, update });
  }
  return {
    drill: "edge_pnl",
    title: "Edge PnL Blitz",
    instructions: `Fixed fair value: ${fv}. Track q and marked edge PnL.`,
    markets: { A: cloneMarket(a), B: makeMarket("B", "Unused", 0) },
    events,
    review,
    asks: commonAsks({ worry: true }),
    expected: expectedFrom(a),
  };
}

function buildFvShockRound(count: number): MemoryRound {
  const a = makeMarket("A", "Card sum", 50);
  const events: FlashEvent[] = [];
  const review: ReviewRow[] = [];
  let updates = 0;
  for (let i = 0; i < count; i++) {
    const doFv = i > 0 && (updates === 0 || Math.random() < 0.35);
    if (doFv) {
      updates += 1;
      const newFv = a.fv + pick([-4, -3, -2, 2, 3, 4]);
      const text = `FV updates to ${newFv}`;
      const update = applyFvMove(a, newFv);
      events.push({ market: "A", text, kind: "fv" });
      review.push({ event: text, update });
    } else {
      const side = pick<"buy" | "sell">(["buy", "sell"]);
      const qty = randInt(1, 3);
      const price = a.fv + randInt(-4, 5);
      const text = side === "buy" ? `Bought ${qty} @ ${price}` : `Sold ${qty} @ ${price}`;
      const update = side === "buy" ? applyUserBuy(a, qty, price) : applyUserSell(a, qty, price);
      events.push({ market: "A", text, kind: "trade" });
      review.push({ event: `${text}, FV ${fmt(a.fv)}`, update });
    }
  }
  return {
    drill: "fv_shock",
    title: "FV Shock Drill",
    instructions: "Track q, edge PnL, and mark-to-market when FV changes.",
    markets: { A: cloneMarket(a), B: makeMarket("B", "Unused", 0) },
    events,
    review,
    asks: commonAsks({ fvDirection: true, quoteMove: true, widthMove: true, worry: true }),
    expected: expectedFrom(a),
  };
}

function buildToxicRound(count: number): MemoryRound {
  const hiddenTrue = pick([42, 60]);
  const toxicBuy = hiddenTrue > 50;
  const a = makeMarket("A", "Unknown card sum", 50);
  const events: FlashEvent[] = [];
  const review: ReviewRow[] = [];
  for (let i = 0; i < count; i++) {
    const toxicEvent = Math.random() < 0.78;
    const qty = randInt(1, 3);
    if ((toxicBuy && toxicEvent) || (!toxicBuy && !toxicEvent && Math.random() < 0.35)) {
      const price = 52 + i + randInt(0, 2);
      const text = `Buyer lifts your ask: sold ${qty} @ ${price}`;
      const update = applyUserSell(a, qty, price);
      events.push({ market: "A", text, kind: "trade" });
      review.push({ event: `${text}, FV ${fmt(a.fv)}`, update });
    } else {
      const price = 48 - i - randInt(0, 2);
      const text = `Seller hits your bid: bought ${qty} @ ${price}`;
      const update = applyUserBuy(a, qty, price);
      events.push({ market: "A", text, kind: "trade" });
      review.push({ event: `${text}, FV ${fmt(a.fv)}`, update });
    }
  }
  const expected = expectedFrom(a);
  expected.fvDirection = toxicBuy ? "up" : "down";
  expected.quoteMove = toxicBuy ? "up" : "down";
  expected.widthMove = "widen";
  expected.worry = "adverse selection";
  return {
    drill: "toxic_flow",
    title: "Toxic Flow Drill",
    instructions: "Your FV estimate starts at 50. Track q, PnL at your FV, and whether flow is informed.",
    markets: { A: cloneMarket(a), B: makeMarket("B", "Unused", 0) },
    events,
    review,
    hiddenTrue,
    asks: commonAsks({ flow: true, fvDirection: true, quoteMove: true, widthMove: true, worry: true }),
    expected,
  };
}

function buildTwoMarketRound(count: number): MemoryRound {
  const a = makeMarket("A", "A: Sum of cards", 30);
  const b = makeMarket("B", "B: Product of cards", 180);
  const events: FlashEvent[] = [];
  const review: ReviewRow[] = [];
  for (let i = 0; i < count; i++) {
    const market = Math.random() < 0.55 ? a : b;
    const marketKey = market.key;
    const forceFv = marketKey === "B" && i > 0 && Math.random() < 0.25;
    if (forceFv) {
      const newFv = market.fv + pick([-20, -10, 10, 20]);
      const text = `${marketKey}: FV updates to ${newFv}`;
      const update = applyFvMove(market, newFv);
      events.push({ market: marketKey, text, kind: "fv" });
      review.push({ event: text, update });
    } else {
      const side = Math.random() < (marketKey === "A" ? 0.7 : 0.5) ? "sell" : "buy";
      const qty = randInt(1, marketKey === "A" ? 3 : 2);
      const price = market.fv + randInt(marketKey === "A" ? -4 : -25, marketKey === "A" ? 8 : 30);
      const text = side === "buy"
        ? `${marketKey}: bought ${qty} @ ${price}`
        : `${marketKey}: sold ${qty} @ ${price}`;
      const update = side === "buy" ? applyUserBuy(market, qty, price) : applyUserSell(market, qty, price);
      events.push({ market: marketKey, text, kind: "trade" });
      review.push({ event: `${text}, FV ${fmt(market.fv)}`, update });
    }
  }
  const expected = expectedFrom(a, b);
  const toxic = expected.toxicMarket === "A" ? a : b;
  expected.flow = flowFor(toxic);
  expected.fvDirection = directionForFlow(expected.flow);
  expected.quoteMove = directionForFlow(expected.flow);
  expected.widthMove = widthForFlow(expected.flow);
  expected.worry = worryFor(toxic);
  return {
    drill: "two_market",
    title: "Two-Market Chaos",
    instructions: "Track compressed state for A and B. Do not memorize the tape.",
    markets: { A: cloneMarket(a), B: cloneMarket(b) },
    events,
    review,
    asks: commonAsks({
      positionB: true,
      pnlB: true,
      flow: true,
      fvDirection: true,
      quoteMove: true,
      widthMove: true,
      worry: true,
      toxicMarket: true,
    }),
    expected,
  };
}

function buildInterviewRound(count: number): MemoryRound {
  const round = Math.random() < 0.5 ? buildToxicRound(count) : buildFvShockRound(count);
  return {
    ...round,
    drill: "interview",
    title: "Interview Mode",
    instructions: "Fast disappearing events. Give the compressed trader state at checkpoint.",
  };
}

function generateRound(drill: DrillId, count: number): MemoryRound {
  if (drill === "inventory") return buildInventoryRound(count);
  if (drill === "edge_pnl") return buildEdgeRound(count);
  if (drill === "fv_shock") return buildFvShockRound(count);
  if (drill === "toxic_flow") return buildToxicRound(count);
  if (drill === "two_market") return buildTwoMarketRound(count);
  return buildInterviewRound(count);
}

function parseNumber(value: string): number | null {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) ? n : null;
}

function numericScore(answer: string, expected: number, tolerance: number): number {
  const n = parseNumber(answer);
  if (n === null) return 0;
  const diff = Math.abs(n - expected);
  if (diff < 1e-9) return 1;
  if (diff <= tolerance) return 0.75;
  if (Math.sign(n) === Math.sign(expected) && diff <= Math.max(tolerance * 2, Math.abs(expected) * 0.35)) return 0.35;
  return 0;
}

function scoreRound(round: MemoryRound, answers: Answers, settings: MemorySettings, quizMs: number): ScoreResult {
  let position = 0;
  let positionPossible = 0;
  if (round.asks.positionA) {
    position += numericScore(answers.positionA, round.expected.positionA, 0) * 15;
    positionPossible += 15;
  }
  if (round.asks.positionB) {
    position += numericScore(answers.positionB, round.expected.positionB, 0) * 15;
    positionPossible += 15;
  }

  let pnl = 0;
  let pnlPossible = 0;
  if (round.asks.pnlA) {
    pnl += numericScore(answers.pnlA, round.expected.pnlA, settings.pnlTolerance) * 10;
    pnlPossible += 10;
  }
  if (round.asks.pnlB) {
    pnl += numericScore(answers.pnlB, round.expected.pnlB, settings.pnlTolerance) * 10;
    pnlPossible += 10;
  }

  let fv = 0;
  let fvPossible = 0;
  if (round.asks.flow) {
    fv += answers.flow === round.expected.flow ? 8 : 0;
    fvPossible += 8;
  }
  if (round.asks.fvDirection) {
    fv += answers.fvDirection === round.expected.fvDirection ? 12 : 0;
    fvPossible += 12;
  }

  let quote = 0;
  let quotePossible = 0;
  if (round.asks.quoteMove) {
    quote += answers.quoteMove === round.expected.quoteMove ? 8 : 0;
    quotePossible += 8;
  }
  if (round.asks.widthMove) {
    quote += answers.widthMove === round.expected.widthMove ? 8 : 0;
    quotePossible += 8;
  }
  if (round.asks.worry) {
    quote += answers.worry === round.expected.worry ? 4 : 0;
    quotePossible += 4;
  }
  if (round.asks.toxicMarket) {
    quote += answers.toxicMarket === round.expected.toxicMarket ? 4 : 0;
    quotePossible += 4;
  }

  const normalize = (got: number, possible: number, weight: number) => (possible ? (got / possible) * weight : weight);
  const positionWeighted = normalize(position, positionPossible, 30);
  const pnlWeighted = normalize(pnl, pnlPossible, 20);
  const fvWeighted = normalize(fv, fvPossible, 20);
  const quoteWeighted = normalize(quote, quotePossible, 20);
  const speedBase = quizMs <= 12_000 ? 10 : quizMs <= 25_000 ? 7 : quizMs <= 45_000 ? 4 : 1;
  const notesPenalty = answers.notes.trim().length > 40;
  const speed = notesPenalty ? speedBase * 0.5 : speedBase;
  const score = Math.round(positionWeighted + pnlWeighted + fvWeighted + quoteWeighted + speed);

  return {
    score,
    position: Math.round(positionWeighted),
    pnl: Math.round(pnlWeighted),
    fv: Math.round(fvWeighted),
    quote: Math.round(quoteWeighted),
    speed: Math.round(speed),
    notesPenalty,
  };
}

function selectClass(active: boolean): string {
  return `memory-choice ${active ? "active" : ""}`;
}

export function TraderMemoryArena({
  onExit,
}: {
  session: ArenaSession;
  onExit: () => void;
}) {
  const [drill, setDrill] = useState<DrillId>("toxic_flow");
  const [settings, setSettings] = useState<MemorySettings>(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState<Phase>("setup");
  const [round, setRound] = useState<MemoryRound | null>(null);
  const [eventIndex, setEventIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(() => emptyAnswers());
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(null);
  const [score, setScore] = useState<ScoreResult | null>(null);

  const activeEvent = round?.events[eventIndex];
  const selectedDrill = DRILLS.find((d) => d.id === drill) ?? DRILLS[0];

  useEffect(() => {
    if (!round) return;
    if (phase === "flash") {
      const t = window.setTimeout(() => {
        if (eventIndex >= round.events.length - 1) {
          setPhase("quiz");
          setQuizStartedAt(Date.now());
        } else {
          setPhase("gap");
        }
      }, settings.displayMs);
      return () => window.clearTimeout(t);
    }
    if (phase === "gap") {
      const t = window.setTimeout(() => {
        setEventIndex((i) => i + 1);
        setPhase("flash");
      }, settings.gapMs);
      return () => window.clearTimeout(t);
    }
  }, [eventIndex, phase, round, settings.displayMs, settings.gapMs]);

  function startRound() {
    const next = generateRound(drill, settings.eventCount);
    setRound(next);
    setEventIndex(0);
    setAnswers(emptyAnswers());
    setScore(null);
    setQuizStartedAt(null);
    setPhase("intro");
  }

  function beginFlash() {
    setEventIndex(0);
    setPhase("flash");
  }

  function submitQuiz() {
    if (!round) return;
    const elapsed = quizStartedAt ? Date.now() - quizStartedAt : 60_000;
    setScore(scoreRound(round, answers, settings, elapsed));
    setPhase("review");
  }

  function updateAnswer<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="arena-shell">
      <Topline title="Trader Memory Arena" onExit={onExit} right={<span className="cp-chip">compressed state drill</span>} />

      {phase === "setup" ? (
        <div className="memory-layout">
          <Panel className="prompt-panel">
            <PanelHead kicker="Working memory simulator" title="Flash event, update state, lose the tape" right={<BrainCircuit size={18} className="hint-icon" />} />
            <p className="prompt-text">
              Train the compressed trader state: position, fair value, marked PnL, and flow.
              Events disappear, then the checkpoint asks what matters for the next quote.
            </p>
            <div className="memory-mode-grid">
              {DRILLS.map((d) => (
                <button key={d.id} type="button" className={selectClass(drill === d.id)} onClick={() => setDrill(d.id)}>
                  <strong>{d.title}</strong>
                  <span>{d.blurb}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHead kicker="Flash settings" title="Make it feel like the interview" />
            <div className="memory-settings">
              <label>
                <span>Display time</span>
                <select value={settings.displayMs} onChange={(e) => setSettings((s) => ({ ...s, displayMs: Number(e.target.value) }))}>
                  {[3000, 2000, 1500, 1000, 750].map((ms) => <option key={ms} value={ms}>{ms / 1000}s</option>)}
                </select>
              </label>
              <label>
                <span>Gap</span>
                <select value={settings.gapMs} onChange={(e) => setSettings((s) => ({ ...s, gapMs: Number(e.target.value) }))}>
                  {[1000, 500, 0].map((ms) => <option key={ms} value={ms}>{ms === 0 ? "instant" : `${ms / 1000}s`}</option>)}
                </select>
              </label>
              <label>
                <span>Events before quiz</span>
                <select value={settings.eventCount} onChange={(e) => setSettings((s) => ({ ...s, eventCount: Number(e.target.value) }))}>
                  {[3, 5, 8, 12].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label>
                <span>PnL tolerance</span>
                <select value={settings.pnlTolerance} onChange={(e) => setSettings((s) => ({ ...s, pnlTolerance: Number(e.target.value) }))}>
                  <option value={0}>exact</option>
                  <option value={2}>+/- 2</option>
                  <option value={5}>+/- 5</option>
                </select>
              </label>
              <label className="memory-check">
                <input type="checkbox" checked={settings.allowNotes} onChange={(e) => setSettings((s) => ({ ...s, allowNotes: e.target.checked }))} />
                <span>Allow notes, speed penalty if overused</span>
              </label>
            </div>
            <button className="arena-start" type="button" onClick={startRound}>
              <Play size={16} /> Start {selectedDrill.title}
            </button>
          </Panel>
        </div>
      ) : null}

      {phase === "intro" && round ? (
        <Panel className="memory-stage">
          <PanelHead kicker={round.title} title="Initial state" />
          <p className="prompt-text">{round.instructions}</p>
          <div className="memory-state-grid">
            <Stat label={round.markets.A.label} value={`FV ${fmt(round.markets.A.initialFv)}`} hint="q 0, M 0" />
            {round.asks.positionB ? <Stat label={round.markets.B.label} value={`FV ${fmt(round.markets.B.initialFv)}`} hint="q 0, M 0" /> : null}
            <Stat label="Events" value={String(round.events.length)} />
            <Stat label="Flash" value={`${settings.displayMs / 1000}s`} />
          </div>
          <button className="arena-start" type="button" onClick={beginFlash}>
            Begin disappearing events
          </button>
        </Panel>
      ) : null}

      {(phase === "flash" || phase === "gap") && round ? (
        <div className="memory-flash-wrap">
          <div className={`memory-flash-card ${phase === "gap" ? "blank" : ""}`}>
            {phase === "flash" && activeEvent ? (
              <>
                <span>{activeEvent.market === "A" ? round.markets.A.label : round.markets.B.label}</span>
                <strong>{activeEvent.text}</strong>
                <em>{eventIndex + 1} / {round.events.length}</em>
              </>
            ) : (
              <strong>Update mental state</strong>
            )}
          </div>
        </div>
      ) : null}

      {phase === "quiz" && round ? (
        <div className="memory-layout">
          <Panel className="prompt-panel">
            <PanelHead kicker="Checkpoint quiz" title="Answer from compressed state" />
            <div className="memory-quiz-grid">
              {round.asks.positionA ? (
                <label><span>{round.markets.A.label} position</span><input value={answers.positionA} onChange={(e) => updateAnswer("positionA", e.target.value)} inputMode="numeric" /></label>
              ) : null}
              {round.asks.pnlA ? (
                <label><span>{round.markets.A.label} marked PnL</span><input value={answers.pnlA} onChange={(e) => updateAnswer("pnlA", e.target.value)} inputMode="decimal" /></label>
              ) : null}
              {round.asks.positionB ? (
                <label><span>{round.markets.B.label} position</span><input value={answers.positionB} onChange={(e) => updateAnswer("positionB", e.target.value)} inputMode="numeric" /></label>
              ) : null}
              {round.asks.pnlB ? (
                <label><span>{round.markets.B.label} marked PnL</span><input value={answers.pnlB} onChange={(e) => updateAnswer("pnlB", e.target.value)} inputMode="decimal" /></label>
              ) : null}
            </div>

            {settings.allowNotes ? (
              <label className="memory-notes">
                <span>Notes</span>
                <textarea value={answers.notes} onChange={(e) => updateAnswer("notes", e.target.value)} placeholder="Use sparingly. Compressed state beats tape reconstruction." />
              </label>
            ) : null}

            <button className="arena-start" type="button" onClick={submitQuiz}>
              Submit checkpoint
            </button>
          </Panel>

          <Panel>
            <PanelHead kicker="Trading questions" title="What should your next quote do?" />
            {round.asks.flow ? (
              <ChoiceGroup label="Recent flow" value={answers.flow} options={["buy-heavy", "sell-heavy", "balanced"]} onChange={(v) => updateAnswer("flow", v as FlowRead)} />
            ) : null}
            {round.asks.fvDirection ? (
              <ChoiceGroup label="Fair value update" value={answers.fvDirection} options={["up", "down", "stay"]} onChange={(v) => updateAnswer("fvDirection", v as Direction)} />
            ) : null}
            {round.asks.quoteMove ? (
              <ChoiceGroup label="Next quote move" value={answers.quoteMove} options={["up", "down", "stay"]} onChange={(v) => updateAnswer("quoteMove", v as Direction)} />
            ) : null}
            {round.asks.widthMove ? (
              <ChoiceGroup label="Width" value={answers.widthMove} options={["widen", "tighten", "keep"]} onChange={(v) => updateAnswer("widthMove", v as WidthMove)} />
            ) : null}
            {round.asks.worry ? (
              <ChoiceGroup label="Main risk" value={answers.worry} options={["inventory", "adverse selection", "balanced"]} onChange={(v) => updateAnswer("worry", v as Worry)} />
            ) : null}
            {round.asks.toxicMarket ? (
              <ChoiceGroup label="More toxic market" value={answers.toxicMarket} options={["A", "B"]} onChange={(v) => updateAnswer("toxicMarket", v as MarketKey)} />
            ) : null}
            <label className="memory-notes">
              <span>What mistake would a bad trader make?</span>
              <textarea value={answers.mistake} onChange={(e) => updateAnswer("mistake", e.target.value)} placeholder="Example: keep quoting stale FV, ignore inventory, or chase exact tape." />
            </label>
          </Panel>
        </div>
      ) : null}

      {phase === "review" && round && score ? (
        <div className="play-grid">
          <Panel className="prompt-panel">
            <PanelHead kicker="Post-game review" title="Final compressed state" />
            <div className="headline-score">
              <span>Score</span>
              <strong className={score.score >= 70 ? "pos" : "neg"}>{score.score}</strong>
            </div>
            <div className="stat-grid">
              <Stat label="Position" value={`${score.position} / 30`} tone="accent" />
              <Stat label="PnL" value={`${score.pnl} / 20`} />
              <Stat label="FV read" value={`${score.fv} / 20`} />
              <Stat label="Quote" value={`${score.quote} / 20`} />
              <Stat label="Speed" value={`${score.speed} / 10`} tone={score.notesPenalty ? "warn" : "good"} />
              <Stat label="Hidden true" value={round.hiddenTrue === undefined ? "." : fmt(round.hiddenTrue)} />
            </div>
            <div className="lesson good">
              <strong>Correct trader state</strong>
              <p>
                A: q {fmtSigned(round.expected.positionA)}, M {fmtSigned(round.expected.pnlA)}.
                {round.asks.positionB ? ` B: q ${fmtSigned(round.expected.positionB)}, M ${fmtSigned(round.expected.pnlB)}.` : ""}
                {" "}Flow {round.expected.flow}; quote should move {round.expected.quoteMove} and {round.expected.widthMove}.
              </p>
            </div>
            <div className="result-actions">
              <button className="ghost-btn" type="button" onClick={() => setPhase("setup")}>Settings</button>
              <button className="arena-start compact" type="button" onClick={startRound}>
                <RefreshCcw size={16} /> Run again
              </button>
            </div>
          </Panel>

          <Panel>
            <PanelHead kicker="Hidden full log" title="Correct mental updates" />
            <div className="memory-review-list">
              {round.review.map((r, i) => (
                <div key={i}>
                  <span>{r.event}</span>
                  <strong>{r.update}</strong>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="memory-choice-group">
      <span>{label}</span>
      <div>
        {options.map((option) => (
          <button key={option} type="button" className={value === option ? "active" : ""} onClick={() => onChange(option)}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
