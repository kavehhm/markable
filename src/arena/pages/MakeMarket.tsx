import { useMemo, useState } from "react";
import { Flag, RefreshCcw, RotateCcw } from "lucide-react";
import {
  TradeAction,
  actionImplication,
  bestQuotesByObjective,
  computePayoffDistribution,
  computeStats,
  computeUserPnl,
  decideCounterpartyAction,
  drawTrueState,
  enumerateStates,
  inventoryDelta,
} from "../engine";
import { ArenaSession } from "../ArenaApp";
import { OutcomeView } from "../components/OutcomeView";
import { Panel, PanelHead, Pill, Stat } from "../components/ui";
import { fmt, fmtSigned, pct } from "../format";
import { resolveContract, setupLabel, drawNoun } from "../session";
import {
  benchmarkObjective,
  headlineFor,
  objectiveMeta,
  sessionStats,
} from "../objectives";
import { Topline } from "./FairValueDrill";

const ACTION_COPY: Record<TradeAction, { label: string; tone: "good" | "bad" | "warn" }> = {
  buy_from_user: { label: "They lifted your ask", tone: "bad" },
  sell_to_user: { label: "They hit your bid", tone: "bad" },
  pass: { label: "They passed", tone: "warn" },
};

type RoundLog = {
  round: number;
  quote: { bid: number; ask: number };
  action: TradeAction;
  truePayoff: number;
  pnl: number;
  cumulative: number;
};

type Phase = "quote" | "result" | "summary";

