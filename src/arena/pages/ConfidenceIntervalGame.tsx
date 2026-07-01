import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { ArenaSession } from "../ArenaApp";
import { Panel, PanelHead, Pill, Stat } from "../components/ui";
import { fmt } from "../format";
import { Topline } from "../components/ui";
import { GameRules } from "../components/gameRules";

type CiPrompt = {
  id: string;
  title: string;
  unit: string;
  prompt: string;
  center: number;
  sigma: number;
  min: number;
  lesson: string;
};

const PROMPTS: CiPrompt[] = [
  {
    id: "sig_windows",
    title: "Office Windows",
    unit: "windows",
    prompt: "Give a 90% confidence interval for the number of windows in a large trading firm's headquarters.",
    center: 5200,
    sigma: 0.32,
    min: 300,
    lesson: "Break the building into floors, sides, and windows per bay. Your interval should be wide enough for architecture uncertainty, but not so wide that it avoids making a claim.",
  },
  {
    id: "empire_pingpong",
    title: "Ping Pong Balls",
    unit: "balls",
    prompt: "Give a 90% confidence interval for how many ping pong balls fit inside the Empire State Building.",
    center: 1.4e10,
    sigma: 0.58,
    min: 1e8,
    lesson: "Volume Fermi problems are multiplicative. Wide intervals are justified, but each factor should still be defensible.",
  },
  {
    id: "airport_passengers",
    title: "Airport Day Flow",
    unit: "passengers",
    prompt: "Give a 90% confidence interval for passengers through a major airport on a normal day.",
    center: 210000,
    sigma: 0.35,
    min: 10000,
    lesson: "Use gates, load factors, flights per gate, and arrivals plus departures. The uncertainty is real, but one order of magnitude is usually too loose.",
  },
  {
    id: "coffee_cups",
    title: "Manhattan Coffee",
    unit: "cups",
    prompt: "Give a 90% confidence interval for cups of coffee sold in Manhattan on a weekday.",
    center: 900000,
    sigma: 0.45,
    min: 30000,
    lesson: "Population times participation times cups per buyer is a clean structure. The interval should reflect uncertainty in habits and commuter flow.",
  },
];

function sampleLogNormal(center: number, sigma: number, min: number): number {
  const u1 = Math.max(1e-9, Math.random());
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(min, center * Math.exp(sigma * z - (sigma * sigma) / 2));
}

function compact(n: number): string {
  if (!Number.isFinite(n)) return ".";
  if (Math.abs(n) >= 1_000_000_000) return `${fmt(n / 1_000_000_000, 2)}B`;
  if (Math.abs(n) >= 1_000_000) return `${fmt(n / 1_000_000, 2)}M`;
  if (Math.abs(n) >= 1_000) return `${fmt(n / 1_000, 1)}k`;
  return fmt(n);
}

