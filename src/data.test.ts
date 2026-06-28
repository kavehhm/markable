import { describe, expect, it } from "vitest";
import { makeQuoteScenario } from "./data";

describe("quote scenario generation", () => {
  it("makes short-inventory lean bid quotes improve the bid", () => {
    for (let index = 1; index < 80; index += 1) {
      const scenario = makeQuoteScenario(index);
      if (scenario.inventory >= -5) continue;

      const touch = scenario.choices.find((choice) => choice.id === "top-of-book");
      const lean = scenario.choices.find((choice) => choice.id === "reduce-short");

      expect(touch).toBeDefined();
      expect(lean).toBeDefined();
      expect(lean!.bid).toBeGreaterThan(touch!.bid);
    }
  });

  it("makes long-inventory lean offer quotes improve the ask", () => {
    for (let index = 1; index < 80; index += 1) {
      const scenario = makeQuoteScenario(index);
      if (scenario.inventory <= 5) continue;

      const touch = scenario.choices.find((choice) => choice.id === "top-of-book");
      const lean = scenario.choices.find((choice) => choice.id === "reduce-long");

      expect(touch).toBeDefined();
      expect(lean).toBeDefined();
      expect(lean!.ask).toBeLessThan(touch!.ask);
    }
  });

  it("uses every quote type as the correct answer across generated scenarios", () => {
    const correctIds = new Set(Array.from({ length: 120 }, (_, index) => makeQuoteScenario(index + 1).correctChoiceId));

    expect(correctIds.has("top-of-book")).toBe(true);
    expect(correctIds.has("too-wide")).toBe(true);
    expect(correctIds.has("balanced-edge")).toBe(true);
    expect(correctIds.has("reduce-short")).toBe(true);
    expect(correctIds.has("reduce-long")).toBe(true);
  });

  it("does not keep the correct quote in a fixed answer position", () => {
    const correctPositions = new Set(
      Array.from({ length: 40 }, (_, index) => {
        const scenario = makeQuoteScenario(index + 1);
        return scenario.choices.findIndex((choice) => choice.id === scenario.correctChoiceId);
      }),
    );

    expect(correctPositions.size).toBeGreaterThan(1);
  });
});
