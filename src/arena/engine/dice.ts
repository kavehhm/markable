import { GameConfig, GameState } from "./types";
import { cartesianProduct } from "./combinatorics";

/** Enumerate every ordered roll of `count` dice with `faces` sides each. */
export function enumerateDiceStates(config: GameConfig): GameState[] {
  const faces = config.diceFaces ?? 6;
  const values = Array.from({ length: faces }, (_, i) => i + 1);
  const rolls = cartesianProduct(values, config.count);
  const probability = 1 / rolls.length;
  return rolls.map((dice, index) => ({
    id: `d${index}`,
    probability,
    dice,
    label: dice.join(" · "),
  }));
}
