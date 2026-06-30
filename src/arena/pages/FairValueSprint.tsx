import { useMemo, useState } from "react";
import { RefreshCcw, ArrowRight } from "lucide-react";
import { Panel, PanelHead, Stat } from "../components/ui";
import { fmt } from "../format";
import { Topline } from "./FairValueDrill";
import {
  FV_CATEGORIES,
  FV_QUESTIONS,
  FvCategory,
  gradeFv,
  shuffledOrder,
} from "../fvSprint";

type Filter = "All" | FvCategory;
const FILTERS: Filter[] = ["All", ...FV_CATEGORIES];

export function FairValueSprint({ onExit }: { onExit: () => void }) {
  const [filter, setFilter] = useState<Filter>("All");

  const pool = useMemo(
    () =>
      filter === "All"
        ? FV_QUESTIONS
        : FV_QUESTIONS.filter((q) => q.category === filter),
    [filter],
  );

  // A shuffled queue of indices into `pool`, plus a position cursor.
  const [order, setOrder] = useState<number[]>(() => shuffledOrder(pool.length));
  const [pos, setPos] = useState(0);

  const [estimate, setEstimate] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [attempted, setAttempted] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);

  const question = pool[order[pos] ?? 0] ?? pool[0];

  const estimateNum = Number(estimate);
  const hasEstimate = estimate.trim() !== "" && Number.isFinite(estimateNum);
  const grade = hasEstimate ? gradeFv(estimateNum, question.fv) : "warn";
  const error = hasEstimate ? Math.abs(estimateNum - question.fv) : 0;

  function pickFilter(f: Filter) {
    if (f === filter) return;
    const next = f === "All" ? FV_QUESTIONS : FV_QUESTIONS.filter((q) => q.category === f);
    setFilter(f);
    setOrder(shuffledOrder(next.length));
    setPos(0);
    setEstimate("");
    setRevealed(false);
  }

  function check() {
    if (!hasEstimate || revealed) return;
    setRevealed(true);
    setAttempted((a) => a + 1);
    if (grade === "good") {
      setCorrect((c) => c + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  }

  function next() {
    setEstimate("");
    setRevealed(false);
    setPos((p) => {
      const np = p + 1;
      if (np >= order.length) {
        setOrder(shuffledOrder(pool.length));
        return 0;
      }
      return np;
    });
  }

  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

  return (
    <div className="arena-shell">
      <Topline
        title="Fair Value Sprint"
        onExit={onExit}
        right={
          <span className="arena-mode-tag">
            {correct}/{attempted} correct · streak {streak}
          </span>
        }
      />

      <div className="config-block" style={{ marginBottom: "1rem" }}>
        <span className="config-legend">Topic</span>
        <div className="seg seg-wrap">
          {FILTERS.map((f) => (
            <button
              type="button"
              key={f}
              className={`seg-btn ${filter === f ? "active" : ""}`}
              onClick={() => pickFilter(f)}
              aria-pressed={filter === f}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="play-grid">
        <Panel className="prompt-panel">
          <PanelHead
            kicker={`Question ${pos + 1} of ${pool.length} · ${question.category}`}
            title="Estimate the fair value"
          />
          <p className="prompt-text">{question.prompt}</p>

          <label className="big-input">
            <span>Your fair value</span>
            <input
              type="number"
              value={estimate}
              placeholder="type a number"
              onChange={(e) => setEstimate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (revealed) next();
                else check();
              }}
              disabled={revealed}
              inputMode="decimal"
              autoFocus
            />
          </label>

          {!revealed ? (
            <button className="arena-start" onClick={check} disabled={!hasEstimate}>
              Check
            </button>
          ) : (
            <button className="arena-start" onClick={next}>
              Next question <ArrowRight size={16} />
            </button>
          )}

          {revealed ? (
            <div className={`verdict ${grade}`}>
              <strong>
                You said {fmt(estimateNum)}. Fair value is {fmt(question.fv)}.
              </strong>
              <span>
                {grade === "good"
                  ? `Off by ${fmt(error)}. That is a tradeable first estimate.`
                  : grade === "warn"
                    ? `Off by ${fmt(error)}. In the right area, tighten it up.`
                    : `Off by ${fmt(error)}. Re derive this one from counts.`}
              </span>
            </div>
          ) : (
            <p className="prompt-sub">
              Cards run 2 to 14, with Jack 11, Queen 12, King 13, Ace 14, unless a
              question changes the rule for the round.
            </p>
          )}
        </Panel>

        <Panel>
          <PanelHead kicker="This run" title="Your score" />
          <div className="stat-grid two">
            <Stat label="Correct" value={`${correct}/${attempted}`} tone="accent" />
            <Stat label="Accuracy" value={`${accuracy}%`} />
            <Stat label="Streak" value={streak} tone={streak >= 3 ? "good" : "neutral"} />
            <Stat label="In topic" value={pool.length} />
          </div>
          <p className="metric-note">
            Correct means within about 10% of the exact fair value. The aim is a
            fast, confident first number you can build a market around.
          </p>
          <button
            className="ghost-btn wide"
            onClick={() => {
              setOrder(shuffledOrder(pool.length));
              setPos(0);
              setEstimate("");
              setRevealed(false);
              setAttempted(0);
              setCorrect(0);
              setStreak(0);
            }}
          >
            <RefreshCcw size={16} /> Reshuffle and reset score
          </button>
        </Panel>
      </div>
    </div>
  );
}