export function ConfidenceIntervalGame({
  onExit,
}: {
  session: ArenaSession;
  onExit: () => void;
}) {
  const [gameId, setGameId] = useState(0);
  const prompt = useMemo(() => PROMPTS[gameId % PROMPTS.length], [gameId]);
  const truth = useMemo(() => sampleLogNormal(prompt.center, prompt.sigma, prompt.min), [prompt, gameId]);
  const [low, setLow] = useState("");
  const [high, setHigh] = useState("");
  const [revealed, setRevealed] = useState(false);

  const lowNum = Number(low);
  const highNum = Number(high);
  const hasNumbers = low.trim() !== "" && high.trim() !== "" && Number.isFinite(lowNum) && Number.isFinite(highNum);
  const valid = hasNumbers && lowNum > 0 && highNum >= lowNum;
  const contains = valid && truth >= lowNum && truth <= highNum;
  const widthRatio = valid ? highNum / lowNum : 0;
  const centerMiss = valid ? Math.abs(Math.log(truth / Math.sqrt(lowNum * highNum))) : 0;
  const widthPenalty = valid ? Math.max(0, Math.log(widthRatio) - Math.log(8)) : 0;
  const score = valid
    ? Math.max(0, Math.round(100 - centerMiss * 30 - widthPenalty * 24 - (contains ? 0 : 35)))
    : 0;

  function next() {
    setGameId((id) => id + 1);
    setLow("");
    setHigh("");
    setRevealed(false);
  }

  return (
    <div className="arena-shell">
      <Topline title="Confidence Interval" onExit={onExit} rules={<GameRules game="confidence_interval" />} right={<span className="cp-chip">target 90%</span>} />

      <div className="play-grid">
        <Panel className="prompt-panel">
          <PanelHead kicker={prompt.title} title="Give a realistic 90% interval" />
          <p className="prompt-text">{prompt.prompt}</p>
          <p className="prompt-sub">
            The interviewer is testing calibrated uncertainty. Make the interval wide enough to cover
            plausible error, but tight enough that someone would still trade with you.
          </p>

          <div className="quote-form">
            <label className="bidask bid">
              <span>Low</span>
              <input type="number" inputMode="decimal" value={low} placeholder="lower bound" onChange={(e) => setLow(e.target.value)} disabled={revealed} />
            </label>
            <div className="bidask-spread">
              <span>ratio</span>
              <strong>{valid ? `${fmt(widthRatio, 1)}x` : "."}</strong>
            </div>
            <label className="bidask ask">
              <span>High</span>
              <input type="number" inputMode="decimal" value={high} placeholder="upper bound" onChange={(e) => setHigh(e.target.value)} disabled={revealed} />
            </label>
          </div>

          {hasNumbers && lowNum <= 0 ? <p className="quote-error">Low must be positive.</p> : null}
          {hasNumbers && highNum < lowNum ? <p className="quote-error">High must be at least low.</p> : null}

          {!revealed ? (
            <button className="arena-start" onClick={() => setRevealed(true)} disabled={!valid}>
              Reveal score
            </button>
          ) : (
            <div className="summary-block">
              <div className={`headline-score ${contains ? "good" : "bad"}`}>
                <span>Score</span>
                <strong className={contains ? "pos" : "neg"}>{score}</strong>
              </div>
              <div className="stat-grid">
                <Stat label="Truth" value={`${compact(truth)} ${prompt.unit}`} tone="accent" />
                <Stat label="Covered" value={contains ? "yes" : "no"} tone={contains ? "good" : "bad"} />
                <Stat label="Width ratio" value={`${fmt(widthRatio, 1)}x`} tone={widthRatio > 20 ? "warn" : "neutral"} />
              </div>
              <button className="ghost-btn wide" onClick={next}>
                <RefreshCcw size={16} /> Next interval
              </button>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHead kicker="Calibration" title="How this is scored" />
          <div className="ci-scale">
            <div>
              <span>Too narrow</span>
              <strong>misses truth</strong>
            </div>
            <div>
              <span>Calibrated</span>
              <strong>covers with discipline</strong>
            </div>
            <div>
              <span>Too wide</span>
              <strong>no one trades</strong>
            </div>
          </div>
          <p className="implication" style={{ marginTop: 12 }}>
            {revealed ? prompt.lesson : "A good answer names the model: units, count, utilization, and uncertainty. Avoid both false precision and meaningless width."}
          </p>
          {revealed ? (
            <div className={`lesson ${contains ? "good" : "bad"}`}>
              <strong>{contains ? "Covered" : "Missed"}</strong>
              <p>
                Your interval was {compact(lowNum)} to {compact(highNum)} {prompt.unit}.
                The sampled interviewer answer was {compact(truth)} {prompt.unit}.
              </p>
            </div>
          ) : (
            <div className="locked-hint">Submit an interval to reveal the hidden interviewer answer and width penalty.</div>
          )}
        </Panel>
      </div>
    </div>
  );
}
