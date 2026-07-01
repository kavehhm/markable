// Plain, human rules for each arena game. Shown in the "?" modal on the top bar.
// Kept in one place so the wording stays consistent and easy to edit.

function ValuesNote() {
  return (
    <p className="rules-note">
      Cards are worth their printed number. A Jack is 11, a Queen is 12, a King is 13, and an Ace is 14.
      Dice show 1 through 6, so a die you cannot see is worth 3.5 on average. When a round changes these,
      the change is written on the screen for that round.
    </p>
  );
}

const CONTENT: Record<string, { title: string; body: () => JSX.Element }> = {
  make_market: {
    title: "Make a Market",
    body: () => (
      <>
        <p>
          You are the market maker. Pick a question from the bank, then post a two sided market: a bid,
          which is the most you will pay, and an ask, which is the least you will sell for.
        </p>
        <h4>How a round works</h4>
        <p>
          A counterparty looks at your market and trades only on the side that helps them. If your market
          is too wide they pass, and if it is off centre they lift the side that hurts you. After you
          commit, the round settles and you find out what happened.
        </p>
        <h4>Who you trade against</h4>
        <p>
          An informed counterparty knows the true value and only trades when you are wrong. An uninformed
          one trades around the public average, so the edge is yours. A noisy one is mostly informed but
          sometimes trades at random.
        </p>
        <h4>Scoring</h4>
        <p>
          You are judged on total profit across the session. The fair value and a benchmark quote are held
          back until the review, so you have to price the market yourself while you play.
        </p>
        <ValuesNote />
      </>
    ),
  },
  fair_value: {
    title: "Fair Value",
    body: () => (
      <>
        <p>
          A bank of quick estimation questions. Each one asks for the fair value of some quantity, like the
          average sum of a few cards or the chance of a pair.
        </p>
        <h4>How to play</h4>
        <p>
          Pick a question from the list on the left, work out a fast estimate, and type it in. The game
          reveals the true fair value and tells you how close you were. A guess within about ten percent
          counts as sharp. Jump between questions from the sidebar whenever you like.
        </p>
        <ValuesNote />
      </>
    ),
  },
  trade_floor: {
    title: "Trading Floor",
    body: () => (
      <>
        <p>
          Here the market maker shows you the market and you decide whether to take it. You see a set of
          cards or dice, some face up and some hidden, and a quote written as Bid at Ask.
        </p>
        <h4>How to trade</h4>
        <p>
          You buy at the ask and sell at the bid. Choose how many units, then act before the timer runs
          out. The round settles at the sum of all the cards or dice, so buy when you think the ask is
          cheap and sell when you think the bid is rich.
        </p>
        <h4>Budget and size</h4>
        <p>
          You start with 500. You can only buy what you can afford, and you can only sell a size your
          balance could cover if the market moved all the way against you.
        </p>
        <h4>Tracking</h4>
        <p>
          After each round you report your profit. On harder settings your balance is hidden, so you keep
          it in your head and report it too. Market events can change the deck for a round, and the event
          is always shown.
        </p>
        <ValuesNote />
      </>
    ),
  },
  five_dice: {
    title: "Five Dice Market",
    body: () => (
      <>
        <p>
          You make a market on the final sum of five dice, but the dice are revealed one at a time. One
          die lands, you quote, the next die lands, you quote again, and so on until all five are showing.
        </p>
        <h4>Your edge</h4>
        <p>
          Each unseen die is worth 3.5 on average, so your fair value is the revealed sum plus 3.5 for
          every die still hidden. The interviewer knows the final sum and trades only when your market
          gives them an edge, so every fill is a hint.
        </p>
        <h4>Track it yourself</h4>
        <p>
          Nothing is shown to you while you play: no fair value, no profit, no position. Keep your
          inventory, your cash, and your running profit in your head. When the last die lands you report
          those numbers, and then the review shows the fair value at each step and where your quotes
          drifted.
        </p>
      </>
    ),
  },
  fermi: {
    title: "Fermi Markets",
    body: () => (
      <>
        <p>
          You make a market on a real world quantity, like the number of piano tuners in a city, and you
          quote in the stated unit. You get several markets on the same figure before it settles.
        </p>
        <h4>How it settles</h4>
        <p>
          The interviewer knows the true figure and trades only when your range sits on the wrong side of
          it. A tight range that still contains the answer keeps you out of trouble. There is an optional
          rule that caps your ask at one and a half times your bid.
        </p>
        <h4>Track it yourself</h4>
        <p>
          Your position, cash, and profit stay in your head during play. When the market settles you
          report them, and the review shows a worked estimate so you can see how close you were.
        </p>
      </>
    ),
  },
  inference: {
    title: "Hidden State Inference",
    body: () => (
      <>
        <p>
          A value is hidden and an informed desk knows it. You get a handful of quotes to pin it down.
          Every time they trade or pass, they rule out part of the range.
        </p>
        <h4>How to narrow it</h4>
        <p>
          A wide market reveals little but is safe. A tight market reveals a lot but risks getting picked
          off. After your last quote you name the hidden value, either by picking from what is left or by
          typing a number.
        </p>
        <ValuesNote />
      </>
    ),
  },
  xyz_tighten: {
    title: "XYZ Tighten Duel",
    body: () => (
      <>
        <p>
          You and the interviewer each have your own value for a stock. You know yours. They keep theirs
          hidden, and it is within ten of yours.
        </p>
        <h4>Trade or tighten</h4>
        <p>
          You open a market. If their value sits outside it, they trade with you. If it sits inside, they
          answer with a tighter market and you choose to trade or to tighten again. Take the trade when it
          gives you an edge against your own value, and tighten when it does not. You play a short run of
          duels and the review shows how you did.
        </p>
      </>
    ),
  },
  trader_memory: {
    title: "Trader Memory Arena",
    body: () => (
      <>
        <p>
          This is pure book keeping under pressure. Trades and fair value moves flash by, and you hold the
          whole state in your head.
        </p>
        <h4>What to track</h4>
        <p>
          Keep four things: the fair value, your position, your cash, and your average entry price. Cash
          goes up when you sell and down when you buy. Your profit is the position marked at the latest
          fair value.
        </p>
        <h4>The risk limit</h4>
        <p>
          You have a hard inventory limit. If the position ever moves outside it, that is an instant fail,
          the same as in a real seat. At the checkpoint you answer for each number from memory.
        </p>
      </>
    ),
  },
  objective: {
    title: "Objective Lab",
    body: () => (
      <>
        <p>
          You build a small portfolio of trades to fit a goal. The goal might be the most expected profit,
          the steadiest result, or the best possible worst case.
        </p>
        <p>
          Pick your trades and the lab scores the mix against the goal, so you can feel the trade off
          between chasing upside and protecting the downside.
        </p>
      </>
    ),
  },
  confidence_interval: {
    title: "Confidence Interval",
    body: () => (
      <>
        <p>
          You give a ninety percent range for a quantity. A good range contains the true answer about nine
          times in ten and is no wider than it needs to be.
        </p>
        <p>
          Too narrow and you miss too often. Too wide and the range says nothing. The game rewards ranges
          that are honest about what you actually know.
        </p>
      </>
    ),
  },
};

export function GameRules({ game }: { game: string }) {
  const entry = CONTENT[game];
  if (!entry) return null;
  const Body = entry.body;
  return (
    <>
      <h3 className="rules-title">{entry.title}</h3>
      <Body />
    </>
  );
}
