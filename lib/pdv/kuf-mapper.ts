/**
 * Mapiranje ulaznog računa (purchase_invoices) na KUF finansijska polja.
 */

import { round2, splitDeductibleVat } from "./amounts";

export interface KufAmounts {
  kuf_amount_without_vat: number;
  kuf_amount_with_vat: number;
  kuf_flat_fee: number;
  kuf_vat_input_total: number;
  kuf_vat_deductible: number;
  kuf_vat_non_deductible: number;
  field_32: number;
  field_33: number;
  field_34: number;
}

export interface PurchaseForKuf {
  amount_without_vat: number;
  amount_with_vat: number;
  amount_flat_fee: number;
  vat_input_total: number;
  is_deductible: boolean;
  deductible_percent: number;
  supplier_is_vat_obligor: boolean;
}

/**
 * Računa KUF polja s primjenom prava na (srazmjerni) odbitak.
 *
 * - Neobveznik dobavljač: PDV = 0, sve u "bez PDV".
 * - Nije odbitno (reprezentacija, vozilo): cijeli PDV → neodbitni.
 * - Srazmjerni odbitak: odbitni = total × %, neodbitni = razlika.
 */
export function mapPurchaseToKuf(p: PurchaseForKuf): KufAmounts {
  const withoutVat = round2(p.amount_without_vat);
  const withVat = round2(p.amount_with_vat);
  const flatFee = round2(p.amount_flat_fee);

  // Neobveznik: nema PDV-a
  if (!p.supplier_is_vat_obligor) {
    return {
      kuf_amount_without_vat: withoutVat || withVat,
      kuf_amount_with_vat: withVat || withoutVat,
      kuf_flat_fee: flatFee,
      kuf_vat_input_total: 0,
      kuf_vat_deductible: 0,
      kuf_vat_non_deductible: 0,
      field_32: 0,
      field_33: 0,
      field_34: 0,
    };
  }

  const pct = p.is_deductible ? p.deductible_percent : 0;
  const { total, deductible, nonDeductible } = splitDeductibleVat(
    p.vat_input_total,
    pct
  );

  return {
    kuf_amount_without_vat: withoutVat,
    kuf_amount_with_vat: withVat,
    kuf_flat_fee: flatFee,
    kuf_vat_input_total: total,
    kuf_vat_deductible: deductible,
    kuf_vat_non_deductible: nonDeductible,
    // Mapiranje neodbitnog na polje 32 PDV prijave (default).
    // Polja 33/34 se koriste za posebne slučajeve (faza F).
    field_32: nonDeductible,
    field_33: 0,
    field_34: 0,
  };
}
