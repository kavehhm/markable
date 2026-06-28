import { Concept, FlowBias, InterviewCase, PrepProblem, QuoteChoice, QuoteScenario, Volatility } from "./types";
import { clamp, roundTick, tickSize } from "./marketMath";

const newsTape = [
  "Institutional buyer is sweeping offers in correlated names.",
  "Event risk faded after the announcement came in-line.",
  "Large passive seller keeps refreshing the best ask.",
  "Macro print is due soon; depth is thinning near the touch.",
  "Arb desk reports the ETF is rich versus the basket.",
  "Retail flow is one-sided but uninformed.",
  "A venue outage just reduced displayed liquidity.",
  "Options dealer hedging is creating persistent bid demand.",
];

const flows: FlowBias[] = ["sell pressure", "balanced flow", "buy pressure"];
const vols: Volatility[] = ["quiet", "normal", "jumpy"];

function pick<T>(items: T[], index: number) {
  return items[index % items.length];
}

function flowTilt(flow: FlowBias) {
  if (flow === "buy pressure") return 0.04;
  if (flow === "sell pressure") return -0.04;
  return 0;
}

function volWidth(volatility: Volatility) {
  if (volatility === "quiet") return 0.08;
  if (volatility === "jumpy") return 0.18;
  return 0.12;
}

function rotateQuoteChoices(choices: QuoteChoice[], index: number) {
  const shift = (index * 2 + 1) % choices.length;
  return [...choices.slice(shift), ...choices.slice(0, shift)];
}

export function makeQuoteScenario(index: number): QuoteScenario {
  const volatility = pick(vols, index + Math.floor(index / 3));
  const flow = pick(flows, index * 2 + 1);
  const news = pick(newsTape, index);
  const newsIndex = index % newsTape.length;
  const fair = roundTick(99.5 + ((index * 17) % 29) * 0.07 + Math.sin(index * 0.8) * 0.22);
  const inventory = ((index * 5) % 23) - 11;
  const positionLimit = 15;
  const bookImbalance = clamp(0.5 + flowTilt(flow) * 4 - inventory * 0.018 + Math.sin(index) * 0.12, 0.18, 0.82);
  const width = volWidth(volatility);
  const inventorySkew = -(inventory / positionLimit) * 0.09;
  const pressureSkew = flowTilt(flow);
  const correctCenter = fair + inventorySkew + pressureSkew;
  const touchBid = roundTick(fair - 0.04);
  const touchAsk = roundTick(fair + 0.04);
  let bid = roundTick(correctCenter - width);
  let ask = roundTick(correctCenter + width);

  if (inventory < -5) {
    bid = Math.max(bid, roundTick(touchBid + tickSize));
    ask = Math.max(ask, roundTick(Math.max(touchAsk + tickSize * 2, bid + tickSize * 3)));
  }

  if (inventory > 5) {
    ask = Math.min(ask, roundTick(touchAsk - tickSize));
    bid = Math.min(bid, roundTick(Math.min(touchBid - tickSize * 2, ask - tickSize * 3)));
  }

  const defensiveId = inventory > 5 ? "reduce-long" : inventory < -5 ? "reduce-short" : "balanced-edge";
  const highInformationRisk =
    volatility === "jumpy" && (newsIndex === 3 || newsIndex === 6 || Math.abs(bookImbalance - 0.5) > 0.22 || Math.abs(inventory) > 8);
  const lowRiskCompetitive =
    !highInformationRisk &&
    Math.abs(inventory) <= 3 &&
    (volatility === "quiet" || newsIndex === 5) &&
    Math.abs(bookImbalance - 0.5) < 0.22;
  const correctChoiceId = highInformationRisk ? "too-wide" : lowRiskCompetitive ? "top-of-book" : defensiveId;
  const choices: QuoteChoice[] = [
    {
      id: "top-of-book",
      label: "Join The Touch",
      bid: touchBid,
      ask: touchAsk,
      rationale: "Competitive when fair value is stable, inventory is manageable, and flow does not look toxic.",
    },
    {
      id: defensiveId,
      label: inventory > 5 ? "Lean Offer" : inventory < -5 ? "Lean Bid" : "Risk-Adjusted",
      bid,
      ask,
      rationale:
        inventory > 5
          ? "Lower the ask to sell inventory and lower the bid so you buy less."
          : inventory < -5
            ? "Raise the bid so sellers can hit you, while keeping the ask less attractive so you do not get shorter."
            : "Price around fair with width matched to volatility and flow pressure.",
    },
    {
      id: "too-wide",
      label: "Step Away",
      bid: roundTick(fair - width - 0.2),
      ask: roundTick(fair + width + 0.2),
      rationale: "Best when information risk is extreme and avoiding a stale fill matters more than fill rate.",
    },
  ];

  return {
    id: index,
    fair,
    inventory,
    positionLimit,
    volatility,
    flow,
    bookImbalance,
    news,
    correctChoiceId,
    choices: rotateQuoteChoices(choices, index),
  };
}

