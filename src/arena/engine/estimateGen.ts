// Generators for the static fair value bank (fvSprint). Each question is an
// English prompt plus a known mean. To make a real market on one we need a
// runnable process that draws a single realized settlement, so the informed
// counterparty has a true value to trade against. This file encodes that
// process per question. Questions with no clean generator settle at their known
// fair value (deterministic). The in game fair value is the Monte Carlo mean of
// the generator, so everything stays self consistent.

type Suit = "S" | "C" | "H" | "D";
type Card = { v: number; suit: Suit };

const R = Math.random;
const rint = (lo: number, hi: number) => lo + Math.floor(R() * (hi - lo + 1));
const die = () => rint(1, 6);
const rollN = (n: number) => Array.from({ length: n }, die);
const flips = (n: number) => Array.from({ length: n }, () => R() < 0.5);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const prod = (xs: number[]) => xs.reduce((a, b) => a * b, 1);
const sq = (x: number) => x * x;
const isRed = (c: Card) => c.suit === "H" || c.suit === "D";

function baseDeck(): Card[] {
  const d: Card[] = [];
  for (let v = 2; v <= 14; v++) {
    d.push({ v, suit: "S" }, { v, suit: "C" }, { v, suit: "H" }, { v, suit: "D" });
  }
  return d;
}

/** Deal n cards (plus any face up), with optional deck filter and value remap. */
function deal(
  n: number,
  opts?: { filter?: (c: Card) => boolean; faceUp?: number[]; map?: (v: number) => number },
): { cards: Card[]; val: (c: Card) => number } {
  let deck = baseDeck();
  if (opts?.filter) deck = deck.filter(opts.filter);
  const up: Card[] = [];
  for (const fv of opts?.faceUp ?? []) {
    const i = deck.findIndex((c) => c.v === fv);
    if (i >= 0) {
      up.push(deck[i]);
      deck.splice(i, 1);
    }
  }
  const drawn: Card[] = [];
  for (let k = 0; k < n && deck.length; k++) {
    const i = Math.floor(R() * deck.length);
    drawn.push(deck[i]);
    deck.splice(i, 1);
  }
  const map = opts?.map ?? ((v: number) => v);
  return { cards: [...up, ...drawn], val: (c) => map(c.v) };
}

function values(n: number, opts?: Parameters<typeof deal>[1]): number[] {
  const { cards, val } = deal(n, opts);
  return cards.map(val);
}

const counts = (xs: number[]) => {
  const m = new Map<number, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
};
const pairsFrom = (m: Map<number, number>) => {
  let p = 0;
  for (const k of m.values()) p += (k * (k - 1)) / 2;
  return p;
};
const bin = (cond: boolean) => (cond ? 100 : 0);

// waiting-process simulators
function untilFirst(hit: () => boolean): number {
  let c = 0;
  while (true) {
    c++;
    if (hit()) return c;
  }
}
function untilTwoConsecutive(hit: () => boolean): number {
  let c = 0;
  let prev = false;
  while (true) {
    c++;
    const now = hit();
    if (now && prev) return c;
    prev = now;
  }
}
function untilAllFaces(target: number[]): number {
  const seen = new Set<number>();
  let c = 0;
  while (target.some((f) => !seen.has(f))) {
    c++;
    seen.add(die());
  }
  return c;
}
function cardsUntil(pred: (c: Card) => boolean): number {
  const deck = baseDeck();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  for (let i = 0; i < deck.length; i++) if (pred(deck[i])) return i + 1;
  return deck.length;
}
function coinUntilHT(): number {
  let c = 0;
  let prevH = false;
  while (true) {
    c++;
    const h = R() < 0.5;
    if (prevH && !h) return c;
    prevH = h;
  }
}
function diceUntilRepeat(): number {
  const seen = new Set<number>();
  let c = 0;
  while (true) {
    c++;
    const f = die();
    if (seen.has(f)) return c;
    seen.add(f);
  }
}

