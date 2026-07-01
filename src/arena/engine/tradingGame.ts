// The taker side market making game. A market maker shows a random two sided
// quote on the sum of a hidden set of cards or dice. The player trades against
// it (buy at the ask, sell at the bid), using expected value and the face up
// units to beat the maker. Optional market events reshape the deck for a round.

export type TradeSource = "cards" | "dice";
export type UnitColor = "red" | "black";

export type TradeUnit = {
  faceUp: boolean;
  /** This round value used in the sum (may be remapped by an event). */
  value: number;
  /** Face label, e.g. "A" + suit for cards, or the die pip count. */
  faceLabel: string;
  suit?: string;
  color?: UnitColor;
};

export type MarketEvent = { id: string; label: string };

export type TradeRound = {
  source: TradeSource;
  units: TradeUnit[];
  event: MarketEvent | null;
  hiddenCount: number;
  trueSum: number;
  /** Fair value: EV of the total sum given the face up units and the event. */
  fair: number;
  minSum: number;
  maxSum: number;
  quote: { bid: number; ask: number };
};

const SUITS: Array<{ symbol: string; color: UnitColor }> = [
  { symbol: "♠", color: "black" }, // spades
  { symbol: "♣", color: "black" }, // clubs
  { symbol: "♥", color: "red" }, // hearts
  { symbol: "♦", color: "red" }, // diamonds
];

function rankLabel(v: number): string {
  if (v <= 10) return String(v);
  return { 11: "J", 12: "Q", 13: "K", 14: "A" }[v] ?? String(v);
}

