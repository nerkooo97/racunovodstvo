/** Ukupan staž u godinama (za minuli rad) na zadani datum. */
export function computeMinuliRadYears(
  firstEmploymentDate: string | null | undefined,
  priorYears: number = 0,
  priorMonths: number = 0,
  asOf: Date = new Date()
): number {
  const safePrior = Math.max(0, priorYears) * 12 + Math.max(0, Math.min(11, priorMonths));
  if (!firstEmploymentDate) {
    return Math.floor(safePrior / 12);
  }

  const start = new Date(firstEmploymentDate);
  if (isNaN(start.getTime())) {
    return Math.floor(safePrior / 12);
  }

  let totalMonths = safePrior;
  totalMonths +=
    (asOf.getFullYear() - start.getFullYear()) * 12 +
    (asOf.getMonth() - start.getMonth());
  if (asOf.getDate() < start.getDate()) {
    totalMonths -= 1;
  }

  return Math.max(0, Math.floor(totalMonths / 12));
}