/** id -> one realized settlement of the described process. */
const GEN: Record<number, () => number> = {
  // Sums
  1: () => sum(values(5)),
  2: () => sum(values(7)),
  3: () => sum(rollN(4)),
  4: () => sum(rollN(10)),
  5: () => sum(values(3)) + sum(rollN(2)),
  6: () => sum(values(4, { faceUp: [14, 10] })),
  7: () => sum(values(2, { faceUp: [2, 3, 12] })),
  8: () => sum(values(5, { faceUp: [9, 9, 14] })),
  9: () => sum(values(4, { filter: (c) => c.v >= 10 })),
  10: () => sum(values(4, { filter: (c) => c.v <= 7, faceUp: [7, 2] })),
  11: () => sum(values(3, { filter: (c) => c.v % 2 === 0, faceUp: [14, 4] })),
  12: () => sum(values(3, { filter: isRed, faceUp: [14, 2] })),
  13: () => sum(values(4, { map: (v) => (v === 11 ? 20 : v) })),
  14: () => sum(values(5, { map: (v) => (v === 2 ? 10 : v) })),
  15: () => sum(values(5, { map: (v) => (v === 14 ? 5 : v) })),
  16: () => sum(values(4, { faceUp: [14, 13, 12] })),
  17: () => sum(values(3, { filter: (c) => c.v % 2 === 1, faceUp: [13, 3] })),
  18: () => sum(values(4, { filter: (c) => c.v >= 10, faceUp: [14, 13] })),
  19: () => sum(values(1, { faceUp: [14] })),
  20: () => sum(values(3, { faceUp: [8] })),
  // Counts
  21: () => flips(20).filter(Boolean).length,
  22: () => rollN(18).filter((d) => d === 6).length,
  23: () => deal(10).cards.filter(isRed).length,
  24: () => values(13).filter((v) => v === 14).length,
  25: () => values(5).filter((v) => v >= 10).length,
  26: () => values(7).filter((v) => v % 2 === 0).length,
  27: () => deal(8).cards.filter((c) => c.suit === "S").length,
  28: () => pairsFrom(counts(values(5))),
  29: () => pairsFrom(counts(rollN(6))),
  30: () => new Set(rollN(4)).size,
  31: () => new Set(values(5)).size,
  32: () => deal(10).cards.filter((c) => c.v === 13 && (c.suit === "S" || c.suit === "C")).length,
  33: () => { const c = flips(12); let n = 0; for (let i = 0; i < c.length - 1; i++) if (c[i] && !c[i + 1]) n++; return n; },
  34: () => { const c = flips(10); let r = 0; for (let i = 0; i < c.length; i++) if (c[i] && (i === 0 || !c[i - 1])) r++; return r; },
  35: () => { let n = 0; for (const k of counts(values(6)).values()) if (k === 2) n++; return n; },
  // Binary (pays 100)
  36: () => bin(values(5).some((v) => v === 14)),
  37: () => bin(values(5).filter((v) => v === 14).length === 1),
  38: () => bin(sum(rollN(2)) >= 10),
  39: () => bin(rollN(4).some((d) => d === 6)),
  40: () => { const c = flips(3); return bin(c.every((x) => x === c[0])); },
  41: () => bin(flips(5).filter(Boolean).length === 3),
  42: () => bin(deal(5).cards.every(isRed)),
  43: () => { const v = values(2); return bin(v[0] === v[1]); },
  44: () => bin(values(5).some((v) => v >= 10)),
  45: () => { const d = rollN(2); return bin(d[0] * d[1] > 20); },
  46: () => bin(Math.max(...rollN(3)) === 6),
  47: () => bin(values(5).filter((v) => v === 14).length === 2),
  48: () => bin(Math.max(...values(2)) >= 12),
  49: () => bin(sum(rollN(4)) === 14),
  50: () => { const m = counts(rollN(3)); return bin([...m.values()].some((k) => k >= 2)); },
  // Extremes
  51: () => Math.max(...rollN(2)),
  52: () => Math.max(...rollN(3)),
  53: () => Math.min(...rollN(2)),
  54: () => { const d = rollN(3); return Math.max(...d) - Math.min(...d); },
  55: () => { const d = rollN(4); return Math.max(...d) - Math.min(...d); },
  56: () => Math.max(...values(3)),
  57: () => Math.min(...values(3)),
  58: () => { const v = values(3); return Math.max(...v) - Math.min(...v); },
  59: () => { const v = values(5); return Math.max(...v) - Math.min(...v); },
  60: () => { const v = values(2); return Math.abs(v[0] - v[1]); },
  61: () => Math.max(...values(2)),
  62: () => Math.min(...values(2)),
  63: () => { const v = values(4, { filter: (c) => c.v >= 10 }); return Math.max(...v) - Math.min(...v); },
  64: () => Math.max(...values(4, { filter: (c) => c.v <= 7 })),
  65: () => { const v = Array.from({ length: 3 }, () => rint(2, 14)); return Math.max(...v) - Math.min(...v); },
  // Products
  66: () => prod(rollN(2)),
  67: () => prod(rollN(3)),
  68: () => prod(values(2)),
  69: () => prod(values(3)),
  70: () => sq(die()),
  71: () => sq(values(1)[0]),
  72: () => sq(sum(rollN(2))),
  73: () => { const d = rollN(2); return Math.abs(d[0] - d[1]); },
  74: () => sum(rollN(3).map(sq)),
  75: () => { const d = rollN(3); return Math.min(...d) * Math.max(...d); },
  76: () => sq(Math.max(...rollN(3))),
  77: () => sq(flips(10).filter(Boolean).length),
  78: () => sq(rollN(12).filter((d) => d === 6).length),
  79: () => prod(values(1, { faceUp: [14] })),
  80: () => sq(sum(values(3))),
  // Waiting
  81: () => untilFirst(() => R() < 0.5),
  82: () => untilFirst(() => die() === 6),
  83: () => untilTwoConsecutive(() => R() < 0.5),
  84: () => untilTwoConsecutive(() => die() === 6),
  85: () => untilAllFaces([1, 2, 3, 4, 5, 6]),
  86: () => untilAllFaces([2, 4, 6]),
  87: () => cardsUntil((c) => c.v === 14),
  88: () => cardsUntil(isRed),
  89: () => coinUntilHT(),
  90: () => diceUntilRepeat(),
  // Conditional
  91: () => sum(values(3, { filter: (c) => !isRed(c), faceUp: [14, 2] })),
  92: () => values(4, { faceUp: [14] }).filter((v) => v === 14).length,
  // Two known red cards are face up; draw 4 more and count red across all 6.
  93: () => {
    const deck = baseDeck().filter((c) => !(c.suit === "H" && c.v === 2) && !(c.suit === "D" && c.v === 3));
    const drawn: Card[] = [];
    for (let k = 0; k < 4; k++) {
      const i = Math.floor(R() * deck.length);
      drawn.push(deck[i]);
      deck.splice(i, 1);
    }
    return 2 + drawn.filter(isRed).length;
  },
  94: () => values(4, { faceUp: [13, 3] }).filter((v) => v >= 10).length,
  95: () => Math.max(2, ...rollN(2)),
  96: () => { const d = [6, 1, ...rollN(3)].sort((a, b) => b - a); return d[0] + d[1]; },
  97: () => sq(1 + flips(3).filter(Boolean).length),
  98: () => { const v = values(3, { faceUp: [14, 13] }); return Math.max(...v) - Math.min(...v); },
  99: () => { const v = values(3, { faceUp: [2, 14] }); return Math.max(...v) - Math.min(...v); },
  100: () => prod(values(2, { faceUp: [10] })),
};

