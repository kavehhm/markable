import { Difficulty } from "./games";
import { GameConfig, LatentStateSpec, SourceKind } from "./types";

export type InferenceScenario = {
  id: string;
  title: string;
  source: SourceKind;
  difficulty: Difficulty;
  payoffId: string;
  config: GameConfig;
  rounds: number;
  setup: string;
  prompt: string;
  resetLabel: string;
};

function weightedStates(
  prefix: string,
  values: Array<{ label: string; value: number; weight: number; extra?: Record<string, string | number | boolean> }>,
): LatentStateSpec[] {
  return values.map((v, i) => ({
    id: `${prefix}_${i}`,
    label: v.label,
    weight: v.weight,
    values: { value: v.value, ...v.extra },
  }));
}

function numberLineConfig(): GameConfig {
  return {
    source: "latent",
    count: 21,
    latentLabel: "one hidden integer from -10 to 10 with a centre heavy prior",
    latentStates: Array.from({ length: 21 }, (_, i) => {
      const value = i - 10;
      return {
        id: `nl_${value}`,
        label: `x = ${value}`,
        weight: 11 - Math.abs(value),
        values: { value },
      };
    }),
  };
}

const HIT_RATE_CONFIG: GameConfig = {
  source: "latent",
  count: 7,
  latentLabel: "one hidden hit rate for a ten trial process",
  latentStates: weightedStates("hit", [
    { label: "cold process, p = 20%", value: 2, weight: 1, extra: { hitRate: 0.2 } },
    { label: "weak process, p = 30%", value: 3, weight: 3, extra: { hitRate: 0.3 } },
    { label: "slightly weak, p = 40%", value: 4, weight: 6, extra: { hitRate: 0.4 } },
    { label: "fair process, p = 50%", value: 5, weight: 8, extra: { hitRate: 0.5 } },
    { label: "slightly strong, p = 60%", value: 6, weight: 6, extra: { hitRate: 0.6 } },
    { label: "strong process, p = 70%", value: 7, weight: 3, extra: { hitRate: 0.7 } },
    { label: "hot process, p = 80%", value: 8, weight: 1, extra: { hitRate: 0.8 } },
  ]),
};

const NEWS_JUMP_CONFIG: GameConfig = {
  source: "latent",
  count: 9,
  latentLabel: "one hidden post news jump around an anchor price of 100",
  latentStates: weightedStates("news", [
    { label: "major miss, shock -18", value: 82, weight: 1, extra: { shock: -18 } },
    { label: "clear miss, shock -11", value: 89, weight: 2, extra: { shock: -11 } },
    { label: "soft miss, shock -6", value: 94, weight: 5, extra: { shock: -6 } },
    { label: "small miss, shock -2", value: 98, weight: 8, extra: { shock: -2 } },
    { label: "inline print, shock 0", value: 100, weight: 10, extra: { shock: 0 } },
    { label: "small beat, shock +2", value: 102, weight: 8, extra: { shock: 2 } },
    { label: "clean beat, shock +6", value: 106, weight: 5, extra: { shock: 6 } },
    { label: "large beat, shock +11", value: 111, weight: 2, extra: { shock: 11 } },
    { label: "takeout rumor, shock +18", value: 118, weight: 1, extra: { shock: 18 } },
  ]),
};

const TOXIC_FLOW_CONFIG: GameConfig = {
  source: "latent",
  count: 7,
  latentLabel: "one hidden counterparty-flow regime",
  latentStates: weightedStates("flow", [
    { label: "retail seller, mild down markout", value: -3, weight: 7, extra: { regime: "retail sell" } },
    { label: "balanced flow, no markout", value: 0, weight: 10, extra: { regime: "balanced" } },
    { label: "retail buyer, mild up markout", value: 3, weight: 7, extra: { regime: "retail buy" } },
    { label: "informed seller, adverse down move", value: -9, weight: 3, extra: { regime: "informed sell" } },
    { label: "informed buyer, adverse up move", value: 9, weight: 3, extra: { regime: "informed buy" } },
    { label: "stop run down, extreme toxic print", value: -15, weight: 1, extra: { regime: "stop run down" } },
    { label: "stop run up, extreme toxic print", value: 15, weight: 1, extra: { regime: "stop run up" } },
  ]),
};