function randInt(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function pick<T>(xs: T[]): T {
  return xs[randInt(0, xs.length - 1)];
}

function shuffle<T>(xs: T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// --- events ---------------------------------------------------------------

type CardBase = { baseValue: number; suit: string; color: UnitColor };

function fullCardDeck(): CardBase[] {
  const deck: CardBase[] = [];
  for (let v = 2; v <= 14; v++) {
    for (const s of SUITS) deck.push({ baseValue: v, suit: s.symbol, color: s.color });
  }
  return deck;
}

/** Pick a card market event and return the filtered deck plus its this round value. */
function cardEventDeck(): { event: MarketEvent | null; deck: Array<CardBase & { value: number }> } {
  const base = fullCardDeck();
  const roll = Math.random();
  const withValue = (d: CardBase[], value: (c: CardBase) => number) =>
    d.map((c) => ({ ...c, value: value(c) }));

  if (roll < 0.14) {
    return { event: null, deck: withValue(base, (c) => c.baseValue) };
  }
  const choice = randInt(0, 6);
  if (choice === 0) {
    const rank = randInt(2, 14);
    const newValue = randInt(10, 20);
    return {
      event: { id: "remap", label: `${rankLabel(rank)}s are worth ${newValue} this round` },
      deck: withValue(base, (c) => (c.baseValue === rank ? newValue : c.baseValue)),
    };
  }
  if (choice === 1) {
    return { event: { id: "ge10", label: "Only cards worth 10 or more this round" }, deck: withValue(base.filter((c) => c.baseValue >= 10), (c) => c.baseValue) };
  }
  if (choice === 2) {
    return { event: { id: "le7", label: "Only cards worth 7 or less this round" }, deck: withValue(base.filter((c) => c.baseValue <= 7), (c) => c.baseValue) };
  }
  if (choice === 3) {
    return { event: { id: "even", label: "Only even cards this round" }, deck: withValue(base.filter((c) => c.baseValue % 2 === 0), (c) => c.baseValue) };
  }
  if (choice === 4) {
    return { event: { id: "odd", label: "Only uneven cards this round" }, deck: withValue(base.filter((c) => c.baseValue % 2 === 1), (c) => c.baseValue) };
  }
  if (choice === 5) {
    return { event: { id: "red", label: "Only red cards this round" }, deck: withValue(base.filter((c) => c.color === "red"), (c) => c.baseValue) };
  }
  return { event: { id: "black", label: "Only black cards this round" }, deck: withValue(base.filter((c) => c.color === "black"), (c) => c.baseValue) };
}

/** Allowed die face values for this round, plus the event. */
function diceEventFaces(): { event: MarketEvent | null; values: number[] } {
  const all = [1, 2, 3, 4, 5, 6];
  if (Math.random() < 0.16) return { event: null, values: all };
  const choice = randInt(0, 5);
  if (choice === 0) return { event: { id: "high", label: "Only dice showing 5 or 6 this round" }, values: [5, 6] };
  if (choice === 1) return { event: { id: "low", label: "Only dice showing 1 or 2 this round" }, values: [1, 2] };
  if (choice === 2) return { event: { id: "ends", label: "Only dice showing 1 and 6 this round" }, values: [1, 6] };
  if (choice === 3) return { event: { id: "even", label: "Only dice showing even numbers this round" }, values: [2, 4, 6] };
  if (choice === 4) return { event: { id: "odd", label: "Only dice showing odd numbers this round" }, values: [1, 3, 5] };
  return { event: { id: "one7", label: "A dice showing 1 is worth 7 this round" }, values: [7, 2, 3, 4, 5, 6] };
}

// --- round generation -----------------------------------------------------

export function generateTradeRound(source: TradeSource, count: number, eventsEnabled: boolean): TradeRound {
  const hiddenCount = randInt(1, count);
  const faceUpCount = count - hiddenCount;

  let units: TradeUnit[];
  let event: MarketEvent | null = null;
  let allowedValues: number[]; // per unit possible values (for min/max/mean)

  if (source === "cards") {
    const { event: ev, deck } = eventsEnabled ? cardEventDeck() : { event: null, deck: fullCardDeck().map((c) => ({ ...c, value: c.baseValue })) };
    event = ev;
    const drawn = shuffle(deck).slice(0, count);
    allowedValues = deck.map((c) => c.value);
    units = drawn.map((c, i) => ({
      faceUp: i < faceUpCount,
      value: c.value,
      faceLabel: `${rankLabel(c.baseValue)}${c.suit}`,
      suit: c.suit,
      color: c.color,
    }));
  } else {
    const { event: ev, values } = eventsEnabled ? diceEventFaces() : { event: null, values: [1, 2, 3, 4, 5, 6] };
    event = ev;
    allowedValues = values;
    units = Array.from({ length: count }, (_, i) => {
      const value = pick(values);
      return { faceUp: i < faceUpCount, value, faceLabel: String(value) };
    });
  }

  // Face-up units are locked. Estimate the hidden ones from the allowed pool.
  const faceUp = units.filter((u) => u.faceUp);
  const faceUpSum = faceUp.reduce((a, u) => a + u.value, 0);
  const perUnitMean = mean(allowedValues);
  const minVal = Math.min(...allowedValues);
  const maxVal = Math.max(...allowedValues);

  const trueSum = units.reduce((a, u) => a + u.value, 0);
  const fair = Math.round(faceUpSum + hiddenCount * perUnitMean);
  const minSum = faceUpSum + hiddenCount * minVal;
  const maxSum = faceUpSum + hiddenCount * maxVal;

  const quote = makeQuote(fair, minSum, maxSum, source);

  return { source, units, event, hiddenCount, trueSum, fair, minSum, maxSum, quote };
}

function makeQuote(fair: number, minSum: number, maxSum: number, source: TradeSource): { bid: number; ask: number } {
  const noiseAmp = Math.max(3, Math.round((maxSum - minSum) / 4));
  const halfSpread = randInt(1, source === "cards" ? 3 : 2);
  const mid = fair + randInt(-noiseAmp, noiseAmp);
  const bid = Math.max(0, mid - halfSpread);
  const ask = Math.max(bid + 1, mid + halfSpread);
  return { bid, ask };
}

// --- trading math ---------------------------------------------------------

export type Side = "buy" | "sell";

/** PnL of a taker order once the market price (true sum) settles. */
export function tradePnl(side: Side, units: number, quote: { bid: number; ask: number }, price: number): number {
  if (units <= 0) return 0;
  return side === "buy" ? (price - quote.ask) * units : (quote.bid - price) * units;
}

/** Most units you can buy: you must be able to afford the purchase. */
export function maxBuyUnits(balance: number, ask: number): number {
  if (ask <= 0) return 0;
  return Math.floor(balance / ask);
}

/** Most units you can sell: your balance must cover the worst case loss. */
export function maxSellUnits(balance: number, bid: number, maxSum: number): number {
  const worstPerUnit = Math.max(1, maxSum - bid);
  return Math.floor(balance / worstPerUnit);
}

/** Whether an order is affordable under the budget rules. */
export function isValidOrder(side: Side, units: number, balance: number, quote: { bid: number; ask: number }, maxSum: number): boolean {
  if (!Number.isInteger(units) || units <= 0) return false;
  return side === "buy"
    ? units <= maxBuyUnits(balance, quote.ask)
    : units <= maxSellUnits(balance, quote.bid, maxSum);
}
