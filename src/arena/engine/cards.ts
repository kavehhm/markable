import { Card, Color, GameConfig, GameState, Suit } from "./types";
import { combinations } from "./combinatorics";

const SUITS: Suit[] = ["spades", "clubs", "hearts", "diamonds"];
const SUIT_GLYPH: Record<Suit, string> = {
  spades: "♠",
  clubs: "♣",
  hearts: "♥",
  diamonds: "♦",
};
const COLOR_OF: Record<Suit, Color> = {
  spades: "black",
  clubs: "black",
  hearts: "red",
  diamonds: "red",
};

const RANK_LABEL: Record<number, string> = {
  1: "A",
  11: "J",
  12: "Q",
  13: "K",
};

function rankLabel(rank: number): string {
  return RANK_LABEL[rank] ?? String(rank);
}

/** Numeric value of a rank under the active value mapping. */
export function cardValue(rank: number, config: GameConfig): number {
  if (rank === 1) return config.aceHigh ? 14 : 1;
  if (rank >= 11 && config.facesAreTen) return 10;
  return rank; // 2..10, and J/Q/K = 11/12/13 by default
}

/** Build the full 52-card deck under the active value mapping. */
export function buildDeck(config: GameConfig): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({
        rank,
        suit,
        color: COLOR_OF[suit],
        label: `${rankLabel(rank)}${SUIT_GLYPH[suit]}`,
        value: cardValue(rank, config),
      });
    }
  }
  return deck;
}

/**
 * Enumerate every distinct hand of `count` cards drawn without replacement.
 * For count = 3 this yields C(52,3) = 22100 equally-likely states.
 */
export function enumerateCardStates(config: GameConfig): GameState[] {
  const deck = buildDeck(config);
  const combos = combinations(deck.length, config.count);
  const probability = 1 / combos.length;
  return combos.map((indices) => {
    const cards = indices.map((i) => deck[i]);
    return {
      id: indices.join("-"),
      probability,
      cards,
      label: cards.map((c) => c.label).join(" "),
    };
  });
}