const VOL_REGIME_CONFIG: GameConfig = {
  source: "latent",
  count: 6,
  latentLabel: "one hidden volatility regime",
  latentStates: weightedStates("vol", [
    { label: "dead tape, 4 bps absolute move", value: 4, weight: 10, extra: { regime: "dead" } },
    { label: "calm tape, 8 bps absolute move", value: 8, weight: 12, extra: { regime: "calm" } },
    { label: "normal tape, 14 bps absolute move", value: 14, weight: 9, extra: { regime: "normal" } },
    { label: "busy tape, 22 bps absolute move", value: 22, weight: 5, extra: { regime: "busy" } },
    { label: "stress tape, 35 bps absolute move", value: 35, weight: 2, extra: { regime: "stress" } },
    { label: "event tape, 55 bps absolute move", value: 55, weight: 1, extra: { regime: "event" } },
  ]),
};

const PAIR_RESIDUAL_CONFIG: GameConfig = {
  source: "latent",
  count: 9,
  latentLabel: "one hidden pairs trading residual after a signal",
  latentStates: weightedStates("pair", [
    { label: "correlation break lower, residual -45 bps", value: -45, weight: 1, extra: { regime: "break lower" } },
    { label: "hard mean reversion lower, residual -25 bps", value: -25, weight: 3, extra: { regime: "lower" } },
    { label: "soft lower residual, -12 bps", value: -12, weight: 7, extra: { regime: "soft lower" } },
    { label: "tiny lower residual, -5 bps", value: -5, weight: 9, extra: { regime: "tiny lower" } },
    { label: "flat residual, 0 bps", value: 0, weight: 12, extra: { regime: "flat" } },
    { label: "tiny upper residual, +5 bps", value: 5, weight: 9, extra: { regime: "tiny upper" } },
    { label: "soft upper residual, +12 bps", value: 12, weight: 7, extra: { regime: "soft upper" } },
    { label: "hard mean reversion upper, +25 bps", value: 25, weight: 3, extra: { regime: "upper" } },
    { label: "correlation break upper, residual +45 bps", value: 45, weight: 1, extra: { regime: "break upper" } },
  ]),
};

