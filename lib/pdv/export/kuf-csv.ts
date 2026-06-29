/**
 * Generator e-KUF (nabavke) CSV datoteke — Tabela 1 Tehničkog uputstva UIO.
 *
 * Struktura: slog zaglavlja (1) + slogovi nabavki (2) + prateći slog (3).
 */

import { FILE_TYPE_KUF } from "../constants";
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

export interface CsvBuildResult {
  filename: string;
  content: string;
  rowCount: number;
}

export function buildKufCsv(input: {
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
    FILE_TYPE_KUF,
    String(fileSeq).padStart(2, "0"),
    date,
    time,
  ];
  assertNoSeparator(header);

  // ── Slogovi nabavki (20 polja) ──
  const sorted = [...entries].sort((a, b) => a.serial_number - b.serial_number);

  let sum12 = 0; // bez PDV
  let sum13 = 0; // sa PDV
  let sum14 = 0; // paušal
  let sum15 = 0; // ulazni PDV
  let sum16 = 0; // odbitni
  let sum17 = 0; // neodbitni
  let sum18 = 0; // polje 32
  let sum19 = 0; // polje 33
  let sum20 = 0; // polje 34

  const itemRows: string[] = sorted.map((e) => {
    const ids = resolvePartnerIds({
      kind: e.partner_kind,
      vatId: e.partner_vat_id,
      jib: e.partner_jib,
    });

    sum12 += e.kuf_amount_without_vat;
    sum13 += e.kuf_amount_with_vat;
    sum14 += e.kuf_flat_fee;
    sum15 += e.kuf_vat_input_total;
    sum16 += e.kuf_vat_deductible;
    sum17 += e.kuf_vat_non_deductible;
    sum18 += e.field_32;
    sum19 += e.field_33;
    sum20 += e.field_34;

    const fields = [
      "2",
      yymm,
      String(e.serial_number),
      e.uio_document_type,
      sanitizeText(e.document_number, 100),
      e.document_date,
      e.receipt_date ?? e.document_date,
      sanitizeText(e.partner_name, 100),
      sanitizeText(e.partner_address, 100),
      ids.vatId,
      ids.jib,
      formatAmountCsv(e.kuf_amount_without_vat),
      formatAmountCsv(e.kuf_amount_with_vat),
      formatAmountCsv(e.kuf_flat_fee),
      formatAmountCsv(e.kuf_vat_input_total),
      formatAmountCsv(e.kuf_vat_deductible),
      formatAmountCsv(e.kuf_vat_non_deductible),
      formatAmountCsv(e.field_32),
      formatAmountCsv(e.field_33),
      formatAmountCsv(e.field_34),
    ];
    assertNoSeparator(fields);
    return csvRow(fields);
  });

  // ── Prateći slog (11 polja): sume kol. 12–20 + broj redova ──
  const trailer = [
    "3",
    formatAmountStrict(round2(sum12)),
    formatAmountStrict(round2(sum13)),
    formatAmountStrict(round2(sum14)),
    formatAmountStrict(round2(sum15)),
    formatAmountStrict(round2(sum16)),
    formatAmountStrict(round2(sum17)),
    formatAmountStrict(round2(sum18)),
    formatAmountStrict(round2(sum19)),
    formatAmountStrict(round2(sum20)),
    String(sorted.length),
  ];
  assertNoSeparator(trailer);

  const content = csvDocument([csvRow(header), ...itemRows, csvRow(trailer)]);

  return {
    filename: buildFileName({
      vatNumber: org.vatNumber,
      yymm,
      recordType: "kuf",
      fileSeq,
    }),
    content,
    rowCount: sorted.length,
  };
}
