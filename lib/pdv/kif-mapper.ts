/**
 * Mapiranje izlazne fakture na KIF finansijska polja i tip dokumenta UIO.
 *
 * KIF je jedan slog po dokumentu (fakturi), ali se finansijska polja računaju
 * razlaganjem po stavkama: oporezivi dio (17%) ide u osnovicu/PDV (prema tome
 * je li kupac obveznik), a nulta stopa ide u izvoz / oslobođeno / internu
 * potrošnju prema kategoriji. Time se ispravno obrađuju miješane fakture.
 */

import { round2 } from "./amounts";
import type { SaleCategory } from "./constants";
import { VAT_RATE } from "./constants";

export interface KifAmounts {
  uio_document_type: string;
  kif_amount_total: number;
  kif_amount_internal: number;
  kif_amount_export: number;
  kif_amount_exempt: number;
  kif_base_registered: number;
  kif_vat_registered: number;
  kif_base_unregistered: number;
  kif_vat_unregistered: number;
  field_32: number;
  field_33: number;
  field_34: number;
}

/** Jedna stavka fakture za razlaganje (osnovica + PDV po stopi i kategoriji). */
export interface KifItemInput {
  base: number; // osnovica (subtotal stavke)
  vat: number; // PDV stavke
  rate: number; // stopa (0 ili 17)
  category: SaleCategory; // efektivna kategorija stavke
}

export interface InvoiceForKif {
  type: "invoice" | "proforma" | "credit_note" | "advance";
  /** Kategorija fakture (default ako stavke nemaju vlastitu). */
  sale_category: SaleCategory | null;
  /** Kupac je PDV obveznik (osnovica/PDV → "obveznik" kolone). */
  buyer_registered: boolean;
  charges_vat: boolean;
  items: KifItemInput[];
}

const ZERO: Omit<KifAmounts, "uio_document_type"> = {
  kif_amount_total: 0,
  kif_amount_internal: 0,
  kif_amount_export: 0,
  kif_amount_exempt: 0,
  kif_base_registered: 0,
  kif_vat_registered: 0,
  kif_base_unregistered: 0,
  kif_vat_unregistered: 0,
  field_32: 0,
  field_33: 0,
  field_34: 0,
};

/** Određuje UIO tip dokumenta za KIF iz fakture (na nivou dokumenta). */
export function kifDocumentType(
  type: InvoiceForKif["type"],
  category: SaleCategory | null
): string {
  if (type === "advance") return "03";
  switch (category) {
    case "internal_use":
      return "02";
    case "export_goods":
      return "04";
    case "export_services":
    case "exempt":
      return "05";
    default:
      return "01";
  }
}

/**
 * Računa KIF polja razlaganjem po stavkama. Za knjižnu obavijest (credit_note)
 * iznosi su negativni.
 */
export function mapInvoiceToKif(inv: InvoiceForKif): KifAmounts {
  const sign = inv.type === "credit_note" ? -1 : 1;
  const out: KifAmounts = {
    ...ZERO,
    uio_document_type: kifDocumentType(inv.type, inv.sale_category),
  };

  for (const item of inv.items) {
    const base = round2(item.base) * sign;
    const vat = round2(item.vat) * sign;
    const total = round2(item.base + item.vat) * sign;
    const category: SaleCategory = item.category;

    out.kif_amount_total += total;

    const isTaxed = item.rate >= VAT_RATE && vat !== 0;

    if (category === "internal_use") {
      // Vlastita potrošnja: obračunava se PDV kao prodaja sebi
      out.kif_amount_internal += total;
      out.kif_base_registered += base;
      out.kif_vat_registered += vat;
      continue;
    }

    if (isTaxed) {
      // Oporezivi dio (17%) → osnovica + PDV (obveznik / neobveznik)
      if (inv.buyer_registered) {
        out.kif_base_registered += base;
        out.kif_vat_registered += vat;
      } else {
        out.kif_base_unregistered += base;
        out.kif_vat_unregistered += vat;
      }
      continue;
    }

    // Nulta stopa / oslobođeno → razvrstaj po kategoriji
    switch (category) {
      case "export_goods":
        out.kif_amount_export += total;
        break;
      case "export_services":
      case "exempt":
        out.kif_amount_exempt += total;
        break;
      default:
        // Domaća nulta stopa = oslobođena isporuka
        out.kif_amount_exempt += total;
        break;
    }
  }

  return roundAll(out);
}

function roundAll(a: KifAmounts): KifAmounts {
  return {
    uio_document_type: a.uio_document_type,
    kif_amount_total: round2(a.kif_amount_total),
    kif_amount_internal: round2(a.kif_amount_internal),
    kif_amount_export: round2(a.kif_amount_export),
    kif_amount_exempt: round2(a.kif_amount_exempt),
    kif_base_registered: round2(a.kif_base_registered),
    kif_vat_registered: round2(a.kif_vat_registered),
    kif_base_unregistered: round2(a.kif_base_unregistered),
    kif_vat_unregistered: round2(a.kif_vat_unregistered),
    field_32: round2(a.field_32),
    field_33: round2(a.field_33),
    field_34: round2(a.field_34),
  };
}
