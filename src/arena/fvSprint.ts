// Fair Value Sprint: a fixed bank of quick fair value questions with a known
// answer for each. The goal is to practice producing a first fair value
// estimate fast, so grading is tolerance based, not exact to the decimal.
//
// Card convention across this bank: cards run 2 to 14, with Jack 11, Queen 12,
// King 13, Ace 14, unless a question states a different rule for the round.

export type FvCategory =
  | "Sums"
  | "Counts"
  | "Binary"
  | "Extremes"
  | "Products"
  | "Waiting"
  | "Conditional";

export type FvQuestion = {
  id: number;
  prompt: string;
  fv: number;
  category: FvCategory;
};

export const FV_CATEGORIES: FvCategory[] = [
  "Sums",
  "Counts",
  "Binary",
  "Extremes",
  "Products",
  "Waiting",
  "Conditional",
];

export const FV_QUESTIONS: FvQuestion[] = [
  { id: 1, category: "Sums", fv: 40.0, prompt: "5-card hand. Payoff = sum of card values." },
  { id: 2, category: "Sums", fv: 56.0, prompt: "7-card hand. Payoff = sum of card values." },
  { id: 3, category: "Sums", fv: 14.0, prompt: "Roll 4 dice. Payoff = sum." },
  { id: 4, category: "Sums", fv: 35.0, prompt: "Roll 10 dice. Payoff = sum." },
  { id: 5, category: "Sums", fv: 31.0, prompt: "Draw 3 cards and roll 2 dice. Payoff = total sum." },
  { id: 6, category: "Sums", fv: 55.36, prompt: "6-card hand. Ace and 10 are face up. Payoff = sum of all 6 cards." },
  { id: 7, category: "Sums", fv: 33.29, prompt: "5-card hand. 2, 3, and Queen are face up. Payoff = sum." },
  { id: 8, category: "Sums", fv: 71.18, prompt: "8-card hand. 9, 9, and Ace are face up. Payoff = sum." },
  { id: 9, category: "Sums", fv: 48.0, prompt: "Event: only cards worth 10 or more. 4-card hand. Payoff = sum." },
  { id: 10, category: "Sums", fv: 27.0, prompt: "Event: only cards worth 7 or less. 6-card hand. 7 and 2 are face up. Payoff = sum." },
  { id: 11, category: "Sums", fv: 41.77, prompt: "Event: only even-valued cards. 5-card hand. Ace and 4 are face up. Payoff = sum." },
  { id: 12, category: "Sums", fv: 40.0, prompt: "Event: only red cards. 5-card hand. Red Ace and red 2 are face up. Payoff = sum." },
  { id: 13, category: "Sums", fv: 34.77, prompt: "4-card hand. This round, Jacks are worth 20. Payoff = sum." },
  { id: 14, category: "Sums", fv: 43.08, prompt: "5-card hand. This round, 2s are worth 10. Payoff = sum." },
  { id: 15, category: "Sums", fv: 36.54, prompt: "5-card hand. This round, Aces are worth 5. Payoff = sum." },
  { id: 16, category: "Sums", fv: 69.78, prompt: "7-card hand. Ace, King, Queen are face up. Payoff = sum." },
  { id: 17, category: "Sums", fv: 40.0, prompt: "Event: only odd-valued cards. 5-card hand. King and 3 are face up. Payoff = sum." },
  { id: 18, category: "Sums", fv: 74.33, prompt: "Event: only cards worth 10 or more. 6-card hand. Ace and King are face up. Payoff = sum." },
  { id: 19, category: "Sums", fv: 21.88, prompt: "2-card hand. One Ace is face up. Payoff = sum." },
  { id: 20, category: "Sums", fv: 32.0, prompt: "4-card hand. One 8 is face up. Payoff = sum." },

  { id: 21, category: "Counts", fv: 10.0, prompt: "Flip 20 coins. Payoff = number of heads." },
  { id: 22, category: "Counts", fv: 3.0, prompt: "Roll 18 dice. Payoff = number of sixes." },
  { id: 23, category: "Counts", fv: 5.0, prompt: "10-card hand. Payoff = number of red cards." },
  { id: 24, category: "Counts", fv: 1.0, prompt: "13-card hand. Payoff = number of aces." },
  { id: 25, category: "Counts", fv: 1.92, prompt: "5-card hand. Payoff = number of cards worth 10 or more." },
  { id: 26, category: "Counts", fv: 3.77, prompt: "7-card hand. Payoff = number of even-valued cards." },
  { id: 27, category: "Counts", fv: 2.0, prompt: "8-card hand. Payoff = number of spades." },
  { id: 28, category: "Counts", fv: 0.59, prompt: "5-card hand. Payoff = number of unordered same-value pairs." },
  { id: 29, category: "Counts", fv: 2.5, prompt: "Roll 6 dice. Payoff = number of unordered matching pairs of dice." },
  { id: 30, category: "Counts", fv: 3.11, prompt: "Roll 4 dice. Payoff = number of distinct faces seen." },
  { id: 31, category: "Counts", fv: 4.44, prompt: "5-card hand. Payoff = number of distinct card values." },
  { id: 32, category: "Counts", fv: 0.38, prompt: "10-card hand. Payoff = number of black kings." },
  { id: 33, category: "Counts", fv: 2.75, prompt: "Flip 12 coins. Payoff = number of adjacent HT patterns." },
  { id: 34, category: "Counts", fv: 2.75, prompt: "Flip 10 coins. Payoff = number of runs of heads." },
  { id: 35, category: "Counts", fv: 0.75, prompt: "6-card hand. Payoff = number of card values that appear exactly twice." },

  { id: 36, category: "Binary", fv: 34.12, prompt: "5-card hand. Pays 100 if at least one ace appears, else 0." },
  { id: 37, category: "Binary", fv: 29.95, prompt: "5-card hand. Pays 100 if exactly one ace appears, else 0." },
  { id: 38, category: "Binary", fv: 16.67, prompt: "Roll 2 dice. Pays 100 if the sum is at least 10, else 0." },
  { id: 39, category: "Binary", fv: 51.77, prompt: "Roll 4 dice. Pays 100 if at least one six appears, else 0." },
  { id: 40, category: "Binary", fv: 25.0, prompt: "Flip 3 coins. Pays 100 if all flips are the same, else 0." },
  { id: 41, category: "Binary", fv: 31.25, prompt: "Flip 5 coins. Pays 100 if exactly 3 heads appear, else 0." },
  { id: 42, category: "Binary", fv: 2.53, prompt: "5-card hand. Pays 100 if all cards are red, else 0." },
  { id: 43, category: "Binary", fv: 5.88, prompt: "2-card hand. Pays 100 if both cards have the same value, else 0." },
  { id: 44, category: "Binary", fv: 92.25, prompt: "5-card hand. Pays 100 if at least one card is worth 10 or more, else 0." },
  { id: 45, category: "Binary", fv: 16.67, prompt: "Roll 2 dice. Pays 100 if their product is greater than 20, else 0." },
  { id: 46, category: "Binary", fv: 42.13, prompt: "Roll 3 dice. Pays 100 if the maximum roll is 6, else 0." },
  { id: 47, category: "Binary", fv: 3.99, prompt: "5-card hand. Pays 100 if exactly two aces appear, else 0." },
  { id: 48, category: "Binary", fv: 41.18, prompt: "2-card hand. Pays 100 if the higher card is at least Queen, else 0." },
  { id: 49, category: "Binary", fv: 11.27, prompt: "Roll 4 dice. Pays 100 if the sum is exactly 14, else 0." },
  { id: 50, category: "Binary", fv: 44.44, prompt: "Roll 3 dice. Pays 100 if at least two dice show the same face, else 0." },

  { id: 51, category: "Extremes", fv: 4.47, prompt: "Roll 2 dice. Payoff = maximum roll." },
  { id: 52, category: "Extremes", fv: 4.96, prompt: "Roll 3 dice. Payoff = maximum roll." },
  { id: 53, category: "Extremes", fv: 2.53, prompt: "Roll 2 dice. Payoff = minimum roll." },
  { id: 54, category: "Extremes", fv: 2.92, prompt: "Roll 3 dice. Payoff = max minus min." },
  { id: 55, category: "Extremes", fv: 3.49, prompt: "Roll 4 dice. Payoff = max minus min." },
  { id: 56, category: "Extremes", fv: 11.29, prompt: "3-card hand. Payoff = highest card value." },
  { id: 57, category: "Extremes", fv: 4.71, prompt: "3-card hand. Payoff = lowest card value." },
  { id: 58, category: "Extremes", fv: 6.59, prompt: "3-card hand. Payoff = highest minus lowest." },
  { id: 59, category: "Extremes", fv: 8.77, prompt: "5-card hand. Payoff = highest minus lowest." },
  { id: 60, category: "Extremes", fv: 4.39, prompt: "2-card hand. Payoff = absolute difference between card values." },
  { id: 61, category: "Extremes", fv: 10.2, prompt: "2-card hand. Payoff = highest card value." },
  { id: 62, category: "Extremes", fv: 5.8, prompt: "2-card hand. Payoff = lowest card value." },
  { id: 63, category: "Extremes", fv: 3.02, prompt: "Event: only cards worth 10 or more. 4-card hand. Payoff = highest minus lowest." },
  { id: 64, category: "Extremes", fv: 6.32, prompt: "Event: only cards worth 7 or less. 4-card hand. Payoff = highest card value." },
  { id: 65, category: "Extremes", fv: 6.46, prompt: "Draw 3 values with replacement from 2 to 14. Payoff = highest minus lowest." },

  { id: 66, category: "Products", fv: 12.25, prompt: "Roll 2 dice. Payoff = product." },
  { id: 67, category: "Products", fv: 42.88, prompt: "Roll 3 dice. Payoff = product." },
  { id: 68, category: "Products", fv: 63.73, prompt: "2-card hand. Payoff = product of card values." },
  { id: 69, category: "Products", fv: 505.41, prompt: "3-card hand. Payoff = product of card values." },
  { id: 70, category: "Products", fv: 15.17, prompt: "Roll 1 die. Payoff = square of the roll." },
  { id: 71, category: "Products", fv: 78.0, prompt: "Draw 1 card. Payoff = square of the card value." },
  { id: 72, category: "Products", fv: 54.83, prompt: "Roll 2 dice. Payoff = square of the sum." },
  { id: 73, category: "Products", fv: 1.94, prompt: "Roll 2 dice. Payoff = absolute difference." },
  { id: 74, category: "Products", fv: 45.5, prompt: "Roll 3 dice. Payoff = sum of squared rolls." },
  { id: 75, category: "Products", fv: 10.53, prompt: "Roll 3 dice. Payoff = minimum roll times maximum roll." },
  { id: 76, category: "Products", fv: 25.89, prompt: "Roll 3 dice. Payoff = square of the maximum roll." },
  { id: 77, category: "Products", fv: 27.5, prompt: "Flip 10 coins. Payoff = square of number of heads." },
  { id: 78, category: "Products", fv: 5.67, prompt: "Roll 12 dice. Payoff = square of number of sixes." },
  { id: 79, category: "Products", fv: 110.35, prompt: "2-card hand. One Ace is face up. Payoff = product of the two card values." },
  { id: 80, category: "Products", fv: 616.35, prompt: "3-card hand. Payoff = square of the sum of card values." },

  { id: 81, category: "Waiting", fv: 2.0, prompt: "Expected flips until first heads." },
  { id: 82, category: "Waiting", fv: 6.0, prompt: "Expected die rolls until first six." },
  { id: 83, category: "Waiting", fv: 6.0, prompt: "Expected flips until two consecutive heads." },
  { id: 84, category: "Waiting", fv: 42.0, prompt: "Expected die rolls until two consecutive sixes." },
  { id: 85, category: "Waiting", fv: 14.7, prompt: "Expected die rolls until all 6 faces have appeared." },
  { id: 86, category: "Waiting", fv: 11.0, prompt: "Expected die rolls until all even faces, 2, 4, and 6, have appeared." },
  { id: 87, category: "Waiting", fv: 10.6, prompt: "Cards drawn from shuffled deck until first Ace. Payoff = number of draws." },
  { id: 88, category: "Waiting", fv: 1.96, prompt: "Cards drawn from shuffled deck until first red card. Payoff = number of draws." },
  { id: 89, category: "Waiting", fv: 4.0, prompt: "Expected coin flips until pattern HT appears." },
  { id: 90, category: "Waiting", fv: 3.77, prompt: "Expected die rolls until the first repeated face appears." },

  { id: 91, category: "Conditional", fv: 40.0, prompt: "Event: only black cards. 5-card hand. Black Ace and black 2 are face up. Payoff = sum." },
  { id: 92, category: "Conditional", fv: 1.24, prompt: "5-card hand. One Ace is face up. Payoff = number of aces in the hand." },
  { id: 93, category: "Conditional", fv: 3.92, prompt: "6-card hand. Two red cards are face up. Payoff = number of red cards in the hand." },
  { id: 94, category: "Conditional", fv: 2.52, prompt: "6-card hand. King and 3 are face up. Payoff = number of cards worth 10 or more." },
  { id: 95, category: "Conditional", fv: 4.5, prompt: "Roll 3 dice. One die is shown as 2. Payoff = maximum of all 3 dice." },
  { id: 96, category: "Conditional", fv: 10.96, prompt: "Roll 5 dice. Two dice are shown as 6 and 1. Payoff = sum of largest two dice." },
  { id: 97, category: "Conditional", fv: 7.0, prompt: "Flip 4 coins. First flip is heads. Payoff = square of number of heads." },
  { id: 98, category: "Conditional", fv: 9.42, prompt: "5-card hand. Ace and King are face up. Payoff = highest minus lowest." },
  { id: 99, category: "Conditional", fv: 12.0, prompt: "5-card hand. 2 and Ace are face up. Payoff = highest minus lowest." },
  { id: 100, category: "Conditional", fv: 630.9, prompt: "3-card hand. 10 is face up. Payoff = product of all 3 card values." },
];

export type FvGrade = "good" | "warn" | "bad";

/**
 * Grade an estimate against the known fair value. The point of the drill is a
 * fast first estimate, so the bands are deliberately forgiving: a guess within
 * about 10% (with a small absolute floor) counts as correct.
 */
export function gradeFv(guess: number, answer: number): FvGrade {
  const err = Math.abs(guess - answer);
  const correctBand = Math.max(0.5, 0.1 * Math.abs(answer));
  const closeBand = Math.max(1.0, 0.2 * Math.abs(answer));
  if (err <= correctBand) return "good";
  if (err <= closeBand) return "warn";
  return "bad";
}

/** Fisher-Yates shuffle returning a new array of indices into the input list. */
export function shuffledOrder(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
