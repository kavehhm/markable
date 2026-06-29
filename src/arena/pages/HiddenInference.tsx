import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import {
  GameState,
  TradeAction,
  actionImplication,
  computeUserPnl,
  decideCounterpartyAction,
  drawTrueState,
  enumerateStates,
  findInferenceScenario,
  findPayoff,
  summariseBelief,
  updateBeliefsAfterAction,
} from "../engine";
import { ArenaSession } from "../ArenaApp";
import { OutcomeView } from "../components/OutcomeView";
import { Panel, PanelHead, Pill, Stat } from "../components/ui";
import { fmt, fmtSigned, pct } from "../format";
import { Topline } from "./FairValueDrill";

type RoundLog = {
  round: number;
  quote: { bid: number; ask: number };
  action: TradeAction;
  pnl: number;
  remaining: number;
};

export function HiddenInference({
  session,
  onExit,
}: {
  session: ArenaSession;
  onExit: () => void;
}) {
  const scenario = useMemo(
    () => findInferenceScenario(session.inferenceId ?? session.payoffId),
    [session.inferenceId, session.payoffId],
  );
  const ROUNDS = session.rounds ?? scenario.rounds;
  const config = scenario.config;
  const payoff = useMemo(() => findPayoff(scenario.payoffId)!, [scenario.payoffId]);
  const states = useMemo(() => enumerateStates(config), [config]);
  const total = states.length;

  const [gameId, setGameId] = useState(0);
  const trueState = useMemo(
    () => drawTrueState(states),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [states, gameId],
  );
  const truePayoff = payoff.evaluate(trueState);

  const [belief, setBelief] = useState<GameState[]>(states);
  const [round, setRound] = useState(1);
  const [logs, setLogs] = useState<RoundLog[]>([]);
  const [pnl, setPnl] = useState(0);
  const [phase, setPhase] = useState<"quote" | "guess" | "done">("quote");

  const [bid, setBid] = useState("");
  const [ask, setAsk] = useState("");
  const [guess, setGuess] = useState("");

  const summary = useMemo(() => summariseBelief(belief, payoff), [belief, payoff]);

  const bidNum = Number(bid);
  const askNum = Number(ask);
  const validQuote =
    bid.trim() !== "" && ask.trim() !== "" &&
    Number.isFinite(bidNum) && Number.isFinite(askNum) && bidNum <= askNum;

  function submitQuote() {
    if (!validQuote) return;
    const quote = { bid: bidNum, ask: askNum };
    const action = decideCounterpartyAction(quote, {
      type: "informed",
      fairValue: summary.conditionalEv,
      truePayoff,
    });
    const roundPnl = computeUserPnl(action, quote, truePayoff);
    const survivors = updateBeliefsAfterAction(belief, quote, action, payoff);

    setBelief(survivors);
    setPnl((p) => p + roundPnl);
    setLogs((l) => [
      ...l,
      { round, quote, action, pnl: roundPnl, remaining: survivors.length },
    ]);
    setBid("");
    setAsk("");
    if (round >= ROUNDS) setPhase("guess");
    else setRound((r) => r + 1);
  }

  function submitGuess() {
    setPhase("done");
  }

  function newGame() {
    setGameId((g) => g + 1);
    setBelief(states);
    setRound(1);
    setLogs([]);
    setPnl(0);
    setPhase("quote");
    setBid("");
    setAsk("");
    setGuess("");
  }

  const guessNum = Number(guess);
  const guessError = guess.trim() !== "" ? Math.abs(guessNum - truePayoff) : null;
  const inPosterior = truePayoff >= summary.min && truePayoff <= summary.max;

  return (
    <div className="arena-shell">
      <Topline
        title="Hidden State Inference"
        onExit={onExit}
        right={
          <span className="topline-tags">
            <span className="cp-chip">{scenario.difficulty}</span>
            <span className="cp-chip muted">vs informed</span>
          </span>
        }
      />

      <div className="session-bar">
        <Stat label="Round" value={phase === "quote" ? `${round} / ${ROUNDS}` : "done"} />
        <Stat label="PnL" value={fmtSigned(pnl)} tone={pnl >= 0 ? "good" : "bad"} />
        <Stat label="States left" value={`${summary.count.toLocaleString()}`} tone="accent" />
        <Stat label="Coverage" value={pct(summary.count / total, 1)} />
      </div>

      <div className="play-grid">
        <Panel className="prompt-panel">
          <PanelHead kicker={scenario.title} title={payoff.name} />
          <span className="setup-chip">{scenario.setup}</span>
          <p className="prompt-text">{scenario.prompt}</p>
          <p className="prompt-sub">
            You get {ROUNDS} quotes. Each toxic trade or pass is a constraint on the hidden payoff.
            After the last quote, lock your numeric estimate.
          </p>

          {phase === "quote" ? (
            <>
              <div className="quote-form">
                <label className="bidask bid">
                  <span>Bid</span>
                  <input type="number" inputMode="decimal" value={bid} placeholder="buy at" onChange={(e) => setBid(e.target.value)} />
                </label>
                <div className="bidask-spread">
                  <span>width</span>
                  <strong>{validQuote ? fmt(askNum - bidNum) : "."}</strong>
                </div>
                <label className="bidask ask">
                  <span>Ask</span>
                  <input type="number" inputMode="decimal" value={ask} placeholder="sell at" onChange={(e) => setAsk(e.target.value)} />
                </label>
              </div>
              <button className="arena-start" onClick={submitQuote} disabled={!validQuote}>
                Submit quote {round} of {ROUNDS}
              </button>
            </>
          ) : null}

          {phase === "guess" ? (
            <>
              <label className="big-input">
                <span>Your guess for the {payoff.name.toLowerCase()}</span>
                <input type="number" inputMode="decimal" value={guess} placeholder="a number" onChange={(e) => setGuess(e.target.value)} />
              </label>
              <p className="prompt-sub">Posterior says it sits between {fmt(summary.min)} and {fmt(summary.max)}.</p>
              <button className="arena-start" onClick={submitGuess} disabled={guess.trim() === ""}>
                Lock guess
              </button>
            </>
          ) : null}

          {phase === "done" ? (
            <>
              <div className="reveal-outcome">
                <OutcomeView state={trueState} />
                <div className="reveal-payoff">
                  <span>True {payoff.name.toLowerCase()}</span>
                  <strong>{fmt(truePayoff)}</strong>
                </div>
              </div>
              <div className="stat-grid">
                <Stat label="Final PnL" value={fmtSigned(pnl)} tone={pnl >= 0 ? "good" : "bad"} />
                <Stat label="Guess error" value={guessError === null ? "." : fmt(guessError)} tone={guessError !== null && guessError <= 1 ? "good" : "warn"} />
                <Stat label="In posterior" value={inPosterior ? "yes" : "no"} tone={inPosterior ? "good" : "bad"} />
              </div>
              <button className="ghost-btn wide" onClick={newGame}>
                <RefreshCcw size={16} /> {scenario.resetLabel}
              </button>
            </>
          ) : null}
        </Panel>

        <Panel>
          <PanelHead kicker="Information tape" title="What each action revealed" />
          {logs.length === 0 ? (
            <div className="locked-hint">No quotes yet. Wide markets reveal less. Tight markets reveal more but risk getting picked off.</div>
          ) : (
            <div className="tape">
              {logs.map((log) => (
                <div key={log.round} className="tape-row">
                  <div className="tape-head">
                    <span>Round {log.round}</span>
                    <Pill tone={log.action === "pass" ? "warn" : "bad"}>
                      {log.action === "buy_from_user" ? "they bought" : log.action === "sell_to_user" ? "they sold" : "passed"}
                    </Pill>
                  </div>
                  <p className="tape-quote">{fmt(log.quote.bid)} / {fmt(log.quote.ask)} · pnl {fmtSigned(log.pnl)}</p>
                  <p className="implication small">{actionImplication(log.action, log.quote)}</p>
                  <div className="belief-bar">
                    <i style={{ width: `${(log.remaining / total) * 100}%` }} />
                  </div>
                  <span className="belief-pct">{log.remaining.toLocaleString()} states left</span>
                </div>
              ))}
            </div>
          )}
          {phase !== "quote" ? (
            <div className="stat-grid two" style={{ marginTop: 12 }}>
              <Stat label="Conditional fair value" value={fmt(summary.conditionalEv)} tone="accent" />
              <Stat label="Posterior range" value={`${fmt(summary.min)} to ${fmt(summary.max)}`} />
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
