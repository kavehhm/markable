import { describe, expect, it } from "vitest";
import {
  GameConfig,
  Quote,
  computeEV,
  computePayoffDistribution,
  computeStats,
  computeUserPnl,
  decideCounterpartyAction,
  enumerateStates,
  findPayoff,
  updateBeliefsAfterAction,
} from "./index";
import { choose } from "./combinatorics";

const cardConfig: GameConfig = {
  source: "cards",
  count: 3,
  aceHigh: false,
  facesAreTen: false,
};

function sumPayoff() {
  return findPayoff("card_sum")!;
}

describe("enumeration", () => {
  it("draws C(52,3) = 22100 hands (acceptance test 7)", () => {
    const states = enumerateStates(cardConfig);
    expect(states.length).toBe(22100);
    expect(choose(52, 3)).toBe(22100);
  });

  it("probabilities sum to 1", () => {
    const states = enumerateStates(cardConfig);
    const mass = states.reduce((acc, s) => acc + s.probability, 0);
    expect(mass).toBeCloseTo(1, 9);
  });

  it("enumerates 6^3 dice rolls and 2^5 coin sequences", () => {
    expect(enumerateStates({ source: "dice", count: 3, diceFaces: 6 }).length).toBe(216);
    expect(enumerateStates({ source: "coins", count: 5 }).length).toBe(32);
  });

  it("enumerates weighted latent states and normalizes probabilities", () => {
    const states = enumerateStates({
      source: "latent",
      count: 3,
      latentStates: [
        { id: "low", label: "low", weight: 1, values: { value: -1 } },
        { id: "mid", label: "mid", weight: 2, values: { value: 0 } },
        { id: "high", label: "high", weight: 1, values: { value: 1 } },
      ],
    });
    expect(states).toHaveLength(3);
    expect(states.reduce((acc, s) => acc + s.probability, 0)).toBeCloseTo(1, 9);
    expect(states.find((s) => s.id === "mid")?.probability).toBeCloseTo(0.5, 9);
  });
});

describe("informed counterparty (acceptance tests 1-3)", () => {
  const quote: Quote = { bid: 18, ask: 24 };
  const base = { type: "informed" as const, fairValue: 21 };

  it("buys from user when Y > ask", () => {
    expect(decideCounterpartyAction(quote, { ...base, truePayoff: 30 })).toBe("buy_from_user");
  });
  it("sells to user when Y < bid", () => {
    expect(decideCounterpartyAction(quote, { ...base, truePayoff: 10 })).toBe("sell_to_user");
  });
  it("passes when bid <= Y <= ask", () => {
    expect(decideCounterpartyAction(quote, { ...base, truePayoff: 21 })).toBe("pass");
  });
});

describe("PnL (acceptance tests 4-5)", () => {
  const quote: Quote = { bid: 18, ask: 24 };
  it("ask - Y when adversary buys", () => {
    expect(computeUserPnl("buy_from_user", quote, 30)).toBe(24 - 30);
  });
  it("Y - bid when adversary sells", () => {
    expect(computeUserPnl("sell_to_user", quote, 10)).toBe(10 - 18);
  });
  it("0 on pass", () => {
    expect(computeUserPnl("pass", quote, 21)).toBe(0);
  });
});

describe("symmetric markets (acceptance test 6)", () => {
  it("black total minus red total has EV exactly 0", () => {
    const states = enumerateStates(cardConfig);
    const dist = computePayoffDistribution(states, findPayoff("card_signed_sum")!);
    expect(computeEV(dist)).toBeCloseTo(0, 9);
  });
  it("signed product has EV exactly 0", () => {
    const states = enumerateStates(cardConfig);
    const dist = computePayoffDistribution(states, findPayoff("card_signed_product")!);
    expect(computeEV(dist)).toBeCloseTo(0, 9);
  });
});

describe("distribution stats", () => {
  it("sum of 3 cards (A=1..K=13) has EV = 21", () => {
    const states = enumerateStates(cardConfig);
    const dist = computePayoffDistribution(states, sumPayoff());
    const stats = computeStats(dist);
    expect(stats.ev).toBeCloseTo(21, 6);
    expect(stats.min).toBe(3); // three aces, each value 1
    expect(stats.max).toBe(39); // three kings, each value 13
  });
});

describe("belief updates (acceptance tests 8-10)", () => {
  const states = enumerateStates(cardConfig);
  const payoff = sumPayoff();
  const quote: Quote = { bid: 18, ask: 24 };

  it("after buy keeps only states with payoff > ask", () => {
    const next = updateBeliefsAfterAction(states, quote, "buy_from_user", payoff);
    expect(next.every((s) => payoff.evaluate(s) > quote.ask)).toBe(true);
    expect(next.length).toBeGreaterThan(0);
  });
  it("after sell keeps only states with payoff < bid", () => {
    const next = updateBeliefsAfterAction(states, quote, "sell_to_user", payoff);
    expect(next.every((s) => payoff.evaluate(s) < quote.bid)).toBe(true);
  });
  it("after pass keeps only states with bid <= payoff <= ask", () => {
    const next = updateBeliefsAfterAction(states, quote, "pass", payoff);
    expect(
      next.every((s) => payoff.evaluate(s) >= quote.bid && payoff.evaluate(s) <= quote.ask),
    ).toBe(true);
    const mass = next.reduce((acc, s) => acc + s.probability, 0);
    expect(mass).toBeCloseTo(1, 9);
  });

  it("works for latent number-line payoffs", () => {
    const latentStates = enumerateStates({
      source: "latent",
      count: 5,
      latentStates: [-2, -1, 0, 1, 2].map((value) => ({
        id: `x_${value}`,
        label: `x = ${value}`,
        weight: 1,
        values: { value },
      })),
    });
    const latentPayoff = findPayoff("latent_number_line")!;
    const next = updateBeliefsAfterAction(
      latentStates,
      { bid: -0.5, ask: 0.5 },
      "buy_from_user",
      latentPayoff,
    );
    expect(next.map((s) => latentPayoff.evaluate(s))).toEqual([1, 2]);
  });
});
