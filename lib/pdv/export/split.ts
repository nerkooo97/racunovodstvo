/**
 * Razlaganje velikih e-evidencija u više CSV datoteka (< 5 MB svaka),
 * s ispravnim slogom zaglavlja/pratećim slogom i rednim brojem datoteke (ZZ).
 */

import { utf8ByteLength } from "./csv-format";
import { CSV_MAX_FILE_BYTES } from "../constants";
import type { CsvBuildResult } from "./kuf-csv";

/**
 * Gradi jednu ili više datoteka tako da svaka bude ispod `maxBytes`.
 * `buildOne` mora izgraditi kompletnu datoteku (zaglavlje + redovi + prateći slog)
 * za dati podskup stavki i redni broj datoteke.
 */
export function buildSplitCsv<E>(
  entries: E[],
  buildOne: (subset: E[], seq: number) => CsvBuildResult,
  startSeq = 1,
  maxBytes = CSV_MAX_FILE_BYTES
): CsvBuildResult[] {
  if (entries.length === 0) return [];

  // Ako cijela datoteka stane — jedna datoteka.
  const full = buildOne(entries, startSeq);
  if (utf8ByteLength(full.content) <= maxBytes) return [full];

  // Procijeni broj redova po datoteci iz prosječne veličine reda.
  const bytesPerRow = utf8ByteLength(full.content) / entries.length;
  const rowsPerFile = Math.max(
    1,
    Math.floor((maxBytes * 0.95) / bytesPerRow)
  );

  const files: CsvBuildResult[] = [];
  let seq = startSeq;
  let index = 0;

  while (index < entries.length) {
    let subset = entries.slice(index, index + rowsPerFile);
    let built = buildOne(subset, seq);

    // Sigurnosno smanjivanje ako je i dalje preveliko (npr. dugi nazivi).
    while (utf8ByteLength(built.content) > maxBytes && subset.length > 1) {
      subset = subset.slice(0, Math.ceil(subset.length / 2));
      built = buildOne(subset, seq);
    }

    files.push(built);
    index += subset.length;
    seq += 1;
  }

  return files;
}
