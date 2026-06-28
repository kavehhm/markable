# Markable Market-Making Prep Guide

This guide explains the core ideas behind each section of the Markable website. The goal is not just to memorize definitions. The goal is to build fast market-making instincts: quote quickly, update fair value, manage inventory, read the book, and explain your reasoning clearly in interviews.

## Table Of Contents

1. [Quote Speed](#quote-speed)
2. [Order Book](#order-book)
3. [Inventory](#inventory)
4. [Probability](#probability)
5. [Mental Math](#mental-math)
6. [Concepts](#concepts)
7. [Cases](#cases)
8. [Core Formulas](#core-formulas)
9. [Interview Reflex Checklist](#interview-reflex-checklist)

## Quote Speed

The Quote Speed tab trains the most important market-making reflex: given fair value, flow, volatility, and inventory, choose a reasonable bid and ask fast.

### What A Quote Means

A two-sided market is:

```txt
bid / ask
```

The bid is the price where you are willing to buy. The ask is the price where you are willing to sell.

If you quote:

```txt
99.90 / 100.10
```

you are saying:

- I buy at 99.90.
- I sell at 100.10.
- My midpoint is 100.00.
- My spread is 0.20.

### Fair Value

Fair value is your best estimate of the asset's true value right now. Your quote should usually be centered near fair value, then adjusted for risk.

Basic quote:

```txt
bid = fair value - half spread
ask = fair value + half spread
```

Example:

```txt
fair value = 100.00
spread = 0.20
bid = 99.90
ask = 100.10
```

### Spread Width

The spread is compensation for risk.

You widen when:

- Volatility is high.
- You are uncertain about fair value.
- Flow is toxic or informed.
- The order book is thin.
- You are near an inventory limit.
- News just arrived and prices may be stale.

You tighten when:

- Fair value is stable.
- Flow looks uninformed.
- You want more fills.
- You have high confidence in your estimate.
- Competition forces you to quote tightly.

### Inventory Skew

Inventory is your current position. It changes the quote you should show.

If you are long, you already own too much. You want to sell more and buy less.

So you usually lower your quote center:

```txt
old quote: 99.90 / 100.10
new quote: 99.80 / 100.00
```

This makes your ask more attractive and your bid less attractive.

If you are short, you need to buy back inventory. You usually raise your quote center:

```txt
old quote: 99.90 / 100.10
new quote: 100.00 / 100.20
```

This makes your bid more attractive and your ask less attractive.

For a true short-inventory bid lean, the bid itself must improve. If the bid does not move higher, you have not made it easier for sellers to hit you. A quote that only raises the ask mainly prevents you from getting shorter; it does not actively help you buy back.

### Flow Pressure

Flow tells you who is hitting your quotes.

Buy pressure means people are lifting offers. This can mean:

- Fair value may be rising.
- Your ask may be too cheap.
- You risk selling before the market moves up.

Sell pressure means people are hitting bids. This can mean:

- Fair value may be falling.
- Your bid may be too high.
- You risk buying before the market moves down.

### Quote Speed Drill Reflex

When a scenario appears, think in this order:

1. What is fair value?
2. How volatile is the market?
3. What is my inventory?
4. Is flow buy-heavy, sell-heavy, or balanced?
5. Should I center, skew, widen, or step away?

Fast rule:

```txt
quote center = fair value + inventory skew + flow skew
quote width = base width + volatility premium + toxicity premium
```

### Common Mistakes

- Quoting too tight when volatility is high.
- Ignoring inventory.
- Joining the touch just because it looks competitive.
- Treating all fills as good fills.
- Forgetting that a fill can be information.

## Order Book

The Order Book tab trains microstructure intuition. You are learning to read displayed liquidity, queue pressure, and short-term price movement.

### Limit Order Book Basics

A limit order book contains resting buy and sell orders.

```txt
asks
100.15 x 40
100.10 x 25
100.05 x 10
-------------
99.95  x 50
99.90  x 70
99.85  x 80
bids
```

The highest bid and lowest ask are called the top of book.

```txt
best bid = 99.95
best ask = 100.05
midprice = 100.00
spread = 0.10
```

### Midprice

The midprice is:

```txt
midprice = (best bid + best ask) / 2
```

It is simple and useful, but often naive. It ignores size.

### Book Imbalance

Book imbalance compares bid depth to total near-touch depth.

```txt
imbalance = bid depth / (bid depth + ask depth)
```

Example:

```txt
bid depth = 900
ask depth = 300
imbalance = 900 / 1200 = 75%
```

A high imbalance means the bid side is heavier. This can suggest upward pressure because the ask side may be easier to consume.

A low imbalance means the ask side is heavier. This can suggest downward pressure.

### Microprice

Microprice adjusts the midprice using top-of-book sizes.

One common formula:

```txt
microprice = (best ask * bid size + best bid * ask size) / (bid size + ask size)
```

Why does ask price get weighted by bid size? Because if bid size is large and ask size is small, the ask is more likely to be consumed first. That implies upward pressure.

Example:

```txt
best bid = 99.95
best ask = 100.05
bid size = 300
ask size = 100

microprice = (100.05 * 300 + 99.95 * 100) / 400
microprice = 100.025
```

The midprice is 100.00, but the microprice is higher. The book leans upward.

### Queue Priority

At the same price, older orders usually execute first. If you join a huge queue, your price may be good but your fill probability may be low.

Example:

```txt
best bid: 100.00 x 200,000
your order: buy 1,000 at 100.00
```

You are behind a large queue. Small sell orders may not reach you.

### Displayed Liquidity Is Not Perfect Truth

Displayed book depth can be misleading because of:

- Hidden orders.
- Iceberg orders.
- Cancellations.
- Spoofing.
- Venue fragmentation.
- Fast participants reacting before you.

For interviews, you should say: "The book is a signal, not truth."

### Order Book Drill Reflex

Ask:

1. Is the book bid-heavy or ask-heavy?
2. Is the imbalance near the touch or deep in the book?
3. Is the spread tight or wide?
4. Does microprice disagree with midprice?
5. Would I skew my quote center?
6. Would I change size?

## Inventory

The Inventory tab trains risk control. Market making is not just predicting fair value. It is surviving fills while continuously rebalancing risk.

### What Inventory Means

Inventory is your position.

```txt
inventory > 0 means long
inventory < 0 means short
inventory = 0 means flat
```

If you buy, inventory increases.

If you sell, inventory decreases.

### Cash And PnL

If you buy 1 unit at 99.90:

```txt
cash = cash - 99.90
inventory = inventory + 1
```

If the current mid is 100.00, marked PnL is:

```txt
PnL = cash + inventory * mid
```

Example:

```txt
cash = -99.90
inventory = 1
mid = 100.00
PnL = -99.90 + 1 * 100.00 = 0.10
```

### Spread Capture

Spread capture is the money you earn by buying below fair value and selling above fair value.

Example:

```txt
fair = 100.00
you buy at 99.90
edge = 0.10
```

If you later sell at 100.10:

```txt
round trip edge = 0.20
```

### Adverse Selection

Adverse selection is when the counterparty trades with you because they know something or react faster.

Bad buy:

```txt
you buy at 99.90
fair value drops to 99.50
```

You earned the spread only in appearance. You bought right before fair value moved down.

Bad sell:

```txt
you sell at 100.10
fair value jumps to 100.50
```

You sold too cheap.

### Inventory Skew Rules

If long:

```txt
lower quote center
widen bid if needed
make ask easier to hit
```

If short:

```txt
raise the bid
keep the ask less attractive
make it easier for sellers to hit you
```

If flat:

```txt
quote around fair value
optimize spread versus fill rate
```

### Why Inventory Is Dangerous

Inventory makes you exposed to price movement.

If you are long:

```txt
price down = lose money
price up = make money
```

If you are short:

```txt
price up = lose money
price down = make money
```

Market makers are not trying to become large directional traders unless they have a strong reason. They usually want controlled inventory.

### Inventory Lab Reflex

Each tick, ask:

1. Am I long, short, or flat?
2. Am I near my limit?
3. Is fair value stable or moving?
4. Should I quote tight or wide?
5. Should I lean bid, neutral, or ask?
6. Did my last fill give me information?

## Probability

The Probability tab trains the math behind fair value and expected value.

### Expected Value

Expected value is probability-weighted value.

```txt
EV = probability * payoff
```

For multiple outcomes:

```txt
EV = p1 * value1 + p2 * value2 + ... + pn * valuen
```

Example:

```txt
60% chance value is 102
40% chance value is 98

fair value = 0.60 * 102 + 0.40 * 98
fair value = 61.2 + 39.2
fair value = 100.4
```

### Bayesian Updating

In interviews, Bayesian updating often means: new information changes the probabilities of possible states.

Before signal:

```txt
P(high) = 50%
P(low) = 50%
```

After bullish signal:

```txt
P(high) = 65%
P(low) = 35%
```

Then fair value changes.

### Fill Quality EV

A fill is not automatically good. You need to compare spread capture against adverse-selection risk.

Simple model:

```txt
expected edge = spread capture - toxic probability * adverse move
```

Example:

```txt
spread capture = 0.10
toxic probability = 25%
adverse move = 0.40

expected edge = 0.10 - 0.25 * 0.40
expected edge = 0.10 - 0.10
expected edge = 0.00
```

If expected edge is near zero or negative, tighten less or widen.

### Conditional Probability

Conditional probability asks:

```txt
What is the probability of A given B?
```

Notation:

```txt
P(A | B)
```

In market making:

```txt
P(fair value up | customer lifted my ask)
P(toxic flow | fill happened right after news)
P(next tick up | bid imbalance is high)
```

### Probability Drill Reflex

Ask:

1. What are the possible states?
2. What is the probability of each state?
3. What is the payoff or fair value in each state?
4. What is the weighted average?
5. Does fill toxicity reduce the edge?

## Mental Math

The Mental Math tab trains fast arithmetic used in trading interviews.

### Basis Points

One basis point is one hundredth of one percent.

```txt
1 bp = 0.01%
1 bp = 0.0001
```

Conversions:

```txt
10 bps = 0.10%
25 bps = 0.25%
100 bps = 1.00%
```

### Bps To Dollars

Formula:

```txt
dollar edge = price * shares * bps / 10,000
```

Example:

```txt
price = 50
shares = 10,000
edge = 4 bps

dollar edge = 50 * 10,000 * 4 / 10,000
dollar edge = 200
```

### Spread Capture

Formula:

```txt
spread capture = spread * shares
```

Example:

```txt
bid = 99.95
ask = 100.05
spread = 0.10
shares = 1,000

spread capture = 0.10 * 1,000 = 100
```

### Position Sizing

If you can lose at most a certain amount under a stress move:

```txt
max size = loss limit / stress move
```

Example:

```txt
loss limit = 20,000
stress move = 0.50

max shares = 20,000 / 0.50 = 40,000
```

### Quick Approximation

Interviews often reward speed more than perfect precision. Good approximations are useful.

Example:

```txt
49.80 * 12,000 * 3 bps
approx 50 * 12,000 * 0.0003
= 600,000 * 0.0003
= 180
```

### Mental Math Drill Reflex

Ask:

1. What is the unit?
2. Is the answer in dollars, shares, ticks, or bps?
3. Can I approximate first?
4. Is the result directionally reasonable?
5. Did I accidentally use percent instead of bps?

## Concepts

The Concepts tab is a flashcard deck for market microstructure ideas. These are the terms you should be able to explain clearly.

### Microprice

Microprice is a queue-weighted estimate of near-term fair value. It improves on midprice by incorporating displayed top-of-book size.

Know:

- Large bid size and small ask size usually pushes microprice above mid.
- Large ask size and small bid size usually pushes microprice below mid.
- Microprice is useful for short-horizon pressure, not long-term valuation.

### Inventory Skew

Inventory skew means moving your quote center to control position.

Know:

- Long inventory means skew lower.
- Short inventory means skew higher.
- The stronger the inventory pressure, the stronger the skew.
- For a short position, check that the bid actually improves; otherwise you are not actively covering.

### Adverse Selection

Adverse selection means you trade with someone who has better information or reacts faster.

Know:

- A fill can be bad news.
- Spread capture is not enough if fair value moves against you.
- News and one-sided flow increase adverse-selection risk.

### Queue Priority

Queue priority determines when your order fills at a given price.

Know:

- Same price does not mean same execution value.
- Being first in queue is valuable.
- Joining a huge queue can mean low fill probability.

### Spread Width

Spread width is how much compensation you demand for making a market.

Know:

- Wider spread means less fill probability and more protection.
- Tighter spread means more fills and more risk.
- Volatility and uncertainty should widen your quote.

### Order Book Imbalance

Order book imbalance compares displayed demand and supply.

Know:

- Bid-heavy book can imply upward pressure.
- Ask-heavy book can imply downward pressure.
- Imbalance can disappear quickly.

## Cases

The Cases tab trains judgment. These are closer to interview prompts where you need to say what you would do and why.

### How To Answer A Case

Use a structured answer:

1. State the key risk.
2. Say how you update fair value or uncertainty.
3. Say how you change bid, ask, width, or size.
4. Mention inventory if relevant.
5. Mention what would make you change your mind.

Example:

```txt
The fill right after correlated futures jumped is probably informative.
I would pull or widen briefly, update fair value upward, then re-enter with a higher center and possibly smaller size.
If the move fades and flow normalizes, I can tighten again.
```

### Case: Stale Quote After News

Concepts:

- Adverse selection.
- Stale quotes.
- Fair value update.
- Pull, widen, or reprice.

Good answer:

```txt
I should assume my old quote may be stale. I would update fair value using the new information, widen if uncertainty is high, and avoid leaving the old ask exposed.
```

### Case: Long Inventory Into Sell Flow

Concepts:

- Inventory risk.
- Flow pressure.
- Liquidation risk.

Good answer:

```txt
Since I am already long and sellers keep arriving, I should reduce buying interest. I would skew lower, make my ask more attractive, and possibly widen or reduce size on the bid.
```

### Case: Huge Bid Queue

Concepts:

- Queue priority.
- Fill probability.
- Displayed liquidity.

Good answer:

```txt
The bid-heavy book may signal support, but if I join behind a huge queue my order may not fill. I need to account for queue position, not just price.
```

### Case: Wide Market Request

Concepts:

- Quoting under uncertainty.
- Width versus confidence.
- Interview communication.

Good answer:

```txt
I would quote around my best fair value estimate, but wide enough to reflect uncertainty. Then I would update as I learn from trades or new signals.
```

## Core Formulas

### Midprice

```txt
mid = (best bid + best ask) / 2
```

### Spread

```txt
spread = ask - bid
```

### Quote Around Fair Value

```txt
bid = fair - half spread
ask = fair + half spread
```

### PnL

```txt
PnL = cash + inventory * mid
```

### Expected Value

```txt
EV = sum(probability_i * value_i)
```

### Fill Quality Edge

```txt
expected edge = spread capture - toxic probability * adverse move
```

### Book Imbalance

```txt
imbalance = bid depth / (bid depth + ask depth)
```

### Microprice

```txt
microprice = (best ask * bid size + best bid * ask size) / (bid size + ask size)
```

### Bps To Dollars

```txt
dollars = price * shares * bps / 10,000
```

### Risk-Based Size

```txt
max size = loss limit / stress move
```

## Interview Reflex Checklist

Before quoting:

- What is fair value?
- How confident am I?
- What spread compensates me?
- What is my inventory?
- What does recent flow imply?
- Is the book leaning one way?
- How toxic is the next fill likely to be?

After getting filled:

- Did I want that fill?
- Was it informed?
- Did fair value move?
- Did my inventory become dangerous?
- Should I reprice, widen, or reduce size?

When explaining:

- Start with fair value.
- Explain width.
- Explain skew.
- Explain risk.
- Say what new information would change your quote.

## How To Use Markable

Suggested daily loop:

1. Do 20 Quote Speed reps.
2. Spend 5 minutes reading Order Book scenarios.
3. Run 20 Inventory ticks and watch PnL.
4. Do 10 Probability reps.
5. Do 10 Mental Math reps.
6. Review 5 Concept cards.
7. Answer 3 Cases out loud.

The point is to make the reasoning automatic. In an interview, speed comes from having seen the structure many times before.
