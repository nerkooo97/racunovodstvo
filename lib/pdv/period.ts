/**
 * Izračun poreznog perioda (e-KIF/e-KUF) iz datuma.
 *
 * Pravilo UIO: porezni period se određuje prema datumu isporuke (tax point),
 * ne prema datumu izdavanja računa. Račun izdat 02.07. za uslugu izvršenu u
 * junu pripada JUNSKOM periodu.
 *
 * Za KUF se koristi datum prijema/evidentiranja (receipt_date).
 */

export interface TaxPeriod {
  year: number;
  month: number; // 1–12
}

const MONTHS = [
  "",
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "August",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

export function monthName(month: number): string {
  return MONTHS[month] ?? String(month);
}

export function periodLabel(p: TaxPeriod): string {
  return `${monthName(p.month)} ${p.year}`;
}

/** Parsira "YYYY-MM-DD" u period bez vremenskih zona (lokalni datum dokumenta). */
export function periodFromDateString(dateStr: string): TaxPeriod {
  const [y, m] = dateStr.split("-");
  const year = parseInt(y, 10);
  const month = parseInt(m, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error(`Neispravan datum za porezni period: ${dateStr}`);
  }
  return { year, month };
}

/**
 * KIF period: prioritet tax_point_date → delivery_date → issue_date.
 */
export function kifPeriod(input: {
  taxPointDate?: string | null;
  deliveryDate?: string | null;
  issueDate: string;
}): TaxPeriod {
  const chosen = input.taxPointDate || input.deliveryDate || input.issueDate;
  return periodFromDateString(chosen);
}

/**
 * KUF period: datum prijema/evidentiranja (receipt_date).
 */
export function kufPeriod(receiptDate: string): TaxPeriod {
  return periodFromDateString(receiptDate);
}

/** Format YYMM za naziv datoteke i slog zaglavlja (npr. juni 2025 → "2506"). */
export function toYYMM(p: TaxPeriod): string {
  const yy = String(p.year % 100).padStart(2, "0");
  const mm = String(p.month).padStart(2, "0");
  return `${yy}${mm}`;
}

export function periodsEqual(a: TaxPeriod, b: TaxPeriod): boolean {
  return a.year === b.year && a.month === b.month;
}

/** Prvi dozvoljeni dan dostave: prvi dan po isteku perioda (čl. 7). */
export function isPeriodOpenForExport(p: TaxPeriod, now: Date = new Date()): boolean {
  const firstNextMonth = new Date(p.year, p.month, 1); // mjesec je 0-indeksiran ⇒ p.month = sljedeći mjesec
  return now >= firstNextMonth;
}

/** Sljedeći otvoreni period (za naknadne dokumente kad je tekući zaključan). */
export function nextPeriod(p: TaxPeriod): TaxPeriod {
  return p.month === 12
    ? { year: p.year + 1, month: 1 }
    : { year: p.year, month: p.month + 1 };
}
