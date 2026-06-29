import { LabInstrument, LabScenario, LabState } from "./portfolio";

// --- scenario 1: three way race (Dutch book) ------------------------------

const raceStates: LabState[] = [
  { id: "A", label: "Runner A wins", probability: 0.5 },
  { id: "B", label: "Runner B wins", probability: 0.3 },
  { id: "C", label: "Runner C wins", probability: 0.2 },
];

function ticket(id: string, name: string, winId: string, price: number, prob: number): LabInstrument {
  const payoff: Record<string, number> = { A: 0, B: 0, C: 0 };
  payoff[winId] = 1;
  return {
    id,
    name,
    note: `Pays 1 if ${name.replace(" ticket", "")} wins. True chance ${(prob * 100).toFixed(0)}%, offered at ${price.toFixed(2)}.`,
    price,
    payoff,
  };
}

const raceScenario: LabScenario = {
  id: "race",
  title: "Three way race",
  difficulty: "easy",
  prompt:
    "One of three runners wins. Each ticket pays 1 if its runner wins. Buy or sell tickets to hit the objective.",
  states: raceStates,
  instruments: [
    ticket("A", "A ticket", "A", 0.45, 0.5),
    ticket("B", "B ticket", "B", 0.3, 0.3),
    ticket("C", "C ticket", "C", 0.2, 0.2),
  ],
  qtyRange: 4,
  lesson:
    "The three prices add up to 0.95 but exactly one ticket always wins, so the basket pays 1 for sure. Buy one of each and you bank 0.05 in every state with zero risk. When quoted prices on a full partition add up to less than 1, that is free money.",
};

// --- scenario 2: mispriced die --------------------------------------------

const dieStates: LabState[] = Array.from({ length: 6 }, (_, i) => ({
  id: String(i + 1),
  label: `Die shows ${i + 1}`,
  probability: 1 / 6,
}));

function dieInstrument(
  id: string,
  name: string,
  note: string,
  price: number,
  f: (face: number) => number,
): LabInstrument {
  const payoff: Record<string, number> = {};
  for (let face = 1; face <= 6; face++) payoff[String(face)] = f(face);
  return { id, name, note, price, payoff };
}

const dieScenario: LabScenario = {
  id: "die",
  title: "Mispriced die",
  difficulty: "medium",
  prompt:
    "A fair die is rolled. Three contracts settle on the face. Pick quantities for the objective you are optimising.",
  states: dieStates,
  instruments: [
    dieInstrument("up", "Face value", "Pays the face, 1 to 6. Fair value 3.5, offered at 3.40.", 3.4, (f) => f),
    dieInstrument("down", "Seven minus face", "Pays 7 minus the face, 6 to 1. Fair value 3.5, offered at 3.40.", 3.4, (f) => 7 - f),
    dieInstrument("even", "Even bonus", "Pays 6 on an even face, else 0. Fair value 3.0, offered at 2.50.", 2.5, (f) => (f % 2 === 0 ? 6 : 0)),
  ],
  qtyRange: 3,
  lesson:
    "Face value and seven minus face always add to 7, so holding one of each pays 7 for a cost of 6.80 with no risk. That is a guaranteed 0.20. The even bonus has the biggest edge but it is risky, so chasing max EV loads it up while the guaranteed worst case play avoids it entirely.",
};

// --- scenario 3: two dice sum ---------------------------------------------

const sumCounts: Record<number, number> = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
};

const sumStates: LabState[] = Object.entries(sumCounts).map(([sum, count]) => ({
  id: sum,
  label: `Sum ${sum}`,
  probability: count / 36,
}));

function sumInstrument(
  id: string,
  name: string,
  note: string,
  price: number,
  f: (sum: number) => number,
): LabInstrument {
  const payoff: Record<string, number> = {};
  for (const s of Object.keys(sumCounts)) payoff[s] = f(Number(s));
  return { id, name, note, price, payoff };
}

const twoDiceScenario: LabScenario = {
  id: "twodice",
  title: "Two dice sum",
  difficulty: "hard",
  prompt:
    "Two dice are rolled and the sum settles from 2 to 12. Four contracts trade. Find the portfolio for your objective.",
  states: sumStates,
  instruments: [
    sumInstrument("sum", "The sum", "Pays the sum. Fair value 7.0, offered at 6.60.", 6.6, (s) => s),
    sumInstrument("under", "Under seven", "Pays 1 if the sum is below 7. True chance 41.7%, offered at 0.40.", 0.4, (s) => (s < 7 ? 1 : 0)),
    sumInstrument("over", "Over seven", "Pays 1 if the sum is above 7. True chance 41.7%, offered at 0.40.", 0.4, (s) => (s > 7 ? 1 : 0)),
    sumInstrument("seven", "Exactly seven", "Pays 1 if the sum is exactly 7. True chance 16.7%, offered at 0.15.", 0.15, (s) => (s === 7 ? 1 : 0)),
  ],
  qtyRange: 3,
  lesson:
    "Under seven, over seven, and exactly seven cover every outcome once, so together they always pay 1 for a cost of 0.95. That basket locks in 0.05 with no risk. The sum contract has a real edge but it swings hard, so it only belongs in the max EV book, never in the guaranteed worst case book.",
};

export const LAB_SCENARIOS: LabScenario[] = [raceScenario, dieScenario, twoDiceScenario];

export function findLabScenario(id: string): LabScenario | undefined {
  return LAB_SCENARIOS.find((s) => s.id === id);
}
