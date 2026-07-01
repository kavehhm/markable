import { describe, expect, it } from "vitest";
import {
  generateTradeRound,
  isValidOrder,
  maxBuyUnits,
  maxSellUnits,
  tradePnl,
} from "./tradingGame";

describe("trading game", () => {
  it("settles taker PnL on both sides", () => {
    const quote = { bid: 20, ask: 24 };
    expect(tradePnl("buy", 3, quote, 30)).toBe(18); // (30 - 24) * 3
    expect(tradePnl("sell", 2, quote, 15)).toBe(10); // (20 - 15) * 2
    expect(tradePnl("buy", 0, quote, 30)).toBe(0);
  });

  it("caps size by budget rules", () => {
    expect(maxBuyUnits(500, 25)).toBe(20);
    expect(maxSellUnits(500, 20, 70)).toBe(10); // worst loss per unit = 70 - 20 = 50
    expect(isValidOrder("buy", 20, 500, { bid: 20, ask: 25 }, 70)).toBe(true);
    expect(isValidOrder("buy", 21, 500, { bid: 20, ask: 25 }, 70)).toBe(false);
    expect(isValidOrder("sell", 11, 500, { bid: 20, ask: 25 }, 70)).toBe(false);
  });

  it("generates a consistent round", () => {
    for (let i = 0; i < 50; i++) {
      const r = generateTradeRound("cards", 3, true);
      expect(r.units).toHaveLength(3);
      expect(r.hiddenCount).toBeGreaterThanOrEqual(1);
      expect(r.trueSum).toBeGreaterThanOrEqual(r.minSum);
      expect(r.trueSum).toBeLessThanOrEqual(r.maxSum);
      expect(r.quote.ask).toBeGreaterThan(r.quote.bid);
    }
  });

  it("generates dice rounds with values in range", () => {
    for (let i = 0; i < 50; i++) {
      const r = generateTradeRound("dice", 5, false);
      expect(r.units).toHaveLength(5);
      for (const u of r.units) {
        expect(u.value).toBeGreaterThanOrEqual(1);
        expect(u.value).toBeLessThanOrEqual(6);
      }
    }
  });
});
