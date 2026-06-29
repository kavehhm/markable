// Fermi estimation tied into market making. Each question has a defensible
// reference answer and a worked decomposition. The user makes a market on the
// quantity, then sees the reasoning and a score based on order of magnitude.

export type FermiQuestion = {
  id: string;
  prompt: string;
  unit: string;
  answer: number;
  /** Worked order of magnitude decomposition, one factor per line. */
  steps: string[];
  difficulty: "easy" | "medium" | "hard";
};

export const FERMI_QUESTIONS: FermiQuestion[] = [
  {
    id: "piano_tuners",
    prompt: "How many piano tuners work in Chicago?",
    unit: "tuners",
    answer: 125,
    difficulty: "medium",
    steps: [
      "Chicago has roughly 2.7 million people, about 1 million households.",
      "Say 1 in 20 households owns a piano, so about 50,000 pianos.",
      "A piano is tuned about once a year, so 50,000 tunings a year.",
      "A tuner does about 4 a day times 250 days, so about 1,000 a year.",
      "50,000 divided by 1,000 is about 50 to 125 tuners.",
    ],
  },
  {
    id: "golf_balls_bus",
    prompt: "How many golf balls fit inside a school bus?",
    unit: "golf balls",
    answer: 500000,
    difficulty: "easy",
    steps: [
      "A bus is roughly 12m by 2.5m by 2.5m, about 75 cubic metres.",
      "A golf ball is about 4cm across, roughly 70 cubic cm with packing.",
      "75 cubic metres is 75 million cubic cm.",
      "Divide by about 100 cubic cm each with gaps and seats.",
      "Lands near 500,000 balls.",
    ],
  },
  {
    id: "manhattan_coffee",
    prompt: "How many cups of coffee are sold in Manhattan on a weekday?",
    unit: "cups",
    answer: 3000000,
    difficulty: "medium",
    steps: [
      "Manhattan holds about 1.6 million residents plus roughly 1.5 million commuters.",
      "Call it 3 million people present on a weekday.",
      "Say the average person buys about 1 cup that day.",
      "That gives about 3 million cups.",
    ],
  },
  {
    id: "earth_hair",
    prompt: "How many hairs are on a typical human head?",
    unit: "hairs",
    answer: 100000,
    difficulty: "easy",
    steps: [
      "The scalp is roughly 600 to 700 square cm.",
      "Hair density is about 150 to 200 hairs per square cm.",
      "Multiply to get roughly 100,000 to 130,000 hairs.",
    ],
  },
  {
    id: "ny_pizzerias",
    prompt: "How many pizzerias operate in New York City?",
    unit: "pizzerias",
    answer: 1600,
    difficulty: "hard",
    steps: [
      "NYC has about 8.5 million people.",
      "Say each person eats pizza from a shop once a week, so 8.5 million slices sold weekly per capita unit.",
      "A shop might serve about 5,000 customers a week.",
      "Estimate population over customers per shop, adjusted for chains and groceries.",
      "Lands near 1,500 to 1,800 shops.",
    ],
  },
  {
    id: "plane_seats",
    prompt: "How many commercial airline seats take off worldwide each day?",
    unit: "seats",
    answer: 18000000,
    difficulty: "hard",
    steps: [
      "There are roughly 100,000 commercial flights a day.",
      "An average plane seats about 150 to 180 people.",
      "Multiply 100,000 by about 180.",
      "Lands near 18 million seats.",
    ],
  },
];

export function fermiByDifficulty(
  difficulty?: "easy" | "medium" | "hard",
): FermiQuestion[] {
  return difficulty
    ? FERMI_QUESTIONS.filter((q) => q.difficulty === difficulty)
    : FERMI_QUESTIONS;
}

/**
 * Score a point estimate by how close it is in order of magnitude.
 * Returns the absolute base 10 log distance (0 is perfect, 1 is a 10x miss).
 */
export function fermiLogError(estimate: number, answer: number): number {
  if (estimate <= 0) return Infinity;
  return Math.abs(Math.log10(estimate) - Math.log10(answer));
}

/** A market contains the answer if bid <= answer <= ask. */
export function marketContains(bid: number, ask: number, answer: number): boolean {
  return answer >= bid && answer <= ask;
}

/** Width of a market in orders of magnitude (decades). */
export function marketDecades(bid: number, ask: number): number {
  if (bid <= 0 || ask <= 0) return Infinity;
  return Math.log10(ask) - Math.log10(bid);
}