export function simulatorForQuestion(id: number): (() => number) | null {
  return GEN[id] ?? null;
}

export type EstimateStats = { fair: number; std: number; min: number; max: number };

const statsCache = new Map<number, EstimateStats>();

function computeStats(sim: () => number, samples: number): EstimateStats {
  let total = 0;
  let totalSq = 0;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < samples; i++) {
    const y = sim();
    total += y;
    totalSq += y * y;
    if (y < min) min = y;
    if (y > max) max = y;
  }
  const mean = total / samples;
  const variance = Math.max(0, totalSq / samples - mean * mean);
  return { fair: mean, std: Math.sqrt(variance), min, max };
}

/**
 * Model for making a market on a fair value question. When a generator exists it
 * returns Monte Carlo stats plus a live sampler; otherwise it settles at the
 * known fair value deterministically.
 */
export function estimateModel(
  id: number,
  knownFv: number,
): { fair: number; std: number; min: number; max: number; sample: () => number } {
  const sim = simulatorForQuestion(id);
  if (!sim) {
    return { fair: knownFv, std: 0, min: knownFv, max: knownFv, sample: () => knownFv };
  }
  let s = statsCache.get(id);
  if (!s) {
    s = computeStats(sim, 12000);
    statsCache.set(id, s);
  }
  return { ...s, sample: sim };
}
