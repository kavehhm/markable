import { CounterpartyContext, Quote, TradeAction } from "./types";

/**
 * Decide what the counterparty does facing the user's two-sided quote.
 *
 * Convention: the counterparty trades only when the user's price is favourable
 * *to the counterparty*.
 *   - buy_from_user: counterparty lifts the user's ask (user ends up short).
 *   - sell_to_user:  counterparty hits the user's bid (user ends up long).
 *   - pass:          no trade.
 *
 * Reference value the counterparty compares against depends on its type:
 *   - informed:   the true realised payoff Y.
 *   - uninformed: the public fair value.
 *   - partial:    its conditional EV given private info.
 *   - noisy:      informed, but occasionally acts at random.
 */
export function decideCounterpartyAction(
  quote: Quote,
  ctx: CounterpartyContext,
): TradeAction {
  // Degenerate / crossed quote: nobody trades.
  if (quote.bid > quote.ask) return "pass";

  if (ctx.type === "noisy") {
    const noise = ctx.noise ?? 0.15;
    const draw = ctx.noiseDraw ?? 1; // default: behave optimally when unspecified
    if (draw < noise) {
      // Random action: pick whichever side actually crosses, else random side.
      const r = (draw / Math.max(noise, 1e-9)) % 1;
      if (ctx.truePayoff > quote.ask) return "buy_from_user";
      if (ctx.truePayoff < quote.bid) return "sell_to_user";
      return r < 0.5 ? "buy_from_user" : "sell_to_user";
    }
    return optimalAgainst(quote, ctx.truePayoff);
  }

  const reference =
    ctx.type === "informed"
      ? ctx.truePayoff
      : ctx.type === "partial"
        ? (ctx.partialEv ?? ctx.fairValue)
        : ctx.fairValue;

  return optimalAgainst(quote, reference);
}

/** Trade when the reference value is strictly outside the quoted market. */
function optimalAgainst(quote: Quote, reference: number): TradeAction {
  if (reference > quote.ask) return "buy_from_user";
  if (reference < quote.bid) return "sell_to_user";
  return "pass";
}