export const INFERENCE_SCENARIOS: InferenceScenario[] = [
  {
    id: "cards_sum",
    title: "Card Sum Inference",
    source: "cards",
    difficulty: "easy",
    payoffId: "card_sum",
    config: { source: "cards", count: 3, aceHigh: false, facesAreTen: false },
    rounds: 3,
    setup: "3 hidden cards from a 52 card deck",
    prompt:
      "An informed desk knows the three cards. Quote the sum, read each trade or pass, then name the hidden payoff.",
    resetLabel: "New hidden cards",
  },
  {
    id: "cards_product",
    title: "Fat Tail Card Product",
    source: "cards",
    difficulty: "hard",
    payoffId: "card_product",
    config: { source: "cards", count: 3, aceHigh: false, facesAreTen: false },
    rounds: 4,
    setup: "3 hidden cards with a skewed product payoff",
    prompt:
      "The product has a low median and a fat right tail. Use informed flow to separate ordinary hands from blowups.",
    resetLabel: "New hidden cards",
  },
  {
    id: "cards_signed",
    title: "Signed Color Total",
    source: "cards",
    difficulty: "medium",
    payoffId: "card_signed_sum",
    config: { source: "cards", count: 3, aceHigh: false, facesAreTen: false },
    rounds: 3,
    setup: "3 hidden cards, black adds and red subtracts",
    prompt:
      "This is centered at zero. Quote around the posterior, not around the absolute card total.",
    resetLabel: "New hidden cards",
  },
  {
    id: "dice_sum_hidden",
    title: "Hidden Dice Sum",
    source: "dice",
    difficulty: "easy",
    payoffId: "dice_sum",
    config: { source: "dice", count: 3, diceFaces: 6 },
    rounds: 3,
    setup: "3 hidden six sided dice",
    prompt:
      "An informed desk knows the three dice. Quote the sum, read each trade or pass, then name the hidden total.",
    resetLabel: "New hidden dice",
  },
  {
    id: "coin_heads_hidden",
    title: "Hidden Heads Count",
    source: "coins",
    difficulty: "medium",
    payoffId: "coin_heads",
    config: { source: "coins", count: 6 },
    rounds: 3,
    setup: "6 hidden coin flips",
    prompt:
      "The desk knows the flips. Quote the number of heads, narrow it with each trade, then pick the hidden count.",
    resetLabel: "New hidden flips",
  },
  {
    id: "number_line",
    title: "Number Line Market",
    source: "latent",
    difficulty: "easy",
    payoffId: "latent_number_line",
    config: numberLineConfig(),
    rounds: 4,
    setup: "one hidden integer from -10 to 10",
    prompt:
      "A fair value is picked from a number line with more mass near zero. Use your quotes like interval cuts, then pick the hidden number.",
    resetLabel: "New hidden number",
  },
  {
    id: "hit_rate",
    title: "Unknown Hit Rate",
    source: "latent",
    difficulty: "medium",
    payoffId: "latent_hit_rate",
    config: HIT_RATE_CONFIG,
    rounds: 4,
    setup: "one hidden success probability, paid as expected hits out of ten",
    prompt:
      "You are quoting a process with unknown edge. The informed desk knows the hit rate and only trades when your price is wrong.",
    resetLabel: "New hidden hit rate",
  },
  {
    id: "news_jump",
    title: "News Jump Repricing",
    source: "latent",
    difficulty: "medium",
    payoffId: "latent_news_jump",
    config: NEWS_JUMP_CONFIG,
    rounds: 4,
    setup: "anchor 100 plus one hidden discrete news shock",
    prompt:
      "The prior is anchored near 100, but the interview trap is underpricing tail headlines.",
    resetLabel: "New hidden headline",
  },
  {
    id: "toxic_flow",
    title: "Toxic Flow Regime",
    source: "latent",
    difficulty: "hard",
    payoffId: "latent_toxic_flow",
    config: TOXIC_FLOW_CONFIG,
    rounds: 5,
    setup: "one hidden counterparty-flow regime",
    prompt:
      "The hidden state is who is on the other side. Retail flow is mild; informed sweeps create adverse markout.",
    resetLabel: "New hidden flow",
  },
  {
    id: "vol_regime",
    title: "Volatility Regime",
    source: "latent",
    difficulty: "medium",
    payoffId: "latent_vol_regime",
    config: VOL_REGIME_CONFIG,
    rounds: 4,
    setup: "one hidden volatility regime, payoff in basis points",
    prompt:
      "Estimate the expected absolute move while using trade/no-trade information to detect whether a stress regime is live.",
    resetLabel: "New hidden regime",
  },
  {
    id: "pair_residual",
    title: "Pair Residual Break",
    source: "latent",
    difficulty: "hard",
    payoffId: "latent_pair_residual",
    config: PAIR_RESIDUAL_CONFIG,
    rounds: 5,
    setup: "one hidden residual after a pairs signal, in basis points",
    prompt:
      "Most pair residuals stay near flat, but correlation breaks are interview grade tail risk.",
    resetLabel: "New hidden residual",
  },
];

export function findInferenceScenario(idOrPayoffId?: string): InferenceScenario {
  return (
    INFERENCE_SCENARIOS.find((s) => s.id === idOrPayoffId || s.payoffId === idOrPayoffId) ??
    INFERENCE_SCENARIOS[0]
  );
}