export const conceptCards: Concept[] = [
  {
    title: "Microprice",
    tag: "order book",
    prompt: "When is the midprice too naive?",
    answer:
      "When best bid and ask queues are imbalanced. Microprice leans toward the side with less displayed depth because that side is more likely to be consumed next.",
  },
  {
    title: "Inventory Skew",
    tag: "quoting",
    prompt: "You are long inventory. Which way should your quote move?",
    answer:
      "Lower the center of your quote: make your bid less attractive and your ask more attractive so sells to you slow down and buys from you speed up.",
  },
  {
    title: "Adverse Selection",
    tag: "risk",
    prompt: "Why can earning the spread still lose money?",
    answer:
      "If toxic flow hits your stale quotes before the market moves, you buy right before fair value falls or sell right before fair value rises.",
  },
  {
    title: "Queue Priority",
    tag: "execution",
    prompt: "Why does joining the best price not guarantee a fill?",
    answer:
      "Displayed size ahead of you must trade first. Time priority means the same price can have very different execution value depending on queue position.",
  },
  {
    title: "Spread Width",
    tag: "quoting",
    prompt: "What should make you widen?",
    answer:
      "Higher volatility, uncertain fair value, lower depth, and more informed or one-sided flow. Widening trades off fill rate for lower adverse-selection risk.",
  },
  {
    title: "Order Book Imbalance",
    tag: "signal",
    prompt: "What does bid-heavy depth often suggest?",
    answer:
      "Near-term upward pressure, but only if the depth is real and persistent. Spoofing, hidden liquidity, and venue-specific behavior can weaken the signal.",
  },
];

function money(value: number) {
  return value.toFixed(2);
}

function choiceSet(correct: number, unit = "", precision = 2, step = 0.25, salt = 0) {
  const offsets = [-step, 0, step, step * 2.2];
  const choices = offsets.map((offset, index) => {
    const value = correct + offset;
    return {
      id: index === 1 ? "correct" : `choice-${index}`,
      label: `${value.toFixed(precision)}${unit}`,
    };
  });
  const shift = salt % choices.length;
  return [...choices.slice(shift), ...choices.slice(0, shift)];
}

