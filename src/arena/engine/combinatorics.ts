// Exact enumeration helpers. No Monte Carlo here — small finite games only.

/** All k-combinations (without replacement) of the index range [0, n). */
export function combinations(n: number, k: number): number[][] {
  const result: number[][] = [];
  const combo: number[] = [];
  function recurse(start: number) {
    if (combo.length === k) {
      result.push(combo.slice());
      return;
    }
    for (let i = start; i < n; i++) {
      combo.push(i);
      recurse(i + 1);
      combo.pop();
    }
  }
  recurse(0);
  return result;
}

/** Cartesian product: every sequence of length `count` over `values`. */
export function cartesianProduct<T>(values: T[], count: number): T[][] {
  let acc: T[][] = [[]];
  for (let i = 0; i < count; i++) {
    const next: T[][] = [];
    for (const partial of acc) {
      for (const v of values) {
        next.push([...partial, v]);
      }
    }
    acc = next;
  }
  return acc;
}

/** Binomial coefficient C(n, k). */
export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
}