export function MakeMarket({ session, onExit }: { session: ArenaSession; onExit: () => void }) {
  const counterparty = session.counterparty ?? "informed";
  const objective = session.objective ?? "max_ev";
  const meta = objectiveMeta(objective);
  const endless = !!session.endless;
  const totalRounds = endless ? Infinity : session.rounds ?? 10;
  const target = session.target ?? 10;
  const bust = -2 * target;

  const { config, payoff } = useMemo(() => resolveContract(session), [session]);
  const states = useMemo(() => enumerateStates(config), [config]);
  const baseStats = useMemo(
    () => computeStats(computePayoffDistribution(states, payoff)),
    [states, payoff],
  );
  const benchQuote = useMemo(
    () => bestQuotesByObjective(states, payoff, counterparty)[benchmarkObjective(objective)],
    [states, payoff, counterparty, objective],
  );

  const [roundId, setRoundId] = useState(0);
  const trueState = useMemo(
    () => drawTrueState(states),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [states, roundId],
  );
  const noiseDraw = useMemo(
    () => Math.random(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roundId],
  );
  const truePayoff = payoff.evaluate(trueState);

  const [bid, setBid] = useState("");
  const [ask, setAsk] = useState("");
  const [phase, setPhase] = useState<Phase>("quote");
  const [logs, setLogs] = useState<RoundLog[]>([]);
  const [inventory, setInventory] = useState(0);
  const [current, setCurrent] = useState<RoundLog | null>(null);

  const roundPnls = logs.map((l) => l.pnl);
  const total = roundPnls.reduce((a, b) => a + b, 0);
  const roundsPlayed = logs.length;

  const bidNum = Number(bid);
  const askNum = Number(ask);
  const validQuote =
    bid.trim() !== "" && ask.trim() !== "" &&
    Number.isFinite(bidNum) && Number.isFinite(askNum) && bidNum <= askNum;
  const crossed = bid.trim() !== "" && ask.trim() !== "" && bidNum > askNum;

  const sessionOver = endless
    ? total >= target || total <= bust
    : roundsPlayed >= totalRounds;

  function submit() {
    if (!validQuote) return;
    const quote = { bid: bidNum, ask: askNum };
    const action = decideCounterpartyAction(quote, {
      type: counterparty,
      fairValue: baseStats.ev,
      truePayoff,
      noise: counterparty === "noisy" ? 0.18 : undefined,
      noiseDraw,
    });
    const pnl = computeUserPnl(action, quote, truePayoff);
    const log: RoundLog = {
      round: roundsPlayed + 1,
      quote,
      action,
      truePayoff,
      pnl,
      cumulative: total + pnl,
    };
    setLogs((l) => [...l, log]);
    setCurrent(log);
    setInventory((inv) => inv + inventoryDelta(action));
    setBid("");
    setAsk("");
    setPhase("result");
  }

  function next() {
    setRoundId((r) => r + 1);
    setPhase("quote");
  }

  function reset() {
    setLogs([]);
    setInventory(0);
    setCurrent(null);
    setRoundId((r) => r + 1);
    setPhase("quote");
  }

  const stats = sessionStats(roundPnls);
  const headline = headlineFor(objective, stats);

  return (
    <div className="arena-shell">
      <Topline
        title="Make a Market"
        onExit={onExit}
        right={
          <span className="topline-tags">
            <span className="cp-chip">{meta.label}</span>
            <span className="cp-chip muted">vs {counterparty}</span>
          </span>
        }
      />

      <div className="session-bar">
        <Stat
          label="Round"
          value={endless ? `${roundsPlayed}` : `${Math.min(roundsPlayed + (phase === "quote" ? 1 : 0), totalRounds)} / ${totalRounds}`}
        />
        <Stat label="Total PnL" value={fmtSigned(total)} tone={total >= 0 ? "good" : "bad"} hint={endless ? `target ${fmt(target)}` : undefined} />
        <Stat label="Worst round" value={roundsPlayed ? fmt(stats.worst) : "."} tone={stats.worst >= 0 ? "good" : "bad"} />
        <Stat label="Inventory" value={String(inventory)} tone={Math.abs(inventory) >= 3 ? "warn" : "neutral"} hint={inventory > 0 ? "long" : inventory < 0 ? "short" : "flat"} />
      </div>

      {endless ? (
        <div className="target-rail">
          <div className="target-track">
            <div className="target-zero" />
            <div
              className={`target-fill ${total >= 0 ? "pos" : "neg"}`}
              style={{ width: `${Math.min(100, (Math.abs(total) / target) * 50)}%`, left: total >= 0 ? "50%" : undefined, right: total < 0 ? "50%" : undefined }}
            />
          </div>
          <span>Reach {fmt(target)} to win. Bust at {fmt(bust)}.</span>
        </div>
      ) : null}

      <div className="play-grid">
        <Panel className="prompt-panel">
          <PanelHead kicker="Quote a two sided market" title={payoff.name} />
          <span className="setup-chip">{setupLabel(config)}</span>
          <p className="prompt-text">{payoff.description}</p>
          <p className="prompt-sub">
            A fresh hidden {drawNoun(config)} is drawn each round. Your {counterparty} counterparty
            trades only when your price helps them. You are playing for {meta.label.toLowerCase()}.
          </p>

          {phase !== "summary" ? (
            <>
              <div className="quote-form">
                <label className="bidask bid">
                  <span>Bid</span>
                  <input type="number" inputMode="decimal" value={bid} placeholder="you buy at" onChange={(e) => setBid(e.target.value)} disabled={phase === "result"} />
                </label>
                <div className="bidask-spread">
                  <span>width</span>
                  <strong>{validQuote ? fmt(askNum - bidNum) : "."}</strong>
                </div>
                <label className="bidask ask">
                  <span>Ask</span>
                  <input type="number" inputMode="decimal" value={ask} placeholder="you sell at" onChange={(e) => setAsk(e.target.value)} disabled={phase === "result"} />
                </label>
              </div>
              {crossed ? <p className="quote-error">Bid must be at or below ask.</p> : null}

              {phase === "quote" ? (
                <button className="arena-start" onClick={submit} disabled={!validQuote}>
                  Submit quote
                </button>
              ) : null}

              {phase === "result" && current ? (
                <ResultBlock
                  log={current}
                  counterparty={counterparty}
                  fairValue={baseStats.ev}
                  sessionOver={sessionOver}
                  onNext={next}
                  onFinish={() => setPhase("summary")}
                />
              ) : null}
            </>
          ) : (
            <SummaryBlock objective={objective} stats={stats} headline={headline} benchQuote={benchQuote} endless={endless} total={total} target={target} pnls={roundPnls} onAgain={reset} onExit={onExit} />
          )}
        </Panel>

        <Panel>
          <PanelHead
            kicker="Coaching for this rule"
            title={`Best ${meta.label.toLowerCase()} quote`}
            right={<Pill tone="accent">{fmt(benchQuote.quote.bid)} / {fmt(benchQuote.quote.ask)}</Pill>}
          />
          <p className="implication">{benchQuote.rationale}</p>
          <div className="stat-grid two" style={{ marginTop: 12 }}>
            <Stat label="Its expected PnL" value={fmtSigned(benchQuote.expectedPnl)} tone={benchQuote.expectedPnl >= 0 ? "good" : "bad"} />
            <Stat label="Its worst case" value={fmt(benchQuote.worstCasePnl)} tone={benchQuote.worstCasePnl >= 0 ? "good" : "bad"} />
          </div>

          {logs.length ? (
            <div className="history">
              <span className="pnl-rail-title">Round history</span>
              {logs.slice().reverse().map((l) => (
                <div key={l.round} className="history-row">
                  <span>#{l.round}</span>
                  <Pill tone={ACTION_COPY[l.action].tone}>
                    {l.action === "buy_from_user" ? "sold" : l.action === "sell_to_user" ? "bought" : "pass"}
                  </Pill>
                  <span className="history-quote">{fmt(l.quote.bid)}/{fmt(l.quote.ask)}</span>
                  <strong className={l.pnl >= 0 ? "pos" : "neg"}>{fmtSigned(l.pnl)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="locked-hint" style={{ marginTop: 12 }}>
              Quote a few rounds. Your history and how it scores for {meta.label.toLowerCase()} builds up here.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function ResultBlock({
  log, counterparty, fairValue, sessionOver, onNext, onFinish,
}: {
  log: RoundLog;
  counterparty: string;
  fairValue: number;
  sessionOver: boolean;
  onNext: () => void;
  onFinish: () => void;
}) {
  const informed = counterparty !== "uninformed";
  const action = ACTION_COPY[log.action];
  return (
    <div className="result-block">
      <div className="reveal-outcome">
        <div className="result-payoff-line">
          <Pill tone={action.tone}>{action.label}</Pill>
          <span className="result-pnl">
            round <strong className={log.pnl >= 0 ? "pos" : "neg"}>{fmtSigned(log.pnl)}</strong>
          </span>
        </div>
        <div className="reveal-payoff">
          <span>True payoff</span>
          <strong>{fmt(log.truePayoff)}</strong>
        </div>
      </div>
      <p className="implication small">{lessonFor(log, fairValue, informed)}</p>
      {sessionOver ? (
        <button className="arena-start" onClick={onFinish}>
          <Flag size={16} /> See results
        </button>
      ) : (
        <div className="result-actions">
          <button className="arena-start compact" onClick={onNext}>
            <RefreshCcw size={16} /> Next round
          </button>
          <button className="ghost-btn" onClick={onFinish}>
            <Flag size={16} /> End now
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryBlock({
  objective, stats, headline, benchQuote, endless, total, target, pnls, onAgain, onExit,
}: {
  objective: string;
  stats: ReturnType<typeof sessionStats>;
  headline: { label: string; value: number; kind: "pnl" | "sharpe" };
  benchQuote: ReturnType<typeof bestQuotesByObjective>["fair"];
  endless: boolean;
  total: number;
  target: number;
  pnls: number[];
  onAgain: () => void;
  onExit: () => void;
}) {
  const verdict = verdictFor(objective, stats, benchQuote);
  const headlineValue = headline.kind === "sharpe"
    ? (Number.isFinite(headline.value) ? fmt(headline.value) : headline.value > 0 ? "steady" : "0")
    : fmtSigned(headline.value);

  return (
    <div className="summary-block">
      {endless ? (
        <div className={`verdict ${total >= target ? "good" : "bad"}`}>
          <strong>{total >= target ? "Target reached" : "Busted out"}</strong>
          <span>You {total >= target ? "hit" : "missed"} the {fmt(target)} target over {stats.rounds} rounds.</span>
        </div>
      ) : null}

      <div className="headline-score">
        <span>{headline.label}</span>
        <strong className={headline.kind === "pnl" ? (headline.value >= 0 ? "pos" : "neg") : "accent"}>
          {headlineValue}
        </strong>
      </div>

      <EquityCurve pnls={pnls} />

      <div className="stat-grid">
        <Stat label="Total PnL" value={fmtSigned(stats.total)} tone={stats.total >= 0 ? "good" : "bad"} />
        <Stat label="Per round" value={fmtSigned(stats.mean)} />
        <Stat label="Std dev" value={fmt(stats.std)} />
        <Stat label="Worst round" value={fmt(stats.worst)} tone={stats.worst >= 0 ? "good" : "bad"} />
        <Stat label="Best round" value={fmt(stats.best)} tone="good" />
        <Stat label="Rounds" value={String(stats.rounds)} />
      </div>

      <div className={`lesson ${verdict.tone}`}>
        <strong>{verdict.title}</strong>
        <p>{verdict.text}</p>
      </div>

      <div className="lab-actions">
        <button className="ghost-btn" onClick={onExit}>Lobby</button>
        <button className="arena-start compact" onClick={onAgain}>
          <RotateCcw size={16} /> Play again
        </button>
      </div>
    </div>
  );
}

function EquityCurve({ pnls }: { pnls: number[] }) {
  if (pnls.length < 2) return null;
  const cumulative: number[] = [];
  let run = 0;
  for (const p of pnls) {
    run += p;
    cumulative.push(run);
  }
  const w = 280;
  const h = 70;
  const min = Math.min(0, ...cumulative);
  const max = Math.max(0, ...cumulative);
  const span = Math.max(1, max - min);
  const pts = cumulative
    .map((v, i) => `${(i / (cumulative.length - 1)) * w},${h - ((v - min) / span) * h}`)
    .join(" ");
  return (
    <svg className="equity" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Cumulative PnL">
      <polyline points={pts} />
    </svg>
  );
}

function verdictFor(
  objective: string,
  stats: ReturnType<typeof sessionStats>,
  bench: ReturnType<typeof bestQuotesByObjective>["fair"],
): { title: string; text: string; tone: "good" | "warn" | "bad" } {
  if (objective === "max_worst_case") {
    const ok = stats.worst >= bench.worstCasePnl - 1e-9;
    return {
      title: ok ? "Floor held" : "Floor cracked",
      text: ok
        ? `Your worst round was ${fmt(stats.worst)}, at or above the best guaranteed floor of ${fmt(bench.worstCasePnl)}. That is the market maker mindset: no round can really hurt you.`
        : `Your worst round was ${fmt(stats.worst)}, below the ${fmt(bench.worstCasePnl)} floor a max worst case quote would have locked in. Widen the side that got picked off.`,
      tone: ok ? "good" : "bad",
    };
  }
  if (objective === "min_variance") {
    const good = Number.isFinite(stats.sharpe) ? stats.sharpe > 1 : stats.sharpe > 0;
    return {
      title: good ? "Steady book" : "Too bumpy",
      text: good
        ? `Sharpe of ${Number.isFinite(stats.sharpe) ? fmt(stats.sharpe) : "very high"} with a ${fmt(stats.std)} swing per round. Consistent quoting beats chasing the odd big print here.`
        : `Std of ${fmt(stats.std)} per round is large for the profit you booked. The defensive quote ${fmt(bench.quote.bid)} to ${fmt(bench.quote.ask)} keeps a non negative floor and smooths the ride.`,
      tone: good ? "good" : "warn",
    };
  }
  // max_ev / free
  const benchTotal = bench.expectedPnl * stats.rounds;
  const good = stats.total >= benchTotal - 1e-9;
  return {
    title: good ? "Edge captured" : "Left money on the table",
    text: good
      ? `You booked ${fmtSigned(stats.total)} over ${stats.rounds} rounds, ahead of the ${fmtSigned(benchTotal)} the benchmark quote expects. Good edge capture.`
      : `You booked ${fmtSigned(stats.total)}. The max EV quote ${fmt(bench.quote.bid)} to ${fmt(bench.quote.ask)} expects about ${fmtSigned(benchTotal)} across these rounds. Tighten toward fair where the counterparty cannot punish you.`,
    tone: good ? "good" : "warn",
  };
}

function lessonFor(log: RoundLog, fairValue: number, informed: boolean): string {
  const { action, quote, truePayoff, pnl } = log;
  if (action === "pass") {
    return informed
      ? `No trade. Your market ${fmt(quote.bid)} to ${fmt(quote.ask)} contained the true payoff ${fmt(truePayoff)}, so the informed desk had no edge.`
      : `No trade. Fair value ${fmt(fairValue)} sat inside your market. Tighten to capture spread.`;
  }
  if (action === "buy_from_user") {
    return informed
      ? `They lifted your ask at ${fmt(quote.ask)}; the true payoff was ${fmt(truePayoff)}. You sold too cheap. Lift the ask or widen.`
      : `Flow bought your ask at ${fmt(quote.ask)}. You booked ${fmtSigned(pnl)} versus the settled ${fmt(truePayoff)}.`;
  }
  return informed
    ? `They hit your bid at ${fmt(quote.bid)}; the true payoff was only ${fmt(truePayoff)}. You bought too rich. Lower the bid or widen.`
    : `Flow sold into your bid at ${fmt(quote.bid)}. You booked ${fmtSigned(pnl)} versus the settled ${fmt(truePayoff)}.`;
}
