import { Card, GameState, PayoffFunction } from "./types";

// --- small helpers --------------------------------------------------------

function cards(state: GameState): Card[] {
  return state.cards ?? [];
}
function dice(state: GameState): number[] {
  return state.dice ?? [];
}
function coins(state: GameState): boolean[] {
  return state.coins ?? [];
}
function latentNumber(state: GameState, key: string): number {
  const value = state.latent?.[key];
  return typeof value === "number" ? value : 0;
}
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const product = (xs: number[]) => xs.reduce((a, b) => a * b, 1);
const signed = (cs: Card[]) => cs.map((c) => (c.color === "black" ? c.value : -c.value));

// --- CARD payoff templates ------------------------------------------------

export const CARD_PAYOFFS: PayoffFunction[] = [
  {
    id: "card_sum",
    name: "Sum of the cards",
    description: "Add the face values of every card.",
    mentalModel:
      "Each card averages about 7, so three cards sit near 3 times 7, which is 21.",
    kind: "value",
    evaluate: (s) => sum(cards(s).map((c) => c.value)),
  },
  {
    id: "card_product",
    name: "Product of the cards",
    description: "Multiply the face values of every card.",
    kind: "value",
    mentalModel:
      "Very skewed. Most hands land low, but a few large cards blow the value up, so the median sits well below the mean.",
    evaluate: (s) => product(cards(s).map((c) => c.value)),
  },
  {
    id: "card_signed_sum",
    name: "Black total minus red total",
    description:
      "Add the black card values, then subtract the red card values. Black adds, red subtracts.",
    kind: "symmetric",
    mentalModel:
      "Colour does not depend on value, so the fair value is exactly 0. You are pricing how spread out it can be, not the level.",
    evaluate: (s) => sum(signed(cards(s))),
  },
  {
    id: "card_abs_signed_sum",
    name: "Gap between black and red totals",
    description: "The size of the black total minus red total, ignoring sign.",
    kind: "value",
    mentalModel:
      "Always at least 0. This is a pure dispersion bet, so the fair value reflects how far apart the colours usually land.",
    evaluate: (s) => Math.abs(sum(signed(cards(s)))),
  },
  {
    id: "card_signed_product",
    name: "Signed product, red negative",
    description:
      "Multiply the values, counting red cards as negative numbers.",
    kind: "symmetric",
    mentalModel:
      "Positive when an even number of red cards appear. Symmetric around 0 with very fat tails.",
    evaluate: (s) => product(signed(cards(s))),
  },
  {
    id: "card_spread",
    name: "Highest minus lowest",
    description: "The top card value minus the bottom card value.",
    kind: "value",
    mentalModel:
      "Always at least 0. With three of thirteen ranks the gap usually lands around 7 to 9.",
    evaluate: (s) => {
      const v = cards(s).map((c) => c.value);
      return Math.max(...v) - Math.min(...v);
    },
  },
  {
    id: "card_high",
    name: "Highest card",
    description: "The largest single card value in the hand.",
    kind: "value",
    mentalModel: "An order statistic, skewed high. Expect roughly 10 to 11.",
    evaluate: (s) => Math.max(...cards(s).map((c) => c.value)),
  },
  {
    id: "card_red_count",
    name: "Number of red cards",
    description: "How many cards are hearts or diamonds.",
    kind: "value",
    mentalModel:
      "The deck is half red, so three cards average 1.5 red. Range is 0 to 3.",
    evaluate: (s) => cards(s).filter((c) => c.color === "red").length,
  },
  {
    id: "card_face_count",
    name: "Number of face cards",
    description: "How many cards are Jack, Queen, or King.",
    kind: "value",
    mentalModel:
      "Twelve of fifty two cards are faces, about 3 in 13, so three cards average near 0.7.",
    evaluate: (s) => cards(s).filter((c) => c.rank >= 11).length,
  },
  {
    id: "card_any_ace",
    name: "At least one ace",
    description: "Pays 1 if any card is an ace, otherwise 0.",
    kind: "indicator",
    mentalModel:
      "Chance of no ace is about 0.78, so the fair value is about 0.22.",
    evaluate: (s) => (cards(s).some((c) => c.rank === 1) ? 1 : 0),
  },
  {
    id: "card_same_color",
    name: "All cards same colour",
    description: "Pays 1 if every card shares one colour, otherwise 0.",
    kind: "indicator",
    mentalModel:
      "All black plus all red is about 0.235, so price it near a quarter.",
    evaluate: (s) => {
      const cs = cards(s);
      return cs.every((c) => c.color === cs[0].color) ? 1 : 0;
    },
  },
];

// --- DICE payoff templates ------------------------------------------------

export const DICE_PAYOFFS: PayoffFunction[] = [
  {
    id: "dice_sum",
    name: "Sum of the dice",
    description: "Add every die face.",
    kind: "value",
    mentalModel: "Each die averages 3.5, so the fair value is 3.5 times the count.",
    evaluate: (s) => sum(dice(s)),
  },
  {
    id: "dice_product",
    name: "Product of the dice",
    description: "Multiply every die face.",
    kind: "value",
    mentalModel: "Skewed high. The mean is 3.5 to the power of the dice count.",
    evaluate: (s) => product(dice(s)),
  },
  {
    id: "dice_max",
    name: "Highest die",
    description: "The largest face shown.",
    kind: "value",
    mentalModel: "With more dice the highest face drifts toward 6.",
    evaluate: (s) => Math.max(...dice(s)),
  },
  {
    id: "dice_min",
    name: "Lowest die",
    description: "The smallest face shown.",
    kind: "value",
    mentalModel: "With more dice the lowest face drifts toward 1.",
    evaluate: (s) => Math.min(...dice(s)),
  },
  {
    id: "dice_spread",
    name: "Highest minus lowest",
    description: "The range of the dice.",
    kind: "value",
    mentalModel: "Always at least 0 and grows with the number of dice.",
    evaluate: (s) => Math.max(...dice(s)) - Math.min(...dice(s)),
  },
  {
    id: "dice_distinct",
    name: "Number of distinct faces",
    description: "How many different values appear.",
    kind: "value",
    mentalModel: "Capped at the smaller of dice count and 6. Collisions pull it down.",
    evaluate: (s) => new Set(dice(s)).size,
  },
];

