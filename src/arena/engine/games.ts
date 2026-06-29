import { GameConfig, GameState, PayoffFunction, SourceKind } from "./types";
import { enumerateCardStates } from "./cards";
import { enumerateDiceStates } from "./dice";
import { enumerateCoinStates } from "./coins";
import { enumerateLatentStates } from "./latent";
import { findPayoff } from "./payoffs";

/** Dispatch to the right exact-enumeration generator. */
export function enumerateStates(config: GameConfig): GameState[] {
  if (config.source === "cards") return enumerateCardStates(config);
  if (config.source === "dice") return enumerateDiceStates(config);
  if (config.source === "coins") return enumerateCoinStates(config);
  return enumerateLatentStates(config);
}

/** Pick one realised state at random, weighted by probability. */
export function drawTrueState(states: GameState[], rng = Math.random): GameState {
  const r = rng();
  let cumulative = 0;
  for (const state of states) {
    cumulative += state.probability;
    if (r <= cumulative) return state;
  }
  return states[states.length - 1];
}

export type Difficulty = "easy" | "medium" | "hard";

export type ArenaScenario = {
  id: string;
  title: string;
  source: SourceKind;
  config: GameConfig;
  payoff: PayoffFunction;
  prompt: string;
};

const DEFAULT_CARD_CONFIG: GameConfig = {
  source: "cards",
  count: 3,
  aceHigh: false,
  facesAreTen: false,
};

/** A curated catalogue of make-a-market contracts, grouped by source. */
export type CatalogEntry = {
  source: SourceKind;
  config: GameConfig;
  payoffId: string;
  difficulty: Difficulty;
};

export const CATALOG: CatalogEntry[] = [
  // Cards (3 drawn, no replacement)
  { source: "cards", config: DEFAULT_CARD_CONFIG, payoffId: "card_sum", difficulty: "easy" },
  { source: "cards", config: DEFAULT_CARD_CONFIG, payoffId: "card_red_count", difficulty: "easy" },
  { source: "cards", config: DEFAULT_CARD_CONFIG, payoffId: "card_face_count", difficulty: "easy" },
  { source: "cards", config: DEFAULT_CARD_CONFIG, payoffId: "card_high", difficulty: "easy" },
  { source: "cards", config: DEFAULT_CARD_CONFIG, payoffId: "card_spread", difficulty: "medium" },
  { source: "cards", config: DEFAULT_CARD_CONFIG, payoffId: "card_signed_sum", difficulty: "medium" },
  { source: "cards", config: DEFAULT_CARD_CONFIG, payoffId: "card_any_ace", difficulty: "medium" },
  { source: "cards", config: DEFAULT_CARD_CONFIG, payoffId: "card_same_color", difficulty: "medium" },
  { source: "cards", config: DEFAULT_CARD_CONFIG, payoffId: "card_abs_signed_sum", difficulty: "hard" },
  { source: "cards", config: DEFAULT_CARD_CONFIG, payoffId: "card_product", difficulty: "hard" },
  { source: "cards", config: DEFAULT_CARD_CONFIG, payoffId: "card_signed_product", difficulty: "hard" },
  // Dice
  { source: "dice", config: { source: "dice", count: 2, diceFaces: 6 }, payoffId: "dice_sum", difficulty: "easy" },
  { source: "dice", config: { source: "dice", count: 3, diceFaces: 6 }, payoffId: "dice_sum", difficulty: "easy" },
  { source: "dice", config: { source: "dice", count: 3, diceFaces: 6 }, payoffId: "dice_max", difficulty: "medium" },
  { source: "dice", config: { source: "dice", count: 3, diceFaces: 6 }, payoffId: "dice_spread", difficulty: "medium" },
  { source: "dice", config: { source: "dice", count: 3, diceFaces: 6 }, payoffId: "dice_product", difficulty: "hard" },
  // Coins
  { source: "coins", config: { source: "coins", count: 5 }, payoffId: "coin_heads", difficulty: "easy" },
  { source: "coins", config: { source: "coins", count: 6 }, payoffId: "coin_longest_streak", difficulty: "medium" },
  { source: "coins", config: { source: "coins", count: 8 }, payoffId: "coin_has_hh", difficulty: "medium" },
  { source: "coins", config: { source: "coins", count: 6 }, payoffId: "coin_heads_squared", difficulty: "hard" },
];

export function catalogFor(
  source: SourceKind,
  difficulty?: Difficulty,
): CatalogEntry[] {
  return CATALOG.filter(
    (e) => e.source === source && (!difficulty || e.difficulty === difficulty),
  );
}

export function resolveEntry(entry: CatalogEntry): {
  config: GameConfig;
  payoff: PayoffFunction;
} {
  const payoff = findPayoff(entry.payoffId);
  if (!payoff) throw new Error(`Unknown payoff ${entry.payoffId}`);
  return { config: entry.config, payoff };
}

export function promptFor(payoff: PayoffFunction, config: GameConfig): string {
  const noun =
    config.source === "cards"
      ? `${config.count} cards drawn from a 52-card deck`
      : config.source === "dice"
        ? `${config.count} six-sided dice`
        : config.source === "coins"
          ? `${config.count} fair coin flips`
          : config.latentLabel ?? "a hidden interview state";
  return `Make a market on the ${payoff.name.toLowerCase()} of ${noun}.`;
}
