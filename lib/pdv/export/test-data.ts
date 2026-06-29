/**
 * Reprezentativni uzorci stavki za testni import na UIO e-Porezi portalu.
 * Pokrivaju glavne scenarije: domaći B2B/B2C, izvoz, uvoz (JCI) i neodbitni PDV.
 *
 * Koriste fiktivni PDV broj obveznika; služe isključivo za provjeru formata CSV-a.
 */

import type { LedgerEntry } from "../types";

export const SAMPLE_VAT_NUMBER = "200000000009";

function baseEntry(record: "kif" | "kuf", serial: number): LedgerEntry {
  return {
    id: `sample-${record}-${serial}`,
    organization_id: "sample",
    record_type: record,
    period_year: 2025,
    period_month: 6,
    serial_number: serial,
    uio_document_type: "01",
    document_number: `${record.toUpperCase()}-${serial}`,
    document_date: "2025-06-15",
    receipt_date: record === "kuf" ? "2025-06-16" : null,
    partner_id: null,
    partner_name: "Test partner d.o.o.",
    partner_address: "Sarajevo, Zmaja od Bosne bb",
    partner_vat_id: "200000000010",
    partner_jib: "4200000000010",
    partner_kind: "domestic_vat",
    kif_amount_total: 0,
    kif_amount_internal: 0,
    kif_amount_export: 0,
    kif_amount_exempt: 0,
    kif_base_registered: 0,
    kif_vat_registered: 0,
    kif_base_unregistered: 0,
    kif_vat_unregistered: 0,
    kuf_amount_without_vat: 0,
    kuf_amount_with_vat: 0,
    kuf_flat_fee: 0,
    kuf_vat_input_total: 0,
    kuf_vat_deductible: 0,
    kuf_vat_non_deductible: 0,
    field_32: 0,
    field_33: 0,
    field_34: 0,
    is_deductible: true,
    deductible_percent: 100,
    source_type: "manual",
    source_id: null,
    related_entry_id: null,
    status: "posted",
    notes: null,
  };
}

/** Uzorak e-KIF: domaći B2B, domaći B2C, izvoz (JCI). */
export function sampleKifEntries(): LedgerEntry[] {
  const b2b = baseEntry("kif", 1);
  b2b.kif_amount_total = 1170;
  b2b.kif_base_registered = 1000;
  b2b.kif_vat_registered = 170;

  const b2c = baseEntry("kif", 2);
  b2c.partner_name = "Maloprodaja (zbirno)";
  b2c.partner_kind = "individual";
  b2c.partner_vat_id = null;
  b2c.partner_jib = null;
  b2c.partner_address = null;
  b2c.kif_amount_total = 585;
  b2c.kif_base_unregistered = 500;
  b2c.kif_vat_unregistered = 85;

  const exp = baseEntry("kif", 3);
  exp.uio_document_type = "04";
  exp.document_number = "C-1234/25";
  exp.partner_name = "Foreign Buyer Ltd";
  exp.partner_kind = "foreign";
  exp.partner_vat_id = null;
  exp.partner_jib = null;
  exp.kif_amount_total = 2000;
  exp.kif_amount_export = 2000;

  return [b2b, b2c, exp];
}

/** Uzorak e-KUF: domaća nabavka, uvoz (JCI), neodbitni PDV (reprezentacija). */
export function sampleKufEntries(): LedgerEntry[] {
  const dom = baseEntry("kuf", 1);
  dom.kuf_amount_without_vat = 800;
  dom.kuf_amount_with_vat = 936;
  dom.kuf_vat_input_total = 136;
  dom.kuf_vat_deductible = 136;

  const imp = baseEntry("kuf", 2);
  imp.uio_document_type = "04";
  imp.document_number = "I-5678/25";
  imp.partner_name = "UIO (carina)";
  imp.partner_kind = "import_customs";
  imp.partner_vat_id = null;
  imp.partner_jib = null;
  imp.kuf_amount_without_vat = 1500;
  imp.kuf_amount_with_vat = 1755;
  imp.kuf_vat_input_total = 255;
  imp.kuf_vat_deductible = 255;

  const nd = baseEntry("kuf", 3);
  nd.partner_name = "Restoran d.o.o.";
  nd.kuf_amount_without_vat = 200;
  nd.kuf_amount_with_vat = 234;
  nd.kuf_vat_input_total = 34;
  nd.kuf_vat_deductible = 0;
  nd.kuf_vat_non_deductible = 34;
  nd.is_deductible = false;
  nd.deductible_percent = 0;
  nd.field_32 = 34;

  return [dom, imp, nd];
}
