// Core engine types for the Quant Arena market-making simulator.
// Everything here is source-agnostic: cards, dice, coins, and urns all
// reduce to a finite, enumerable state space with a probability weight.

export type Suit = "spades" | "clubs" | "hearts" | "diamonds";
export type Color = "black" | "red";

export type Card = {
  /** 1..13, where 1 = Ace, 11 = Jack, 12 = Queen, 13 = King (rank index). */
  rank: number;
  suit: Suit;
  color: Color;
  /** Display label e.g. "A♠", "10♦". */
  label: string;
  /** Numeric value used by payoff functions (depends on the value map). */
  value: number;
};

export type SourceKind = "cards" | "dice" | "coins" | "latent";

export type LatentValue = string | number | boolean;

export type LatentStateSpec = {
  id: string;
  label: string;
  /** Relative likelihood. Values are normalized by the latent enumerator. */
  weight: number;
  values: Record<string, LatentValue>;
};

/** A single fully-specified outcome of the generator plus its probability. */
export type GameState = {
  id: string;
  /** Probability mass of this state (states sum to 1). */
  probability: number;
  /** Cards, if this is a card game. */
  cards?: Card[];
  /** Dice faces, if a dice game. */
  dice?: number[];
  /** Coin flips (true = heads), if a coin game. */
  coins?: boolean[];
  /** Generic finite hidden state for interview-style latent variables. */
  latent?: Record<string, LatentValue>;
  /** Human-readable description of the outcome, e.g. "A♠ 7♥ K♦". */
  label: string;
};

/**
 * How a payoff should be framed to the user.
 *   value     : a numeric level (sum, product, count, spread).
 *   symmetric : centred at zero, so width matters more than level.
 *   indicator : a 0 or 1 event, quoted as a probability.
 */
export type PayoffKind = "value" | "symmetric" | "indicator";

/** A payoff (the contract being made a market on). */
export type PayoffFunction = {
  id: string;
  name: string;
  description: string;
  /** Short plain note on how to estimate it in your head. */
  mentalModel: string;
  kind: PayoffKind;
  evaluate: (state: GameState) => number;
};

/** Full game configuration -> enumerable. */
export type GameConfig = {
  source: SourceKind;
  /** Cards: number drawn. Dice/coins: number rolled/flipped. */
  count: number;
  /** Card value mapping. */
  aceHigh?: boolean; // A = 14 when true, else A = 1
  facesAreTen?: boolean; // J/Q/K = 10 when true, else 11/12/13
  /** Dice: number of faces (default 6). */
  diceFaces?: number;
  /** Latent interview game: finite state space with weighted prior. */
  latentStates?: LatentStateSpec[];
  latentLabel?: string;
};

export type Distribution = {
  /** Sorted ascending by value. */
  points: Array<{ value: number; probability: number; count: number }>;
  total: number; // total raw count (states)
};

export type DistributionStats = {
  ev: number;
  variance: number;
  std: number;
  min: number;
  max: number;
  median: number;
  /** quantile -> value, e.g. q[0.25]. */
  quantiles: Record<number, number>;
};

export type CounterpartyType =
  | "uninformed"
  | "informed"
  | "partial"
  | "noisy";

export type TradeAction = "buy_from_user" | "sell_to_user" | "pass";

export type Quote = {
  bid: number;
  ask: number;
};

export type CounterpartyContext = {
  type: CounterpartyType;
  /** Public fair value used by the uninformed counterparty. */
  fairValue: number;
  /** True realized payoff Y (used by the informed counterparty). */
  truePayoff: number;
  /** For partial info: the conditional EV given the counterparty's signal. */
  partialEv?: number;
  /** For noisy: probability of a random (non-optimal) action. */
  noise?: number;
  /** Deterministic 0..1 draw for noisy decisions (keeps things testable). */
  noiseDraw?: number;
};

export type Objective =
  | "fair"
  | "defensive"
  | "max_ev"
  | "max_worst_case";