// --- COIN payoff templates ------------------------------------------------

export const COIN_PAYOFFS: PayoffFunction[] = [
  {
    id: "coin_heads",
    name: "Number of heads",
    description: "Count the heads in the sequence.",
    kind: "value",
    mentalModel: "Binomial with p one half. Fair value is half the flips.",
    evaluate: (s) => coins(s).filter(Boolean).length,
  },
  {
    id: "coin_heads_minus_tails",
    name: "Heads minus tails",
    description: "Heads count minus tails count.",
    kind: "symmetric",
    mentalModel: "Symmetric around 0. You are pricing the swing, not the level.",
    evaluate: (s) => {
      const h = coins(s).filter(Boolean).length;
      return h - (coins(s).length - h);
    },
  },
  {
    id: "coin_longest_streak",
    name: "Longest run of heads",
    description: "The length of the longest back to back head streak.",
    kind: "value",
    mentalModel: "Grows slowly with the number of flips. Clusters matter.",
    evaluate: (s) => {
      let best = 0;
      let cur = 0;
      for (const h of coins(s)) {
        cur = h ? cur + 1 : 0;
        best = Math.max(best, cur);
      }
      return best;
    },
  },
  {
    id: "coin_has_hh",
    name: "Two heads in a row appears",
    description: "Pays 1 if heads ever lands twice back to back, otherwise 0.",
    kind: "indicator",
    mentalModel: "Becomes very likely as the number of flips grows.",
    evaluate: (s) => {
      const c = coins(s);
      for (let i = 1; i < c.length; i++) if (c[i] && c[i - 1]) return 1;
      return 0;
    },
  },
  {
    id: "coin_heads_squared",
    name: "Heads count, squared",
    description: "Square the number of heads.",
    kind: "value",
    mentalModel:
      "Convex, so the mean sits above the square of the average head count.",
    evaluate: (s) => {
      const h = coins(s).filter(Boolean).length;
      return h * h;
    },
  },
];

// --- LATENT interview-state payoff templates ------------------------------

export const LATENT_PAYOFFS: PayoffFunction[] = [
  {
    id: "latent_number_line",
    name: "Hidden number-line value",
    description:
      "A true fair value is picked from a center-heavy number line. Quote the value and use toxic flow to cut down the interval.",
    kind: "symmetric",
    mentalModel:
      "Start near zero because the prior is center-heavy. Tight quotes are useful only when they split meaningful posterior mass.",
    evaluate: (s) => latentNumber(s, "value"),
  },
  {
    id: "latent_hit_rate",
    name: "Unknown hit-rate edge",
    description:
      "A hidden process has an unknown success probability. The contract pays the expected number of hits in ten trials.",
    kind: "value",
    mentalModel:
      "This is Bayesian parameter inference. The right quote tracks the posterior mean, while wide quotes preserve information.",
    evaluate: (s) => latentNumber(s, "value"),
  },
  {
    id: "latent_news_jump",
    name: "Post-news fair value",
    description:
      "An anchor price of 100 receives a hidden discrete news shock. Quote the new fair value after the headline.",
    kind: "value",
    mentalModel:
      "Do not over-anchor to 100. The tails are rare but large, so every pass or toxic trade matters.",
    evaluate: (s) => latentNumber(s, "value"),
  },
  {
    id: "latent_toxic_flow",
    name: "Next-tick markout",
    description:
      "The hidden flow type determines the markout after you quote. Retail flow is mild; informed sweeps are painful.",
    kind: "symmetric",
    mentalModel:
      "Interview market-making games often hide who you are trading against. A lifted ask or hit bid is evidence about toxicity, not just PnL.",
    evaluate: (s) => latentNumber(s, "value"),
  },
  {
    id: "latent_vol_regime",
    name: "One-minute absolute move",
    description:
      "A hidden volatility regime sets the realized absolute move in basis points.",
    kind: "value",
    mentalModel:
      "Low-vol states are common, stress states dominate the tail. Quote the mixture, not the modal outcome.",
    evaluate: (s) => latentNumber(s, "value"),
  },
  {
    id: "latent_pair_residual",
    name: "Pair-spread residual",
    description:
      "A hidden residual after a pairs-trading signal can mean-revert, drift, or break correlation.",
    kind: "symmetric",
    mentalModel:
      "The center is likely, but correlation breaks create fat tails. Your quote should reveal whether the desk knows a break is live.",
    evaluate: (s) => latentNumber(s, "value"),
  },
];

export function payoffsForSource(
  source: "cards" | "dice" | "coins" | "latent",
): PayoffFunction[] {
  if (source === "cards") return CARD_PAYOFFS;
  if (source === "dice") return DICE_PAYOFFS;
  if (source === "coins") return COIN_PAYOFFS;
  return LATENT_PAYOFFS;
}

export function findPayoff(id: string): PayoffFunction | undefined {
  return [...CARD_PAYOFFS, ...DICE_PAYOFFS, ...COIN_PAYOFFS, ...LATENT_PAYOFFS].find(
    (p) => p.id === id,
  );
}
