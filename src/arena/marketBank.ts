// The unified Make a Market question bank. Two kinds of entries live side by
// side, browsed through one Quantable-style table:
//   - "market"   engine-backed contracts (from CATALOG). You quote a two sided
//                market and an informed counterparty trades against it.
//   - "estimate" the static fair value bank (from fvSprint). You commit a point
//                estimate and it is graded against the known fair value.

import {
  CATALOG,
  Difficulty,
  GameConfig,
  SourceKind,
  findPayoff,
  promptFor,
} from "./engine";
import { FV_QUESTIONS, FvCategory } from "./fvSprint";

export type BankKind = "market" | "estimate";

export type BankEntry = {
  id: string;
  name: string;
  prompt: string;
  category: FvCategory;
  difficulty: Difficulty;
  /** Underlying randomness, or "mixed" when a question blends sources. */
  source: SourceKind | "mixed";
  kind: BankKind;
  /** market only */
  payoffId?: string;
  config?: GameConfig;
  /** estimate only */
  fv?: number;
  /** estimate only: the fvSprint question id, used to look up its generator. */
  fvId?: number;
};

const MARKET_CATEGORY: Record<string, FvCategory> = {
  card_sum: "Sums",
  card_signed_sum: "Sums",
  card_red_count: "Counts",
  card_face_count: "Counts",
  card_high: "Extremes",
  card_spread: "Extremes",
  card_any_ace: "Binary",
  card_same_color: "Binary",
  card_abs_signed_sum: "Extremes",
  card_product: "Products",
  card_signed_product: "Products",
  dice_sum: "Sums",
  dice_max: "Extremes",
  dice_spread: "Extremes",
  dice_product: "Products",
  coin_heads: "Counts",
  coin_longest_streak: "Counts",
  coin_has_hh: "Binary",
  coin_heads_squared: "Products",
};

/** Build the engine-backed market entries from the contract catalogue. */
function marketEntries(): BankEntry[] {
  return CATALOG.map((entry) => {
    const payoff = findPayoff(entry.payoffId);
    const name = payoff?.name ?? entry.payoffId;
    const prompt = payoff ? promptFor(payoff, entry.config) : entry.payoffId;
    // A handful of contracts share a payoff across dice counts; tag the id with
    // the source and count so ids stay unique.
    const id = `mk_${entry.source}_${entry.payoffId}_${entry.config.count}`;
    return {
      id,
      name,
      prompt,
      category: MARKET_CATEGORY[entry.payoffId] ?? "Sums",
      difficulty: entry.difficulty,
      source: entry.source,
      kind: "market",
      payoffId: entry.payoffId,
      config: entry.config,
    };
  });
}

/** Difficulty for a static fair value question, inferred from its category. */
function estimateDifficulty(category: FvCategory): Difficulty {
  if (category === "Products" || category === "Waiting" || category === "Conditional") {
    return "hard";
  }
  if (category === "Binary" || category === "Extremes") return "medium";
  return "easy";
}

/** Detect the underlying randomness from a free text fair value prompt. */
function estimateSource(prompt: string): SourceKind | "mixed" {
  const p = prompt.toLowerCase();
  const hasCard = /card|deck|ace|jack|queen|king|spade|hand/.test(p);
  const hasDice = /\bdie\b|dice|roll|face/.test(p);
  const hasCoin = /coin|flip|heads|tails/.test(p);
  const count = [hasCard, hasDice, hasCoin].filter(Boolean).length;
  if (count > 1) return "mixed";
  if (hasCard) return "cards";
  if (hasDice) return "dice";
  if (hasCoin) return "coins";
  return "mixed";
}

/** A short label for the table from a fair value prompt. */
function estimateName(prompt: string): string {
  const marker = prompt.lastIndexOf("Payoff = ");
  if (marker >= 0) {
    const tail = prompt.slice(marker + "Payoff = ".length).replace(/\.$/, "");
    return tail.charAt(0).toUpperCase() + tail.slice(1);
  }
  return prompt.replace(/\.$/, "");
}

function estimateEntries(): BankEntry[] {
  return FV_QUESTIONS.map((q) => ({
    id: `fv_${q.id}`,
    name: estimateName(q.prompt),
    prompt: q.prompt,
    category: q.category,
    difficulty: estimateDifficulty(q.category),
    source: estimateSource(q.prompt),
    kind: "estimate",
    fv: q.fv,
    fvId: q.id,
  }));
}

export const MARKET_BANK: BankEntry[] = [...marketEntries(), ...estimateEntries()];

export const BANK_CATEGORIES: FvCategory[] = [
  "Sums",
  "Counts",
  "Binary",
  "Extremes",
  "Products",
  "Waiting",
  "Conditional",
];

export const BANK_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export const BANK_SOURCES: Array<SourceKind | "mixed"> = [
  "cards",
  "dice",
  "coins",
  "mixed",
];

export type BankFilter = {
  kind?: BankKind | "all";
  difficulty?: Difficulty | "all";
  category?: FvCategory | "all";
  source?: SourceKind | "mixed" | "all";
  search?: string;
};

export function filterBank(filter: BankFilter): BankEntry[] {
  const search = filter.search?.trim().toLowerCase() ?? "";
  return MARKET_BANK.filter((e) => {
    if (filter.kind && filter.kind !== "all" && e.kind !== filter.kind) return false;
    if (filter.difficulty && filter.difficulty !== "all" && e.difficulty !== filter.difficulty) return false;
    if (filter.category && filter.category !== "all" && e.category !== filter.category) return false;
    if (filter.source && filter.source !== "all" && e.source !== filter.source) return false;
    if (search && !`${e.name} ${e.prompt}`.toLowerCase().includes(search)) return false;
    return true;
  });
}

/** Pick a random entry from a filtered set (the "roll the dice" affordance). */
export function randomEntry(entries: BankEntry[] = MARKET_BANK): BankEntry | null {
  if (entries.length === 0) return null;
  return entries[Math.floor(Math.random() * entries.length)];
}

export function findBankEntry(id: string): BankEntry | undefined {
  return MARKET_BANK.find((e) => e.id === id);
}
