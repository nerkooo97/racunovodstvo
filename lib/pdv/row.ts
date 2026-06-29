/**
 * Konverzija DB reda (numeric polja mogu doći kao string) → LedgerEntry.
 */

import type { PartnerKind, RecordType } from "./constants";
import type { LedgerEntry } from "./types";

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function toLedgerEntry(row: Record<string, unknown>): LedgerEntry {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    record_type: row.record_type as RecordType,
    period_year: num(row.period_year),
    period_month: num(row.period_month),
    serial_number: num(row.serial_number),

    uio_document_type: String(row.uio_document_type ?? "01"),
    document_number: String(row.document_number ?? ""),
    document_date: String(row.document_date ?? ""),
    receipt_date: (row.receipt_date as string) ?? null,

    partner_id: (row.partner_id as string) ?? null,
    partner_name: String(row.partner_name ?? ""),
    partner_address: (row.partner_address as string) ?? null,
    partner_vat_id: (row.partner_vat_id as string) ?? null,
    partner_jib: (row.partner_jib as string) ?? null,
    partner_kind: (row.partner_kind as PartnerKind) ?? "domestic_vat",

    kif_amount_total: num(row.kif_amount_total),
    kif_amount_internal: num(row.kif_amount_internal),
    kif_amount_export: num(row.kif_amount_export),
    kif_amount_exempt: num(row.kif_amount_exempt),
    kif_base_registered: num(row.kif_base_registered),
    kif_vat_registered: num(row.kif_vat_registered),
    kif_base_unregistered: num(row.kif_base_unregistered),
    kif_vat_unregistered: num(row.kif_vat_unregistered),

    kuf_amount_without_vat: num(row.kuf_amount_without_vat),
    kuf_amount_with_vat: num(row.kuf_amount_with_vat),
    kuf_flat_fee: num(row.kuf_flat_fee),
    kuf_vat_input_total: num(row.kuf_vat_input_total),
    kuf_vat_deductible: num(row.kuf_vat_deductible),
    kuf_vat_non_deductible: num(row.kuf_vat_non_deductible),

    field_32: num(row.field_32),
    field_33: num(row.field_33),
    field_34: num(row.field_34),

    is_deductible: Boolean(row.is_deductible ?? true),
    deductible_percent: num(row.deductible_percent),

    source_type: String(row.source_type ?? "manual"),
    source_id: (row.source_id as string) ?? null,
    related_entry_id: (row.related_entry_id as string) ?? null,
    status: (row.status as LedgerEntry["status"]) ?? "posted",
    notes: (row.notes as string) ?? null,
  };
}
