/**
 * Tipovi za mjesečnu PDV prijavu (PDV-SD / PDV prijava) agregiranu iz e-KIF/e-KUF.
 *
 * Napomena: tačan raspored polja službenog obrasca PDV prijave UIO nije fiksiran
 * u kodu dok se ne potvrdi službena e-shema. Polja su označena opisno + okvirnom
 * referencom na uobičajene rubrike PDV prijave (11/12/13/21/41/42/51/60/70/80).
 */

import type { TaxPeriod } from "../period";

export interface PdvReturn {
  period: TaxPeriod;

  // ── Isporuke (izlazna strana) ──
  /** Osnovica oporezivih isporuka po stopi 17% (rubrika 11). */
  taxableSuppliesBase: number;
  /** Izlazni PDV (rubrika 21). */
  outputVat: number;
  /** Oslobođene isporuke s pravom na odbitak — izvoz (rubrika 12). */
  exportSupplies: number;
  /** Oslobođene isporuke bez prava na odbitak (rubrika 13). */
  exemptSupplies: number;
  /** Vlastita / vanposlovna potrošnja (informativno). */
  internalSupplies: number;
  /** Ukupna vrijednost isporuka. */
  totalSupplies: number;

  // ── Nabavke (ulazna strana) ──
  /** Osnovica oporezivih nabavki iz zemlje (rubrika 41). */
  domesticPurchasesBase: number;
  /** Osnovica uvoza — JCI (rubrika 42). */
  importBase: number;
  /** Ukupan ulazni PDV po fakturama i JCI (rubrika 51). */
  inputVatTotal: number;
  /** Odbitni ulazni PDV (rubrika 60). */
  deductibleVat: number;
  /** Neodbitni ulazni PDV (informativno). */
  nonDeductibleVat: number;
  /** Paušalna naknada poljoprivredniku. */
  flatFee: number;

  // ── Rezultat ──
  /** PDV obaveza za uplatu (rubrika 70) — kad je izlazni > odbitni. */
  vatLiability: number;
  /** PDV za povrat (rubrika 80) — kad je odbitni > izlazni. */
  vatCredit: number;

  // ── Brojači (za kontrolu) ──
  kifCount: number;
  kufCount: number;
}

export interface PdvReturnOrgInfo {
  name: string;
  vatNumber: string;
  address: string | null;
  jib: string | null;
}
