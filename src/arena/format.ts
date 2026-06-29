export function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "–";
  if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString();
  return Number(n.toFixed(digits)).toString();
}

export function fmtSigned(n: number, digits = 2): string {
  const s = fmt(n, digits);
  return n > 0 ? `+${s}` : s;
}

export function pct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}
