/**
 * Naziv e-evidencije po UIO:  {PDV12}_{YYMM}_{tip}_{ZZ}.csv
 * tip: 1 = nabavke (KUF), 2 = isporuke (KIF); ZZ = redni broj datoteke (vodeća nula).
 *
 * Primjeri iz uputstva:
 *   123456789101_2001_1_01.csv  (KUF, januar 2020)
 *   123456789102_2101_2_01.csv  (KIF, januar 2021)
 */

import { FILE_TYPE_KIF, FILE_TYPE_KUF, type RecordType } from "../constants";

export function buildFileName(input: {
  vatNumber: string; // 12 cifara
  yymm: string; // 4 znaka
  recordType: RecordType;
  fileSeq: number; // 1..n
}): string {
  const tip = input.recordType === "kif" ? FILE_TYPE_KIF : FILE_TYPE_KUF;
  const zz = String(input.fileSeq).padStart(2, "0");
  return `${input.vatNumber}_${input.yymm}_${tip}_${zz}.csv`;
}