export function makeProbabilityProblem(index: number): PrepProblem {
  const variant = index % 3;

  if (variant === 0) {
    const upProbability = 0.52 + ((index * 7) % 18) / 100;
    const upFair = 101 + (index % 4) * 0.25;
    const downFair = 99 - (index % 3) * 0.2;
    const fair = upProbability * upFair + (1 - upProbability) * downFair;

    return {
      id: index,
      title: "Bayesian Fair Update",
      tag: "probability",
      prompt: "A signal says the asset is more likely in the high state. What fair value should anchor your quote?",
      givens: [`High state: ${money(upFair)}`, `Low state: ${money(downFair)}`, `Signal probability high: ${Math.round(upProbability * 100)}%`],
      correctChoiceId: "correct",
      choices: choiceSet(fair, "", 2, 0.25, index),
      explanation: `Fair value is the probability-weighted average: ${Math.round(upProbability * 100)}% of ${money(upFair)} plus ${Math.round((1 - upProbability) * 100)}% of ${money(downFair)}.`,
    };
  }

  if (variant === 1) {
    const spreadCapture = 0.08 + (index % 4) * 0.02;
    const toxicProbability = 0.22 + ((index * 5) % 14) / 100;
    const adverseMove = 0.28 + (index % 5) * 0.04;
    const edge = spreadCapture - toxicProbability * adverseMove;

    return {
      id: index,
      title: "Fill Quality EV",
      tag: "adverse selection",
      prompt: "Estimate the expected edge per fill before deciding whether to stay tight.",
      givens: [`Spread capture if benign: ${money(spreadCapture)}`, `Toxic fill probability: ${Math.round(toxicProbability * 100)}%`, `Adverse move if toxic: ${money(adverseMove)}`],
      correctChoiceId: "correct",
      choices: choiceSet(edge, "", 2, 0.05, index),
      explanation: `Expected edge is spread capture minus toxic probability times adverse move: ${money(spreadCapture)} - ${Math.round(toxicProbability * 100)}% x ${money(adverseMove)}.`,
    };
  }

  const bidSize = 80 + (index % 5) * 20;
  const askSize = 40 + ((index * 3) % 5) * 15;
  const bid = 99.95;
  const ask = 100.05;
  const micro = (ask * bidSize + bid * askSize) / (bidSize + askSize);

  return {
    id: index,
    title: "Microprice Probability",
    tag: "order book",
    prompt: "The best bid queue is larger than the best ask queue. What microprice should you expect?",
    givens: [`Best bid: ${money(bid)} x ${bidSize}`, `Best ask: ${money(ask)} x ${askSize}`, "Use queue-weighted microprice"],
    correctChoiceId: "correct",
    choices: choiceSet(micro, "", 2, 0.05, index),
    explanation: "Microprice weights the ask by bid size and the bid by ask size, so a larger bid queue pulls fair value upward.",
  };
}

export function makeMentalMathProblem(index: number): PrepProblem {
  const variant = index % 3;

  if (variant === 0) {
    const price = 48 + (index % 6) * 7;
    const shares = 2000 + (index % 5) * 500;
    const bps = 3 + (index % 4) * 2;
    const dollars = price * shares * (bps / 10000);

    return {
      id: index,
      title: "Bps To Dollars",
      tag: "mental math",
      prompt: "Convert edge in basis points into dollars of PnL.",
      givens: [`Price: ${money(price)}`, `Size: ${shares.toLocaleString()} shares`, `Edge: ${bps} bps`],
      correctChoiceId: "correct",
      choices: choiceSet(dollars, "", 0, Math.max(10, Math.round(dollars * 0.18)), index),
      explanation: `Dollars = price x shares x bps / 10,000 = ${money(price)} x ${shares.toLocaleString()} x ${bps} / 10,000.`,
    };
  }

  if (variant === 1) {
    const limit = 25000 + (index % 4) * 5000;
    const priceMove = 0.4 + (index % 5) * 0.1;
    const shares = Math.round(limit / priceMove / 100) * 100;

    return {
      id: index,
      title: "Risk Limit Sizing",
      tag: "risk",
      prompt: "How many shares can you hold before a fair-value move uses the full loss limit?",
      givens: [`Loss limit: $${limit.toLocaleString()}`, `Stress move: ${money(priceMove)}`, "Round to nearest 100 shares"],
      correctChoiceId: "correct",
      choices: choiceSet(shares, "", 0, Math.max(500, Math.round(shares * 0.12 / 100) * 100), index),
      explanation: `Size is loss limit divided by stress move: ${limit.toLocaleString()} / ${money(priceMove)}, rounded to the nearest 100.`,
    };
  }

  const bid = 100 - (index % 3) * 0.05;
  const ask = 100.2 + (index % 4) * 0.05;
  const lots = 8 + (index % 6);
  const gross = (ask - bid) * lots * 100;

  return {
    id: index,
    title: "Spread Capture",
    tag: "execution math",
    prompt: "You buy the bid and sell the ask for this many lots. What gross spread do you capture?",
    givens: [`Bid: ${money(bid)}`, `Ask: ${money(ask)}`, `Lots: ${lots} x 100 shares`],
    correctChoiceId: "correct",
    choices: choiceSet(gross, "", 0, Math.max(10, Math.round(gross * 0.2)), index),
    explanation: `Spread capture is (${money(ask)} - ${money(bid)}) x ${lots * 100} shares.`,
  };
}

