/**
 * Agregacija PDV prijave iz stavki knjiga e-KIF (isporuke) i e-KUF (nabavke).
 *
 * Sve sume se zaokružuju na 2 decimale tek na kraju (izbjegavanje binarnih grešaka).
 */

import { round2 } from "../amounts";
import type { LedgerEntry } from "../types";
import type { TaxPeriod } from "../period";
import type { PdvReturn } from "./types";

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
}

/**
 * Računa PDV prijavu iz svih KIF i KUF stavki jednog poreznog perioda.
 * Stavke moraju pripadati istom periodu (year/month) — poziva se nakon filtriranja.
 */
export function aggregatePdvReturn(input: {
  period: TaxPeriod;
  kif: LedgerEntry[];
  kuf: LedgerEntry[];
}): PdvReturn {
  const { period, kif, kuf } = input;

  // ── Isporuke ──
  const taxableSuppliesBase = sum(
    kif.map((e) => e.kif_base_registered + e.kif_base_unregistered)
  );
  const outputVat = sum(
    kif.map((e) => e.kif_vat_registered + e.kif_vat_unregistered)
  );
  const exportSupplies = sum(kif.map((e) => e.kif_amount_export));
  const exemptSupplies = sum(kif.map((e) => e.kif_amount_exempt));
  const internalSupplies = sum(kif.map((e) => e.kif_amount_internal));
  const totalSupplies = sum(kif.map((e) => e.kif_amount_total));

  // ── Nabavke ──
  const importEntries = kuf.filter((e) => e.uio_document_type === "04");
  const domesticEntries = kuf.filter((e) => e.uio_document_type !== "04");

  const domesticPurchasesBase = sum(
    domesticEntries.map((e) => e.kuf_amount_without_vat)
  );
  const importBase = sum(importEntries.map((e) => e.kuf_amount_without_vat));
  const inputVatTotal = sum(kuf.map((e) => e.kuf_vat_input_total));
  const deductibleVat = sum(kuf.map((e) => e.kuf_vat_deductible));
  const nonDeductibleVat = sum(kuf.map((e) => e.kuf_vat_non_deductible));
  const flatFee = sum(kuf.map((e) => e.kuf_flat_fee));

  // ── Rezultat ──
  const net = round2(outputVat) - round2(deductibleVat);
  const vatLiability = net > 0 ? net : 0;
  const vatCredit = net < 0 ? -net : 0;

  return {
    period,
    taxableSuppliesBase: round2(taxableSuppliesBase),
    outputVat: round2(outputVat),
    exportSupplies: round2(exportSupplies),
    exemptSupplies: round2(exemptSupplies),
    internalSupplies: round2(internalSupplies),
    totalSupplies: round2(totalSupplies),
    domesticPurchasesBase: round2(domesticPurchasesBase),
    importBase: round2(importBase),
    inputVatTotal: round2(inputVatTotal),
    deductibleVat: round2(deductibleVat),
    nonDeductibleVat: round2(nonDeductibleVat),
    flatFee: round2(flatFee),
    vatLiability: round2(vatLiability),
    vatCredit: round2(vatCredit),
    kifCount: kif.length,
    kufCount: kuf.length,
  };
}
