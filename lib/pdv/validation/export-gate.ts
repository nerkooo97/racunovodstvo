/**
 * Validaciona kapija prije generisanja e-KIF/e-KUF CSV-a.
 * Blokira export dok postoje greške; upozorenja ne blokiraju.
 */

import { isValidVatId, validatePartnerIds } from "../partner-ids";
import { round2 } from "../amounts";
import { CSV_SEPARATOR } from "../constants";
import type { LedgerEntry, OrgExportInfo } from "../types";
import { type TaxPeriod, periodLabel } from "../period";

export interface ValidationIssue {
  severity: "error" | "warning";
  serial?: number;
  field?: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean; // true ako nema grešaka (warnings dozvoljeni)
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

function hasSeparator(value: string | null | undefined): boolean {
  return !!value && value.includes(CSV_SEPARATOR);
}

export function validateForExport(input: {
  org: OrgExportInfo;
  period: TaxPeriod;
  recordType: "kif" | "kuf";
  entries: LedgerEntry[];
}): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const { org, entries, recordType } = input;

  // ── Obveznik ──
  if (!isValidVatId(org.vatNumber)) {
    errors.push({
      severity: "error",
      message:
        "PDV broj organizacije mora imati 12 cifara (Postavke → PDV broj).",
    });
  }

  // ── Redni brojevi: jedinstvenost ──
  const seen = new Set<number>();
  for (const e of entries) {
    if (seen.has(e.serial_number)) {
      errors.push({
        severity: "error",
        serial: e.serial_number,
        message: `Duplikat rednog broja ${e.serial_number} u knjizi.`,
      });
    }
    seen.add(e.serial_number);
  }

  for (const e of entries) {
    // Partner ID-evi
    const idErrors = validatePartnerIds({
      kind: e.partner_kind,
      vatId: e.partner_vat_id,
      jib: e.partner_jib,
      partnerName: e.partner_name,
    });
    for (const msg of idErrors) {
      errors.push({ severity: "error", serial: e.serial_number, message: msg });
    }

    // Separator u tekstu
    if (
      hasSeparator(e.partner_name) ||
      hasSeparator(e.partner_address) ||
      hasSeparator(e.document_number)
    ) {
      errors.push({
        severity: "error",
        serial: e.serial_number,
        message: `Polje sadrži zabranjeni znak '${CSV_SEPARATOR}'.`,
      });
    }

    // Broj i datum dokumenta
    if (!e.document_number?.trim()) {
      errors.push({
        severity: "error",
        serial: e.serial_number,
        field: "document_number",
        message: "Broj dokumenta je obavezan.",
      });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.document_date)) {
      errors.push({
        severity: "error",
        serial: e.serial_number,
        field: "document_date",
        message: "Datum dokumenta mora biti u formatu YYYY-MM-DD.",
      });
    }

    // KUF: datum prijema obavezan
    if (recordType === "kuf") {
      if (!e.receipt_date || !/^\d{4}-\d{2}-\d{2}$/.test(e.receipt_date)) {
        errors.push({
          severity: "error",
          serial: e.serial_number,
          field: "receipt_date",
          message: "Datum prijema (KUF) je obavezan.",
        });
      }

      // Konzistentnost srazmjernog odbitka
      const splitSum = round2(e.kuf_vat_deductible + e.kuf_vat_non_deductible);
      if (round2(e.kuf_vat_input_total) !== splitSum) {
        warnings.push({
          severity: "warning",
          serial: e.serial_number,
          message:
            "Odbitni + neodbitni PDV ne odgovara ukupnom ulaznom PDV-u.",
        });
      }
    }

    // JCI tipovi 04 — broj/datum JCI
    if (e.uio_document_type === "04" && !e.document_number?.trim()) {
      errors.push({
        severity: "error",
        serial: e.serial_number,
        message: "Za JCI (tip 04) obavezan je broj carinske deklaracije.",
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function summarizeValidation(
  result: ValidationResult,
  period: TaxPeriod
): string {
  if (result.ok && result.warnings.length === 0) {
    return `Sve provjere prošle za ${periodLabel(period)}.`;
  }
  const parts: string[] = [];
  if (result.errors.length) parts.push(`${result.errors.length} grešaka`);
  if (result.warnings.length) parts.push(`${result.warnings.length} upozorenja`);
  return parts.join(", ");
}
