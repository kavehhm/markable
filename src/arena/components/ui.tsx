import { useState, type ReactNode } from "react";
import { ArrowLeft, HelpCircle, X } from "lucide-react";

export function Topline({
  title,
  onExit,
  right,
  rules,
}: {
  title: string;
  onExit: () => void;
  right?: ReactNode;
  rules?: ReactNode;
}) {
  return (
    <div className="arena-topline">
      <button className="ghost-btn" onClick={onExit}>
        <ArrowLeft size={16} /> Lobby
      </button>
      <span className="arena-mode-tag">
        {title}
        {rules ? <RulesButton>{rules}</RulesButton> : null}
      </span>
      {right}
    </div>
  );
}

export function RulesButton({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="rules-btn"
        onClick={() => setOpen(true)}
        aria-label="How this game works"
        title="How this game works"
      >
        <HelpCircle size={17} />
      </button>
      {open ? (
        <div className="rules-overlay" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="rules-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="rules-close" onClick={() => setOpen(false)} aria-label="Close">
              <X size={18} />
            </button>
            <div className="rules-body">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`a-panel ${className}`}>{children}</section>;
}

export function PanelHead({
  kicker,
  title,
  right,
}: {
  kicker?: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="a-panel-head">
      <div>
        {kicker ? <span className="a-kicker">{kicker}</span> : null}
        <h2 className="a-panel-title">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function Stat({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "good" | "bad" | "warn" | "accent";
  hint?: string;
}) {
  return (
    <div className={`a-stat tone-${tone}`}>
      <span className="a-stat-label">{label}</span>
      <strong className="a-stat-value">{value}</strong>
      {hint ? <span className="a-stat-hint">{hint}</span> : null}
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "bad" | "warn" | "accent";
}) {
  return <span className={`a-pill tone-${tone}`}>{children}</span>;
}
