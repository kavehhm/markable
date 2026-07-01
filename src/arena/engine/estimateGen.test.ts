import { describe, expect, it } from "vitest";
import { FV_QUESTIONS } from "../fvSprint";
import { simulatorForQuestion } from "./estimateGen";

// Monte Carlo mean of each generator should match the authored fair value. The
// tolerance is loose on purpose: it catches wrong formulas (usually off by a lot
// or structurally broken) without failing on sampling noise, especially for the
// skewed product questions.
describe("estimate generators", () => {
  const SAMPLES = 80000;

  it("has a generator for the vast majority of the bank", () => {
    const withGen = FV_QUESTIONS.filter((q) => simulatorForQuestion(q.id)).length;
    expect(withGen).toBeGreaterThanOrEqual(95);
  });

  for (const q of FV_QUESTIONS) {
    const sim = simulatorForQuestion(q.id);
    if (!sim) continue;
    it(`Q${q.id} (${q.category}) mean ~ ${q.fv}`, () => {
      let total = 0;
      for (let i = 0; i < SAMPLES; i++) total += sim();
      const mean = total / SAMPLES;
      const tol = Math.max(1, 0.12 * Math.abs(q.fv));
      expect(Math.abs(mean - q.fv)).toBeLessThanOrEqual(tol);
    });
  }
});
