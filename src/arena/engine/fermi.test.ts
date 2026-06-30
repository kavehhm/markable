import { describe, expect, it } from "vitest";
import {
  FERMI_QUESTIONS,
  fermiByDifficulty,
  fermiMarketAction,
  marketContains,
} from "./index";

describe("fermi markets", () => {
  it("has a broad prompt catalogue across difficulties", () => {
    expect(FERMI_QUESTIONS.length).toBeGreaterThanOrEqual(26);
    expect(fermiByDifficulty("easy").length).toBeGreaterThanOrEqual(8);
    expect(fermiByDifficulty("medium").length).toBeGreaterThanOrEqual(8);
    expect(fermiByDifficulty("hard").length).toBeGreaterThanOrEqual(8);
  });

  it("responds to a quoted range before revealing the answer", () => {
    expect(fermiMarketAction(10, 20, 25)).toBe("buy");
    expect(fermiMarketAction(10, 20, 5)).toBe("sell");
    expect(fermiMarketAction(10, 20, 15)).toBe("pass");
    expect(marketContains(10, 20, 15)).toBe(true);
  });
});
