/**
 * Rad s novčanim iznosima za e-evidencije.
 *
 * UIO zahtjev: iznosi zaokruženi na 2 decimale, tačka kao decimalni separator,
 * format 999999999.99 (bez separatora hiljada, bez valute).
 */

/** Zaokruživanje na 2 decimale (half-up), otporno na binarne greške. */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Formatira iznos za CSV: "1234.56". Nula/prazno → "" (UIO dozvoljava prazno). */
export function formatAmountCsv(value: number, blankIfZero = true): string {
  const v = round2(value);
  if (blankIfZero && v === 0) return "";
  return v.toFixed(2);
}

/** Formatira iznos koji se uvijek ispisuje (npr. prateći slog sume). */
export function formatAmountStrict(value: number): string {
  return round2(value).toFixed(2);
}

/**
 * Srazmjerni odbitak (KUF) — UIO „Moguće nedoumice":
 *   a) ulazni PDV ukupno = cijeli PDV sa fakture
 *   b) odbitni = a × (% / 100)
 *   c) neodbitni = a − b
 */
export function splitDeductibleVat(
  vatInputTotal: number,
  deductiblePercent: number
): { total: number; deductible: number; nonDeductible: number } {
  const total = round2(vatInputTotal);
  const pct = Math.min(100, Math.max(0, deductiblePercent));
  const deductible = round2(total * (pct / 100));
  const nonDeductible = round2(total - deductible);
  return { total, deductible, nonDeductible };
}

/** Izračun PDV-a iz osnovice po stopi (default 17%). */
export function vatFromBase(base: number, rate = 17): number {
  return round2(base * (rate / 100));
}

/** Sigurno sabiranje liste iznosa sa zaokruživanjem na kraju. */
export function sumAmounts(values: number[]): number {
  return round2(values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0));
}
