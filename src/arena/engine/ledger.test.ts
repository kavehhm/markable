import { describe, expect, it } from "vitest";
import { applyEvent, initLedger, markedPnl, runLedger } from "./ledger";

describe("trader ledger", () => {
  it("tracks position, cash, and average entry on a buy", () => {
    let s = initLedger(100, 5);
    s = applyEvent(s, { kind: "trade", side: "buy", qty: 3, price: 100 });
    expect(s.position).toBe(3);
    expect(s.cash).toBe(-300);
    expect(s.avgEntry).toBe(100);
    expect(markedPnl(s)).toBe(0);
  });

  it("marks the open position to fair value", () => {
    let s = initLedger(100, 5);
    s = applyEvent(s, { kind: "trade", side: "buy", qty: 3, price: 100 });
    s = applyEvent(s, { kind: "fv", fv: 110 });
    expect(markedPnl(s)).toBe(30); // 3 long, FV up 10
  });

  it("weights the average entry across adds", () => {
    let s = initLedger(100, 10);
    s = applyEvent(s, { kind: "trade", side: "buy", qty: 2, price: 100 });
    s = applyEvent(s, { kind: "trade", side: "buy", qty: 2, price: 120 });
    expect(s.position).toBe(4);
    expect(s.avgEntry).toBe(110);
  });

  it("realizes PnL when a position is reduced", () => {
    let s = initLedger(100, 5);
    s = applyEvent(s, { kind: "trade", side: "buy", qty: 4, price: 100 });
    s = applyEvent(s, { kind: "trade", side: "sell", qty: 2, price: 108 });
    expect(s.position).toBe(2);
    expect(s.realizedPnl).toBe(16); // (108 - 100) * 2
    expect(s.avgEntry).toBe(100); // partial reduction keeps entry
  });

  it("flips through zero and re-anchors the average entry", () => {
    let s = initLedger(110, 6);
    s = applyEvent(s, { kind: "trade", side: "buy", qty: 3, price: 100 });
    s = applyEvent(s, { kind: "trade", side: "sell", qty: 5, price: 110 });
    expect(s.position).toBe(-2);
    expect(s.realizedPnl).toBe(30); // (110 - 100) * 3
    expect(s.avgEntry).toBe(110);
    expect(markedPnl(s)).toBe(30); // fv 110, short 2 at 110 -> unrealized 0
  });

  it("flags a bust when the position breaches the risk bound", () => {
    let s = initLedger(50, 5);
    s = applyEvent(s, { kind: "trade", side: "buy", qty: 6, price: 50 });
    expect(s.breached).toBe(true);
  });

  it("stays clean inside the risk bound", () => {
    const traj = runLedger(initLedger(50, 5), [
      { kind: "trade", side: "buy", qty: 3, price: 50 },
      { kind: "trade", side: "sell", qty: 2, price: 52 },
    ]);
    expect(traj[traj.length - 1].breached).toBe(false);
    expect(traj[traj.length - 1].position).toBe(1);
  });
});
