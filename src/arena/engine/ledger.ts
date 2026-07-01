// A pure trader ledger for the working-memory drill. It tracks the four states
// an interviewer expects you to carry in your head during a fast market making
// game:
//   - fair value (FV): the running mark for the contract
//   - position: signed inventory (positive long, negative short)
//   - cash: liquid balance, selling adds cash and buying spends it
//   - average entry price of the open position
// plus realized PnL and a hard risk bound that flags an automatic bust when the
// inventory ever moves outside it.

export type LedgerState = {
  fv: number;
  position: number;
  cash: number;
  /** Average price of the current open position. 0 when flat. */
  avgEntry: number;
  /** PnL booked from closing trades, separate from the open mark. */
  realizedPnl: number;
  /** Hard inventory limit. A position outside [-riskBound, riskBound] busts. */
  riskBound: number;
  /** True once the position has ever breached the risk bound. */
  breached: boolean;
};

export type LedgerEvent =
  | { kind: "trade"; side: "buy" | "sell"; qty: number; price: number; label?: string }
  | { kind: "fv"; fv: number; label?: string };

export function initLedger(fv: number, riskBound: number): LedgerState {
  return { fv, position: 0, cash: 0, avgEntry: 0, realizedPnl: 0, riskBound, breached: false };
}

/** Marked PnL: realized plus the open position marked at fair value. */
export function markedPnl(s: LedgerState): number {
  return s.cash + s.position * s.fv;
}

export function applyEvent(s: LedgerState, e: LedgerEvent): LedgerState {
  if (e.kind === "fv") {
    return { ...s, fv: e.fv };
  }

  const signedQty = e.side === "buy" ? e.qty : -e.qty;
  const oldPos = s.position;
  const newPos = oldPos + signedQty;
  const cash = s.cash - signedQty * e.price;

  let avgEntry = s.avgEntry;
  let realizedPnl = s.realizedPnl;

  const adding = oldPos === 0 || Math.sign(oldPos) === Math.sign(signedQty);
  if (adding) {
    const oldAbs = Math.abs(oldPos);
    const addAbs = Math.abs(signedQty);
    avgEntry = oldAbs === 0 ? e.price : (oldAbs * avgEntry + addAbs * e.price) / (oldAbs + addAbs);
  } else {
    const closedQty = Math.min(Math.abs(oldPos), Math.abs(signedQty));
    const perUnit = oldPos > 0 ? e.price - avgEntry : avgEntry - e.price;
    realizedPnl += perUnit * closedQty;
    if (Math.abs(signedQty) > Math.abs(oldPos)) {
      // Flipped through zero: the overshoot opens a fresh position at this price.
      avgEntry = e.price;
    } else if (newPos === 0) {
      avgEntry = 0;
    }
    // Partial reduction keeps the existing average entry.
  }

  const breached = s.breached || Math.abs(newPos) > s.riskBound;
  return { ...s, position: newPos, cash, avgEntry, realizedPnl, breached };
}

/** Run a sequence from an initial state, returning the state after each event. */
export function runLedger(initial: LedgerState, events: LedgerEvent[]): LedgerState[] {
  const trajectory: LedgerState[] = [];
  let state = initial;
  for (const event of events) {
    state = applyEvent(state, event);
    trajectory.push(state);
  }
  return trajectory;
}
