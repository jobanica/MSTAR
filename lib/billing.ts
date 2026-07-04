// Platform subscription pricing for shops using PrintOS.
// Base plan covers the shop (including its main branch); every
// additional active branch adds a per-branch fee.

export const PLAN_BASE_CENTAVOS = 250_000; // ₱2,500 / month
export const PER_BRANCH_CENTAVOS = 50_000; // ₱500 / month per extra branch

/** Monthly total in centavos for a given number of *additional* branches. */
export function monthlyTotalCentavos(additionalBranches: number): number {
  return PLAN_BASE_CENTAVOS + PER_BRANCH_CENTAVOS * Math.max(additionalBranches, 0);
}

/** First and last day of the current month as YYYY-MM-DD strings. */
export function currentBillingPeriod(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  return { start: iso(start), end: iso(end) };
}
