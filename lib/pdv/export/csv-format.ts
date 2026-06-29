/**
 * Niske / CSV pomoćnici po Tehničkom uputstvu UIO.
 * Separator je ';' (zabranjen u podacima), kodiranje UTF-8, redovi CRLF.
 */

import { CSV_SEPARATOR } from "../constants";

const LINE_ENDING = "\r\n";

/**
 * Čisti tekstualno polje: uklanja separator i kontrolne znakove, trimuje,
 * skraćuje na max dužinu. UIO zabranjuje ';' u sadržaju.
 */
export function sanitizeText(
  value: string | null | undefined,
  maxLength: number
): string {
  if (!value) return "";
  const cleaned = value
    .replace(/[;\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, maxLength);
}

/** Spaja polja u jedan CSV red. Polja moraju već biti sanitizirana. */
export function csvRow(fields: string[]): string {
  return fields.join(CSV_SEPARATOR);
}

/** Spaja redove u dokument s CRLF završetkom (uklj. zadnji red). */
export function csvDocument(rows: string[]): string {
  return rows.join(LINE_ENDING) + LINE_ENDING;
}

/** Provjera da nijedno polje ne sadrži zabranjeni separator. */
export function assertNoSeparator(fields: string[]): void {
  for (const f of fields) {
    if (f.includes(CSV_SEPARATOR)) {
      throw new Error(
        `CSV polje sadrži zabranjeni separator '${CSV_SEPARATOR}': "${f}"`
      );
    }
  }
}

/** Veličina sadržaja u bajtovima (UTF-8) — za 5 MB limit. */
export function utf8ByteLength(content: string): number {
  return Buffer.byteLength(content, "utf-8");
}

/** Trenutni datum/vrijeme za slog zaglavlja. */
export function headerDateTime(now: Date = new Date()): {
  date: string;
  time: string;
} {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
    now.getSeconds()
  )}`;
  return { date, time };
}
