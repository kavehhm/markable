import { describe, expect, it } from "vitest";
import {
  LAB_SCENARIOS,
  evaluatePortfolio,
  findLabScenario,
  findOptimalPortfolio,
  hasArbitrage,
} from "./index";

describe("objective lab scenarios", () => {
  it("every scenario state space sums to probability 1", () => {
    for (const s of LAB_SCENARIOS) {
      const mass = s.states.reduce((a, st) => a + st.probability, 0);
      expect(mass).toBeCloseTo(1, 9);
    }
  });

  it("three way race has a guaranteed positive worst case (Dutch book)", () => {
    const race = findLabScenario("race")!;
    const buyOneEach = { A: 1, B: 1, C: 1 };
    const r = evaluatePortfolio(race, buyOneEach);
    expect(r.worstCase).toBeCloseTo(0.05, 9);
    expect(r.std).toBeCloseTo(0, 9); // riskless
    expect(hasArbitrage(race)).toBe(true);
  });

  it("die reverse pair is riskless and positive", () => {
    const die = findLabScenario("die")!;
    const r = evaluatePortfolio(die, { up: 1, down: 1, even: 0 });
    expect(r.worstCase).toBeCloseTo(0.2, 9);
    expect(r.std).toBeCloseTo(0, 9);
  });

  it("max worst case avoids the risky instrument, max ev uses it", () => {
    const die = findLabScenario("die")!;
    const worst = findOptimalPortfolio(die, "max_worst_case");
    expect(worst.position.even).toBe(0); // even bonus hurts the floor
    expect(worst.result.worstCase).toBeGreaterThan(0);

    const ev = findOptimalPortfolio(die, "max_ev");
    expect(ev.position.even).toBeGreaterThan(0); // edge is worth the risk for EV
    expect(ev.result.ev).toBeGreaterThan(worst.result.ev);
  });

  it("two dice ticket partition locks a positive worst case", () => {
    const dice = findLabScenario("twodice")!;
    const r = evaluatePortfolio(dice, { sum: 0, under: 1, over: 1, seven: 1 });
    expect(r.worstCase).toBeCloseTo(0.05, 9);
    expect(hasArbitrage(dice)).toBe(true);
  });
});
