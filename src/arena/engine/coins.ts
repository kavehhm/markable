import { GameConfig, GameState } from "./types";
import { cartesianProduct } from "./combinatorics";

/** Enumerate every sequence of `count` fair coin flips (true = heads). */
export function enumerateCoinStates(config: GameConfig): GameState[] {
  const sequences = cartesianProduct([true, false], config.count);
  const probability = 1 / sequences.length;
  return sequences.map((coins, index) => ({
    id: `c${index}`,
    probability,
    coins,
    label: coins.map((h) => (h ? "H" : "T")).join(""),
  }));
}
