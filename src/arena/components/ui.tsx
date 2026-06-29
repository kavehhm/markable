import type { ReactNode } from "react";

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
