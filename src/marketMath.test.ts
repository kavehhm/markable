import { describe, expect, it } from "vitest";
import {
  advanceSimulation,
  bookImbalance,
  createBook,
  initialSimState,
  microprice,
  roundTick,
  scoreQuote,
} from "./marketMath";

describe("market math", () => {
  it("rounds prices to the configured tick", () => {
    expect(roundTick(100.023)).toBeCloseTo(100);
    expect(roundTick(100.026)).toBeCloseTo(100.05);
  });

  it("keeps book imbalance and microprice in a sensible range", () => {
    const book = createBook(100, 0.7, "normal");
    expect(bookImbalance(book)).toBeGreaterThan(0.5);
    expect(microprice(book)).toBeGreaterThanOrEqual(book.bids[0].price);
    expect(microprice(book)).toBeLessThanOrEqual(book.asks[0].price);
  });

  it("advances a deterministic simulation state", () => {
    const next = advanceSimulation(initialSimState(), { width: "balanced", lean: "neutral" });
    expect(next.step).toBe(1);
    expect(next.history).toHaveLength(2);
    expect(Number.isFinite(next.pnl)).toBe(true);
  });

  it("rewards correct fast quotes", () => {
    expect(scoreQuote(true, 300)).toBeGreaterThan(scoreQuote(true, 1600));
    expect(scoreQuote(true, 500)).toBeGreaterThan(scoreQuote(false, 500));
  });
});
