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
  {
    id: "olympic_pool_water",
    prompt: "How many liters of water are in an Olympic swimming pool?",
    unit: "liters",
    answer: 2500000,
    difficulty: "easy",
    steps: [
      "An Olympic pool is 50m by 25m by about 2m deep.",
      "That is 2,500 cubic metres.",
      "Each cubic metre is 1,000 litres.",
      "That gives about 2.5 million litres.",
    ],
  },
  {
    id: "rice_bag_grains",
    prompt: "How many grains of rice are in a 1 kg bag?",
    unit: "grains",
    answer: 50000,
    difficulty: "easy",
    steps: [
      "A grain of rice weighs around 20 milligrams.",
      "One kilogram is 1,000 grams, or 1,000,000 milligrams.",
      "Divide 1,000,000 by about 20.",
      "That lands near 50,000 grains.",
    ],
  },
  {
    id: "seconds_year",
    prompt: "How many seconds are in a year?",
    unit: "seconds",
    answer: 31500000,
    difficulty: "easy",
    steps: [
      "A year has about 365 days.",
      "Each day has 24 hours, each hour has 3,600 seconds.",
      "365 times 24 times 3,600 is about 31.5 million.",
    ],
  },
  {
    id: "ping_pong_cubic_meter",
    prompt: "How many ping pong balls fit in one cubic meter?",
    unit: "balls",
    answer: 15000,
    difficulty: "easy",
    steps: [
      "A ping pong ball is about 4 cm across.",
      "A 4 cm cube is 64 cubic cm, before packing gaps.",
      "One cubic meter is 1,000,000 cubic cm.",
      "Divide by roughly 70 cubic cm with packing, giving about 15,000.",
    ],
  },
  {
    id: "paper_stack_meter",
    prompt: "How many sheets of printer paper make a 1 meter stack?",
    unit: "sheets",
    answer: 10000,
    difficulty: "easy",
    steps: [
      "A sheet of office paper is about 0.1 mm thick.",
      "One meter is 1,000 mm.",
      "1,000 divided by 0.1 is about 10,000 sheets.",
    ],
  },
  {
    id: "subway_car_capacity",
    prompt: "How many people can fit in a crowded subway car?",
    unit: "people",
    answer: 180,
    difficulty: "easy",
    steps: [
      "A subway car is roughly 20m by 3m, or 60 square metres.",
      "Packed standing space can hold about 3 people per square metre.",
      "That gives about 180 people, before seats and doors net out.",
    ],
  },
  {
    id: "home_light_bulbs",
    prompt: "How many light bulbs are in a typical US home?",
    unit: "bulbs",
    answer: 40,
    difficulty: "easy",
    steps: [
      "A home might have 8 to 10 rooms or zones.",
      "Each room averages 3 to 5 bulbs across ceiling, lamps, and fixtures.",
      "That puts a typical home around 30 to 50 bulbs.",
    ],
  },
  {
    id: "us_gas_stations",
    prompt: "How many gas stations are there in the United States?",
    unit: "stations",
    answer: 150000,
    difficulty: "medium",
    steps: [
      "The US has about 330 million people.",
      "A station might serve a neighborhood catchment of roughly 2,000 people.",
      "330 million divided by 2,000 is about 165,000.",
      "Round to about 150,000 stations.",
    ],
  },
  {
    id: "nyc_pizza_slices_day",
    prompt: "How many pizza slices are sold in New York City each day?",
    unit: "slices",
    answer: 1500000,
    difficulty: "medium",
    steps: [
      "NYC has about 8.5 million residents plus visitors and commuters.",
      "Say around 10 million people interact with the city on a busy day.",
      "If 15% buy pizza and each buys about one slice equivalent, that is 1.5 million slices.",
    ],
  },
  {
    id: "manhattan_dogs",
    prompt: "How many dogs live in Manhattan?",
    unit: "dogs",
    answer: 120000,
    difficulty: "medium",
    steps: [
      "Manhattan has about 1.6 million people.",
      "Assume roughly 800,000 households or household equivalents.",
      "If 15% have a dog, that gives about 120,000 dogs.",
    ],
  },
  {
    id: "nyc_elevators",
    prompt: "How many elevators are in New York City?",
    unit: "elevators",
    answer: 80000,
    difficulty: "medium",
    steps: [
      "NYC has many tens of thousands of multi-story buildings.",
      "Say 40,000 elevator buildings on average have 2 elevators.",
      "That gives about 80,000 elevators.",
    ],
  },
  {
    id: "us_doctor_visits_day",
    prompt: "How many doctor visits happen in the United States each day?",
    unit: "visits",
    answer: 3000000,
    difficulty: "medium",
    steps: [
      "The US has about 330 million people.",
      "Suppose the average person has about 3 visits per year.",
      "That is about 1 billion visits per year.",
      "Divide by 365 to get roughly 3 million per day.",
    ],
  },
  {
    id: "us_atms",
    prompt: "How many ATMs are in the United States?",
    unit: "ATMs",
    answer: 450000,
    difficulty: "medium",
    steps: [
      "The US has about 330 million people.",
      "A rough density is one ATM per 700 to 800 people.",
      "330 million divided by about 750 is around 440,000.",
      "Round to about 450,000 ATMs.",
    ],
  },
  {
    id: "us_movie_seats",
    prompt: "How many movie theater seats are there in the United States?",
    unit: "seats",
    answer: 5000000,
    difficulty: "medium",
    steps: [
      "There are thousands of cinemas, each with multiple screens.",
      "Say 6,000 theaters times 8 screens each is about 48,000 screens.",
      "At roughly 100 seats per screen, that is about 5 million seats.",
    ],
  },
  {
    id: "global_smartphones_day",
    prompt: "How many smartphones are sold worldwide each day?",
    unit: "phones",
    answer: 4000000,
    difficulty: "hard",
    steps: [
      "Worldwide annual smartphone sales are on the order of 1 to 1.5 billion.",
      "Divide about 1.4 billion by 365 days.",
      "That gives roughly 4 million phones per day.",
    ],
  },
  {
    id: "us_toilet_paper_day",
    prompt: "How many rolls of toilet paper are used in the United States each day?",
    unit: "rolls",
    answer: 80000000,
    difficulty: "hard",
    steps: [
      "The US has about 330 million people.",
      "Assume one person uses about one roll every 4 days on average.",
      "330 million divided by 4 is about 80 million rolls per day.",
    ],
  },
  {
    id: "global_card_transactions_day",
    prompt: "How many payment card transactions happen worldwide each day?",
    unit: "transactions",
    answer: 2000000000,
    difficulty: "hard",
    steps: [
      "Billions of people use cards or card-like payment rails.",
      "Assume 1 billion active users average about 2 transactions per day.",
      "That gives roughly 2 billion transactions daily.",
    ],
  },
  {
    id: "us_parking_spaces",
    prompt: "How many parking spaces are there in the United States?",
    unit: "spaces",
    answer: 800000000,
    difficulty: "hard",
    steps: [
      "The US has roughly 280 million vehicles.",
      "Each vehicle needs spaces at home, work, retail, and public lots.",
      "Use about 3 spaces per vehicle as an order-of-magnitude ratio.",
      "That gives around 800 million parking spaces.",
    ],
  },
  {
    id: "global_water_bottles_day",
    prompt: "How many plastic water bottles are sold worldwide each day?",
    unit: "bottles",
    answer: 1400000000,
    difficulty: "hard",
    steps: [
      "Global bottled water use is on the order of hundreds of billions of bottles per year.",
      "Use about 500 billion bottles per year as a round figure.",
      "Divide by 365 days.",
      "That gives around 1.4 billion bottles per day.",
    ],
  },
  {
    id: "us_airline_passenger_miles_day",
    prompt: "How many passenger miles are flown by US airlines each day?",
    unit: "passenger miles",
    answer: 2000000000,
    difficulty: "hard",
    steps: [
      "US airlines carry a few million passengers per day.",
      "Use about 2.5 million passengers daily.",
      "An average trip length might be around 800 miles.",
      "Multiplying gives about 2 billion passenger miles per day.",
    ],
  },
  {
    id: "tanzania_population",
    prompt: "What is the population of Tanzania, in people?",
    unit: "people",
    answer: 68600000,
    difficulty: "medium",
    steps: [
      "Tanzania is a large East African country, bigger than most of its neighbours.",
      "Kenya is about 55 million; Tanzania is a bit larger in land and population.",
      "A defensible anchor is high 60s of millions.",
      "Lands near 68 to 69 million people.",
    ],
  },
  {
    id: "france_population",
    prompt: "What is the population of France, in people?",
    unit: "people",
    answer: 66000000,
    difficulty: "easy",
    steps: [
      "France is a large Western European country.",
      "Germany is about 83 million; France is a bit smaller.",
      "Lands near 66 to 68 million people.",
    ],
  },
  {
    id: "mcdonalds_worldwide",
    prompt: "How many McDonald's restaurants operate worldwide?",
    unit: "restaurants",
    answer: 40000,
    difficulty: "medium",
    steps: [
      "The US alone has roughly 13,000 to 14,000 locations.",
      "International markets together hold more than the US.",
      "Add them up to land near 40,000 restaurants.",
    ],
  },
  {
    id: "heartbeats_lifetime",
    prompt: "How many times does a human heart beat in an average lifetime?",
    unit: "beats",
    answer: 2500000000,
    difficulty: "medium",
    steps: [
      "Resting heart rate is about 70 beats per minute.",
      "That is roughly 100,000 beats per day, about 37 million per year.",
      "Over about 70 years that is near 2.5 billion beats.",
    ],
  },
  {
    id: "novel_words",
    prompt: "How many words are in a typical novel?",
    unit: "words",
    answer: 90000,
    difficulty: "easy",
    steps: [
      "A novel runs around 300 pages.",
      "A page holds about 300 words.",
      "300 times 300 is about 90,000 words.",
    ],
  },
  {
    id: "breaths_per_day",
    prompt: "How many breaths does a person take in a day?",
    unit: "breaths",
    answer: 20000,
    difficulty: "easy",
    steps: [
      "At rest a person breathes about 14 times a minute.",
      "That is roughly 840 per hour, about 20,000 per day.",
    ],
  },
  {
    id: "world_languages",
    prompt: "How many living languages are spoken in the world?",
    unit: "languages",
    answer: 7000,
    difficulty: "easy",
    steps: [
      "Languages cluster by region and ethnic group.",
      "Counts from linguists land in the several thousands.",
      "A standard figure is about 7,000 living languages.",
    ],
  },
  {
    id: "us_households",
    prompt: "How many households are there in the United States?",
    unit: "households",
    answer: 130000000,
    difficulty: "easy",
    steps: [
      "The US has about 330 million people.",
      "Average household size is roughly 2.5 people.",
      "330 million divided by 2.5 is about 130 million households.",
    ],
  },
  {
    id: "seconds_alive_25",
    prompt: "How many seconds has a 25 year old been alive?",
    unit: "seconds",
    answer: 790000000,
    difficulty: "easy",
    steps: [
      "A year is about 31.5 million seconds.",
      "Multiply by 25 years.",
      "Lands near 790 million seconds.",
    ],
  },
  {
    id: "us_libraries",
    prompt: "How many public library branches are there in the United States?",
    unit: "branches",
    answer: 17000,
    difficulty: "medium",
    steps: [
      "Most towns have at least one branch.",
      "There are tens of thousands of towns and city districts.",
      "Counts land near 17,000 public library branches.",
    ],
  },
  {
    id: "starbucks_worldwide",
    prompt: "How many Starbucks stores operate worldwide?",
    unit: "stores",
    answer: 38000,
    difficulty: "medium",
    steps: [
      "The US holds roughly 16,000 stores.",
      "China and the rest of the world add a similar amount again.",
      "Lands near 38,000 stores.",
    ],
  },
  {
    id: "world_airports",
    prompt: "How many airports are there in the world?",
    unit: "airports",
    answer: 40000,
    difficulty: "medium",
    steps: [
      "The US alone has around 5,000 public airports plus many private strips.",
      "Counting all sizes worldwide multiplies that several times.",
      "Lands near 40,000 airports of all sizes.",
    ],
  },
  {
    id: "boeing_747_weight",
    prompt: "What is the maximum takeoff weight of a Boeing 747, in kilograms?",
    unit: "kilograms",
    answer: 400000,
    difficulty: "hard",
    steps: [
      "A 747 carries about 400 people plus cargo and a lot of fuel.",
      "Fuel alone is on the order of 180,000 kg.",
      "Structure, payload, and fuel sum to about 400,000 kg.",
    ],
  },
  {
    id: "trees_on_earth",
    prompt: "How many trees are there on Earth?",
    unit: "trees",
    answer: 3000000000000,
    difficulty: "hard",
    steps: [
      "Forests cover a large share of the land surface.",
      "Tree density and forest area estimates combine to trillions.",
      "The accepted figure is about 3 trillion trees.",
    ],
  },
  {
    id: "cars_in_world",
    prompt: "How many cars are there in the world?",
    unit: "cars",
    answer: 1400000000,
    difficulty: "hard",
    steps: [
      "Rich countries have close to one car per two people.",
      "Weighting the global population by ownership rates,",
      "the total lands near 1.4 billion cars.",
    ],
  },
  {
    id: "human_body_cells",
    prompt: "How many cells are in the human body?",
    unit: "cells",
    answer: 37000000000000,
    difficulty: "hard",
    steps: [
      "Cells are microscopic and pack a body densely.",
      "Biologists estimate tens of trillions.",
      "A standard figure is about 37 trillion cells.",
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

export type FermiMarketAction = "buy" | "sell" | "pass";

export function fermiMarketAction(
  bid: number,
  ask: number,
  answer: number,
): FermiMarketAction {
  if (answer > ask) return "buy";
  if (answer < bid) return "sell";
  return "pass";
}

/** Width of a market in orders of magnitude (decades). */
export function marketDecades(bid: number, ask: number): number {
  if (bid <= 0 || ask <= 0) return Infinity;
  return Math.log10(ask) - Math.log10(bid);
}

/**
 * Apply an informed counterparty's response to your quote, returning the trade
 * price and the signed change to your position and cash. Selling adds cash and
 * shorts you; buying spends cash and lengthens you. A pass leaves you flat.
 */
export function fermiTrade(
  action: FermiMarketAction,
  bid: number,
  ask: number,
): { price: number | null; positionDelta: number; cashDelta: number } {
  if (action === "buy") {
    // They lift your ask, so you sell one contract at the ask.
    return { price: ask, positionDelta: -1, cashDelta: ask };
  }
  if (action === "sell") {
    // They hit your bid, so you buy one contract at the bid.
    return { price: bid, positionDelta: 1, cashDelta: -bid };
  }
  return { price: null, positionDelta: 0, cashDelta: 0 };
}

/** PnL of a position and cash ledger settled at the true answer. */
export function fermiSettlementPnl(position: number, cash: number, answer: number): number {
  return cash + position * answer;
}
