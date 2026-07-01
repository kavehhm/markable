// The Make a Market contract bank. These are engine backed contracts with a
// spread out settlement, so a two sided market is meaningful: a fill only tells
// you the value is above your ask or below your bid, not the exact number.
// Fair value estimation questions live in the separate Fair Value mode.

import {
  CATALOG,
  Difficulty,
  GameConfig,
  SourceKind,
  findPayoff,
  promptFor,
} from "./engine";
import { FvCategory } from "./fvSprint";

export type BankEntry = {
  id: string;
  name: string;
  prompt: string;
  category: FvCategory;
  difficulty: Difficulty;
  source: SourceKind;
  payoffId: string;
  config: GameConfig;
};

const MARKET_CATEGORY: Record<string, FvCategory> = {
  card_sum: "Sums",
  card_signed_sum: "Sums",
  card_red_count: "Counts",
  card_face_count: "Counts",
  card_high: "Extremes",
  card_spread: "Extremes",
  card_abs_signed_sum: "Extremes",
  card_product: "Products",
  card_signed_product: "Products",
  dice_sum: "Sums",
  dice_max: "Extremes",
  dice_spread: "Extremes",
  dice_product: "Products",
  coin_heads: "Counts",
  coin_longest_streak: "Counts",
  coin_heads_squared: "Products",
};

export const MARKET_BANK: BankEntry[] = CATALOG.flatMap((entry) => {
  const payoff = findPayoff(entry.payoffId);
  // Indicator payoffs settle at 0 or 1, so a market on them is degenerate.
  if (!payoff || payoff.kind === "indicator") return [];
  const noun = entry.source === "cards" ? "cards" : entry.source === "dice" ? "dice" : "coins";
  return [{
    id: `mk_${entry.source}_${entry.payoffId}_${entry.config.count}`,
    name: `${payoff.name} (${entry.config.count} ${noun})`,
    prompt: promptFor(payoff, entry.config),
    category: MARKET_CATEGORY[entry.payoffId] ?? "Sums",
    difficulty: entry.difficulty,
    source: entry.source,
    payoffId: entry.payoffId,
    config: entry.config,
  }];
});

export const BANK_CATEGORIES: FvCategory[] = ["Sums", "Counts", "Extremes", "Products"];
export const BANK_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
export const BANK_SOURCES: SourceKind[] = ["cards", "dice", "coins"];

export type BankFilter = {
  difficulty?: Difficulty | "all";
  category?: FvCategory | "all";
  source?: SourceKind | "all";
  search?: string;
};

export function filterBank(filter: BankFilter): BankEntry[] {
  const search = filter.search?.trim().toLowerCase() ?? "";
  return MARKET_BANK.filter((e) => {
    if (filter.difficulty && filter.difficulty !== "all" && e.difficulty !== filter.difficulty) return false;
    if (filter.category && filter.category !== "all" && e.category !== filter.category) return false;
    if (filter.source && filter.source !== "all" && e.source !== filter.source) return false;
    if (search && !`${e.name} ${e.prompt}`.toLowerCase().includes(search)) return false;
    return true;
  });
}

export function randomEntry(entries: BankEntry[] = MARKET_BANK): BankEntry | null {
  if (entries.length === 0) return null;
  return entries[Math.floor(Math.random() * entries.length)];
}