export const interviewCases: InterviewCase[] = [
  {
    id: 1,
    title: "Stale Quote After News",
    focus: "adverse selection",
    setup: "You are quoting 99.95 / 100.05. A fast customer buys your ask right after correlated futures jump.",
    question: "What is the best first response?",
    correctChoiceId: "pull-reprice",
    choices: [
      { id: "pull-reprice", label: "Pull and reprice", detail: "Assume your old fair value is stale until you update the signal." },
      { id: "tighten", label: "Tighten both sides", detail: "This increases fill risk when information quality just worsened." },
      { id: "double-size", label: "Double size", detail: "You would be adding exposure into toxic flow." },
    ],
    explanation: "The fill is informative. First update fair value and toxicity, then decide whether the new spread compensates you.",
  },
  {
    id: 2,
    title: "Long Inventory Into Sell Flow",
    focus: "inventory skew",
    setup: "You are long 12 units with a 15-unit soft limit. The tape is mostly sellers and bid depth is fading.",
    question: "Which quoting posture is most defensible?",
    correctChoiceId: "lean-offer",
    choices: [
      { id: "lean-offer", label: "Lean lower / offer more", detail: "Reduce the chance of buying more and make it easier to sell." },
      { id: "join-bid", label: "Join the best bid", detail: "This invites more long inventory near your limit." },
      { id: "ignore-inv", label: "Quote symmetric", detail: "Symmetric quotes ignore the state variable that can force liquidation." },
    ],
    explanation: "When inventory and flow point the same dangerous way, skew aggressively and consider widening the bid.",
  },
  {
    id: 3,
    title: "Huge Bid Queue",
    focus: "queue priority",
    setup: "The best bid is 200k shares deep, best ask is 20k, and recent market orders are small.",
    question: "What should you be careful about before joining the bid?",
    correctChoiceId: "queue-value",
    choices: [
      { id: "queue-value", label: "Queue value may be low", detail: "You can be at a good price but very far back in time priority." },
      { id: "instant-fill", label: "You will fill instantly", detail: "Large size ahead of you usually means the opposite." },
      { id: "ignore-imbalance", label: "Imbalance never matters", detail: "It can matter, but queue position changes execution value." },
    ],
    explanation: "A strong bid can signal pressure, but joining behind a massive queue may produce little immediate execution.",
  },
  {
    id: 4,
    title: "Wide Market Request",
    focus: "interview quoting",
    setup: "An interviewer asks for a two-sided market in an unknown value game. You know your estimate is noisy.",
    question: "What should your first quote optimize?",
    correctChoiceId: "honest-wide",
    choices: [
      { id: "honest-wide", label: "Honest width around fair", detail: "Show uncertainty, then tighten as information improves." },
      { id: "penny-wide", label: "One-penny spread", detail: "This signals fake confidence and invites adverse selection." },
      { id: "no-market", label: "Refuse to quote", detail: "Interviews usually test how you manage uncertainty, not certainty." },
    ],
    explanation: "A good market maker can quote under uncertainty by widening, sizing down, and updating quickly.",
  },
];
