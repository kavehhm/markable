import { BookSnapshot, SimulatorAction, SimState, Volatility } from "./types";

export const tickSize = 0.05;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function roundTick(value: number) {
  return Math.round(value / tickSize) * tickSize;
}

export function formatPrice(value: number) {
  return value.toFixed(2);
}

export function formatSigned(value: number, digits = 2) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

export function createBook(mid: number, imbalance: number, volatility: Volatility): BookSnapshot {
  const spread = volatility === "quiet" ? 0.1 : volatility === "jumpy" ? 0.25 : 0.15;
  const depthScale = volatility === "jumpy" ? 0.78 : volatility === "quiet" ? 1.2 : 1;
  const bestBid = roundTick(mid - spread / 2);
  const bestAsk = roundTick(mid + spread / 2);
  const bids = Array.from({ length: 8 }, (_, index) => {
    const distance = index + 1;
    const base = (34 - index * 2.2) * depthScale;
    const size = Math.max(4, base * (0.78 + imbalance) + Math.sin(mid + index) * 3);
    return {
      price: roundTick(bestBid - index * tickSize),
      size: Math.round(size),
      queue: Math.round(size * (distance + 1.3)),
    };
  });
  const asks = Array.from({ length: 8 }, (_, index) => {
    const distance = index + 1;
    const base = (34 - index * 2.2) * depthScale;
    const size = Math.max(4, base * (1.78 - imbalance) + Math.cos(mid + index) * 3);
    return {
      price: roundTick(bestAsk + index * tickSize),
      size: Math.round(size),
      queue: Math.round(size * (distance + 1.2)),
    };
  });

  return { bids, asks, mid };
}

export function totalDepth(book: BookSnapshot, side: "bids" | "asks") {
  return book[side].reduce((sum, level) => sum + level.size, 0);
}

export function bookImbalance(book: BookSnapshot) {
  const bids = totalDepth(book, "bids");
  const asks = totalDepth(book, "asks");
  return bids / Math.max(1, bids + asks);
}

export function microprice(book: BookSnapshot) {
  const bestBid = book.bids[0];
  const bestAsk = book.asks[0];
  return (bestAsk.price * bestBid.size + bestBid.price * bestAsk.size) / Math.max(1, bestBid.size + bestAsk.size);
}

export function initialSimState(): SimState {
  return {
    fair: 100,
    mid: 100,
    inventory: 0,
    cash: 0,
    pnl: 0,
    step: 0,
    spreadCapture: 0,
    adverseSelection: 0,
    lastEvent: "Ready for a two-sided quote.",
    history: [0],
  };
}

function actionWidth(width: SimulatorAction["width"]) {
  if (width === "tight") return 0.06;
  if (width === "wide") return 0.18;
  return 0.11;
}

function actionLean(lean: SimulatorAction["lean"]) {
  if (lean === "bid") return 0.06;
  if (lean === "ask") return -0.06;
  return 0;
}

function flowShock(step: number) {
  return Math.sin(step * 1.7) * 0.055 + Math.cos(step * 0.63) * 0.035;
}

export function advanceSimulation(state: SimState, action: SimulatorAction): SimState {
  const width = actionWidth(action.width);
  const inventorySkew = clamp(-(state.inventory / 20) * 0.12, -0.16, 0.16);
  const center = state.fair + inventorySkew + actionLean(action.lean);
  const bid = roundTick(center - width);
  const ask = roundTick(center + width);
  const shock = flowShock(state.step + 1);
  const nextFair = roundTick(state.fair + shock);

  const buyFlow = clamp(0.38 + shock * 1.8 + (state.mid - ask) * 0.7, 0.05, 0.82);
  const sellFlow = clamp(0.38 - shock * 1.8 + (bid - state.mid) * 0.7, 0.05, 0.82);
  const deterministicBuy = Math.sin((state.step + 1) * 4.77) * 0.5 + 0.5;
  const deterministicSell = Math.cos((state.step + 1) * 3.91) * 0.5 + 0.5;
  const askFilled = deterministicBuy < buyFlow;
  const bidFilled = deterministicSell < sellFlow;

  let inventory = state.inventory;
  let cash = state.cash;
  let spreadCapture = state.spreadCapture;
  let event = "No fill. Quote preserved optionality.";

  if (bidFilled) {
    inventory += 1;
    cash -= bid;
    spreadCapture += Math.max(0, state.mid - bid);
    event = `Bought 1 @ ${formatPrice(bid)}.`;
  }

  if (askFilled) {
    inventory -= 1;
    cash += ask;
    spreadCapture += Math.max(0, ask - state.mid);
    event = bidFilled ? `${event} Sold 1 @ ${formatPrice(ask)}.` : `Sold 1 @ ${formatPrice(ask)}.`;
  }

  const nextMid = roundTick(nextFair + shock * 0.45);
  const pnl = cash + inventory * nextMid;
  const adverseSelection = state.adverseSelection + inventory * (nextFair - state.fair) * -0.18;

  return {
    fair: nextFair,
    mid: nextMid,
    inventory,
    cash,
    pnl,
    step: state.step + 1,
    spreadCapture,
    adverseSelection,
    lastEvent: `${event} Fair moved ${formatSigned(nextFair - state.fair)}.`,
    history: [...state.history.slice(-23), pnl],
  };
}

export function scoreQuote(correct: boolean, elapsedMs: number) {
  const speedBonus = Math.max(0, 1200 - elapsedMs) / 1200;
  return correct ? Math.round(80 + speedBonus * 20) : Math.round(Math.max(5, 35 - elapsedMs / 160));
}
