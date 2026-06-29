import type {
  PartnerKind,
  RecordType,
  SaleCategory,
  UioDocumentType,
} from "./constants";

/** Jedan red u knjizi (KIF ili KUF) — odraz reda u pdv_ledger_entries. */
export interface LedgerEntry {
  id: string;
  organization_id: string;
  record_type: RecordType;
  period_year: number;
  period_month: number;
  serial_number: number;

  uio_document_type: UioDocumentType;
  document_number: string;
  document_date: string;
  receipt_date: string | null;

  partner_id: string | null;
  partner_name: string;
  partner_address: string | null;
  partner_vat_id: string | null;
  partner_jib: string | null;
  partner_kind: PartnerKind;

  // KIF
  kif_amount_total: number;
  kif_amount_internal: number;
  kif_amount_export: number;
  kif_amount_exempt: number;
  kif_base_registered: number;
  kif_vat_registered: number;
  kif_base_unregistered: number;
  kif_vat_unregistered: number;

  // KUF
  kuf_amount_without_vat: number;
  kuf_amount_with_vat: number;
  kuf_flat_fee: number;
  kuf_vat_input_total: number;
  kuf_vat_deductible: number;
  kuf_vat_non_deductible: number;

  // Polja PDV prijave
  field_32: number;
  field_33: number;
  field_34: number;

  is_deductible: boolean;
  deductible_percent: number;

  source_type: string;
  source_id: string | null;
  related_entry_id: string | null;
  status: "draft" | "posted" | "locked";
  notes: string | null;
}

export interface PdvPeriod {
  id: string;
  organization_id: string;
  year: number;
  month: number;
  status: "open" | "locked" | "submitted";
  locked_at: string | null;
  submitted_at: string | null;
  kif_file_seq: number;
  kuf_file_seq: number;
  kif_exported_at: string | null;
  kuf_exported_at: string | null;
}

export interface OrgExportInfo {
  vatNumber: string; // 12-cifreni PDV broj obveznika
  name: string;
}

export type SaleCategoryInput = SaleCategory;
