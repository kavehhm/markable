import { CATALOG, GameConfig, PayoffFunction, findPayoff } from "./engine";
import { ArenaSession } from "./ArenaApp";

const DEFAULT_CARD_CONFIG: GameConfig = {
  source: "cards",
  count: 3,
  aceHigh: false,
  facesAreTen: false,
};

/** Resolve the game config + payoff for a contract based session. */
export function resolveContract(session: ArenaSession): {
  config: GameConfig;
  payoff: PayoffFunction;
} {
  const payoff = findPayoff(session.payoffId ?? "card_sum")!;
  const entry =
    CATALOG.find(
      (e) => e.payoffId === session.payoffId && e.source === session.source,
    ) ?? CATALOG.find((e) => e.payoffId === session.payoffId);
  return { config: entry?.config ?? DEFAULT_CARD_CONFIG, payoff };
}

/** A plain, explicit description of what gets drawn. No jargon, no dashes. */
export function setupLabel(config: GameConfig): string {
  if (config.source === "cards") {
    return `${config.count} cards from a shuffled 52 card deck, no repeats`;
  }
  if (config.source === "dice") {
    return `${config.count} rolls of a ${config.diceFaces ?? 6} sided die`;
  }
  if (config.source === "coins") {
    return `${config.count} flips of a fair coin`;
  }
  return config.latentLabel ?? "one hidden interview state";
}

/** Short noun for the hidden draw, e.g. "hand", "roll", "sequence". */
export function drawNoun(config: GameConfig): string {
  if (config.source === "cards") return "hand";
  if (config.source === "dice") return "roll";
  if (config.source === "coins") return "sequence";
  return "state";
}
