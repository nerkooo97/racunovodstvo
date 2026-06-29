/**
 * Generator e-KIF (isporuke) CSV datoteke — Tabela 2 Tehničkog uputstva UIO.
 *
 * Struktura: slog zaglavlja (1) + slogovi isporuka (2) + prateći slog (3).
 * KIF stavka ima 21 polje (bez „datuma prijema" koji postoji samo u KUF-u).
 */

import { FILE_TYPE_KIF } from "../constants";
import { toYYMM, type TaxPeriod } from "../period";
import { resolvePartnerIds } from "../partner-ids";
import { formatAmountCsv, formatAmountStrict, round2 } from "../amounts";
import type { LedgerEntry, OrgExportInfo } from "../types";
import {
  assertNoSeparator,
  csvDocument,
  csvRow,
  headerDateTime,
  sanitizeText,
} from "./csv-format";
import { buildFileName } from "./filename";
import type { CsvBuildResult } from "./kuf-csv";

export function buildKifCsv(input: {
  org: OrgExportInfo;
  period: TaxPeriod;
  entries: LedgerEntry[];
  fileSeq?: number;
  now?: Date;
}): CsvBuildResult {
  const { org, period, entries } = input;
  const fileSeq = input.fileSeq ?? 1;
  const yymm = toYYMM(period);
  const { date, time } = headerDateTime(input.now);

  // ── Slog zaglavlja (7 polja) ──
  const header = [
    "1",
    org.vatNumber,
    yymm,
    FILE_TYPE_KIF,
    String(fileSeq).padStart(2, "0"),
    date,
    time,
  ];
  assertNoSeparator(header);

  const sorted = [...entries].sort((a, b) => a.serial_number - b.serial_number);

  // Sume kolona 11–21
  let s11 = 0, s12 = 0, s13 = 0, s14 = 0, s15 = 0, s16 = 0, s17 = 0, s18 = 0;
  let s19 = 0, s20 = 0, s21 = 0;

  const itemRows: string[] = sorted.map((e) => {
    const ids = resolvePartnerIds({
      kind: e.partner_kind,
      vatId: e.partner_vat_id,
      jib: e.partner_jib,
    });

    s11 += e.kif_amount_total;
    s12 += e.kif_amount_internal;
    s13 += e.kif_amount_export;
    s14 += e.kif_amount_exempt;
    s15 += e.kif_base_registered;
    s16 += e.kif_vat_registered;
    s17 += e.kif_base_unregistered;
    s18 += e.kif_vat_unregistered;
    s19 += e.field_32;
    s20 += e.field_33;
    s21 += e.field_34;

    const fields = [
      "2",
      yymm,
      String(e.serial_number),
      e.uio_document_type,
      sanitizeText(e.document_number, 100),
      e.document_date,
      sanitizeText(e.partner_name, 100),
      sanitizeText(e.partner_address, 100),
      ids.vatId,
      ids.jib,
      formatAmountCsv(e.kif_amount_total),
      formatAmountCsv(e.kif_amount_internal),
      formatAmountCsv(e.kif_amount_export),
      formatAmountCsv(e.kif_amount_exempt),
      formatAmountCsv(e.kif_base_registered),
      formatAmountCsv(e.kif_vat_registered),
      formatAmountCsv(e.kif_base_unregistered),
      formatAmountCsv(e.kif_vat_unregistered),
      formatAmountCsv(e.field_32),
      formatAmountCsv(e.field_33),
      formatAmountCsv(e.field_34),
    ];
    assertNoSeparator(fields);
    return csvRow(fields);
  });

  // ── Prateći slog (13 polja): sume kol. 11–21 + broj redova ──
  const trailer = [
    "3",
    formatAmountStrict(round2(s11)),
    formatAmountStrict(round2(s12)),
    formatAmountStrict(round2(s13)),
    formatAmountStrict(round2(s14)),
    formatAmountStrict(round2(s15)),
    formatAmountStrict(round2(s16)),
    formatAmountStrict(round2(s17)),
    formatAmountStrict(round2(s18)),
    formatAmountStrict(round2(s19)),
    formatAmountStrict(round2(s20)),
    formatAmountStrict(round2(s21)),
    String(sorted.length),
  ];
  assertNoSeparator(trailer);

  const content = csvDocument([csvRow(header), ...itemRows, csvRow(trailer)]);

  return {
    filename: buildFileName({
      vatNumber: org.vatNumber,
      yymm,
      recordType: "kif",
      fileSeq,
    }),
    content,
    rowCount: sorted.length,
  };
}
