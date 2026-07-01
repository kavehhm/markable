import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import {
  FV_CATEGORIES,
  FV_QUESTIONS,
  FvCategory,
  FvGrade,
  gradeFv,
} from "../fvSprint";
import { GameRules } from "../components/gameRules";
import { Topline } from "../components/ui";
import { fmt } from "../format";

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** A short title for a question, pulled from its payoff phrasing. */
function shortName(prompt: string): string {
  const m = prompt.lastIndexOf("Payoff = ");
  if (m >= 0) return cap(prompt.slice(m + 9).replace(/\.$/, ""));
  const pays = prompt.match(/Pays 100 if (.+?), else 0/i);
  if (pays) return cap(pays[1]);
  const exp = prompt.match(/Expected (.+?)\.?$/i);
  if (exp) return cap(`expected ${exp[1]}`);
  return prompt.replace(/\.$/, "");
}

function difficultyFor(cat: FvCategory): "easy" | "medium" | "hard" {
  if (cat === "Products" || cat === "Waiting" || cat === "Conditional") return "hard";
  if (cat === "Binary" || cat === "Extremes") return "medium";
  return "easy";
}

const GRADE_COPY: Record<FvGrade, { title: string; tone: "good" | "warn" | "bad" }> = {
  good: { title: "Sharp estimate", tone: "good" },
  warn: { title: "Close, tighten it up", tone: "warn" },
  bad: { title: "Rework it from the counts", tone: "bad" },
};

export function FairValue({ onExit }: { onExit: () => void }) {
  const [currentId, setCurrentId] = useState(FV_QUESTIONS[0].id);
  const [guess, setGuess] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<number, FvGrade>>({});
  const [collapsed, setCollapsed] = useState<Set<FvCategory>>(new Set());
  const [search, setSearch] = useState("");

  const current = FV_QUESTIONS.find((q) => q.id === currentId)!;
  const diff = difficultyFor(current.category);
  const index = FV_QUESTIONS.findIndex((q) => q.id === currentId);

  const guessNum = Number(guess);
  const hasGuess = guess.trim() !== "" && Number.isFinite(guessNum);
  const grade = revealed && hasGuess ? gradeFv(guessNum, current.fv) : null;
  const error = hasGuess ? Math.abs(guessNum - current.fv) : null;

  const answered = Object.keys(answers).length;
  const correct = Object.values(answers).filter((g) => g === "good").length;

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FV_CATEGORIES.map((cat) => ({
      cat,
      items: FV_QUESTIONS.filter(
        (item) => item.category === cat && (!q || `${item.prompt}`.toLowerCase().includes(q)),
      ),
    })).filter((g) => g.items.length > 0);
  }, [search]);

  function select(id: number) {
    setCurrentId(id);
    setGuess("");
    setRevealed(false);
  }

  function check() {
    if (!hasGuess || revealed) return;
    setAnswers((a) => ({ ...a, [current.id]: gradeFv(guessNum, current.fv) }));
    setRevealed(true);
  }

  function step(delta: number) {
    const next = FV_QUESTIONS[(index + delta + FV_QUESTIONS.length) % FV_QUESTIONS.length];
    select(next.id);
  }

  function toggleGroup(cat: FvCategory) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  return (
    <div className="arena-shell">
      <Topline
        title="Fair Value"
        onExit={onExit}
        rules={<GameRules game="fair_value" />}
        right={<span className="cp-chip">{correct} sharp · {answered} / {FV_QUESTIONS.length} done</span>}
      />

      <div className="fv-layout">
        <aside className="fv-sidebar">
          <div className="fv-sidebar-search">
            <Search size={14} />
            <input type="text" value={search} placeholder="Search questions" onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="fv-sidebar-body">
            {groups.map(({ cat, items }) => {
              const isCollapsed = collapsed.has(cat);
              return (
                <div key={cat} className="fv-group">
                  <button type="button" className={`fv-group-head ${isCollapsed ? "collapsed" : ""}`} onClick={() => toggleGroup(cat)}>
                    <span>{cat}</span>
                    <span className="fv-group-meta">{items.length}<ChevronDown size={15} className="fv-chev" /></span>
                  </button>
                  {!isCollapsed
                    ? items.map((q) => (
                        <button type="button" key={q.id} className={`fv-item ${q.id === currentId ? "active" : ""}`} onClick={() => select(q.id)}>
                          <StatusDot grade={answers[q.id]} />
                          <span className="fv-item-name">{shortName(q.prompt)}</span>
                        </button>
                      ))
                    : null}
                </div>
              );
            })}
          </div>
        </aside>

        <section className="fv-detail">
          <div className="fv-detail-top">
            <button type="button" className="fv-nav" onClick={() => step(-1)} aria-label="Previous">‹</button>
            <span className="fv-counter">{index + 1} / {FV_QUESTIONS.length}</span>
            <button type="button" className="fv-nav" onClick={() => step(1)} aria-label="Next">›</button>
          </div>

          <div className="fv-detail-body">
            <div className="fv-q-head">
              <h1 className="fv-q-title">{shortName(current.prompt)}</h1>
              <span className={`diff-text ${diff}`}>{diff}</span>
            </div>
            <div className="fv-tags">
              <span className="meta-tag">{current.category}</span>
            </div>

            <p className="fv-rich">{current.prompt}</p>

            <div className="fv-answer-row">
              <input
                className="fv-answer-input"
                type="number"
                inputMode="decimal"
                value={guess}
                placeholder="Your fair value"
                disabled={revealed}
                onChange={(e) => setGuess(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") check(); }}
              />
              {!revealed ? (
                <button type="button" className="fv-answer-submit" onClick={check} disabled={!hasGuess}>Check</button>
              ) : (
                <button type="button" className="fv-answer-submit" onClick={() => step(1)}>Next question</button>
              )}
            </div>

            {revealed && grade ? (
              <div className={`fv-verdict ${GRADE_COPY[grade].tone}`}>
                <strong>{GRADE_COPY[grade].title}</strong>
                <p>You said {fmt(guessNum)}. The fair value is {fmt(current.fv)}, so you were off by {fmt(error ?? 0)}.</p>
              </div>
            ) : (
              <p className="fv-hint">Break the question into a count or an average per item, multiply, and commit. A guess within about ten percent counts as sharp.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusDot({ grade }: { grade?: FvGrade }) {
  if (!grade) return <span className="fv-status empty" />;
  const tone = grade === "good" ? "good" : grade === "warn" ? "warn" : "bad";
  return <span className={`fv-status filled ${tone}`} />;
}
