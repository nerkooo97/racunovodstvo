/**
 * Pravila automatskog knjiženja: pretvaraju izvore (KIF/KUF stavke, plate) u
 * stavke naloga (duguje/potražuje) prema standardnom kontnom planu.
 *
 * Sve vrijednosti se normaliziraju: negativan iznos (npr. knjižno odobrenje)
 * prebacuje se na suprotnu stranu sa apsolutnom vrijednošću.
 */

import { round2 } from "@/lib/pdv/amounts";
import type { LedgerEntry } from "@/lib/pdv/types";
import { POSTING_ACCOUNTS } from "./standard-chart";
import type { JournalLineInput } from "./types";

/** Akumulator stavki naloga po kontu, s ispravnom obradom predznaka. */
class LineBuilder {
  private map = new Map<string, { debit: number; credit: number }>();

  /** Doda iznos na prirodnu stranu; negativan iznos ide na suprotnu. */
  add(account: string, amount: number, side: "debit" | "credit") {
    const v = round2(amount);
    if (v === 0) return;
    const cur = this.map.get(account) ?? { debit: 0, credit: 0 };
    const effSide = v >= 0 ? side : side === "debit" ? "credit" : "debit";
    cur[effSide] += Math.abs(v);
    this.map.set(account, cur);
  }

  build(): JournalLineInput[] {
    const lines: JournalLineInput[] = [];
    let i = 0;
    for (const [account_code, v] of this.map) {
      lines.push({
        account_code,
        debit: round2(v.debit),
        credit: round2(v.credit),
        sort_order: i++,
      });
    }
    return lines;
  }
}

/** KIF (isporuke) → nalog. Debit kupci/banka, kredit prihodi + izlazni PDV. */
export function kifEntryToLines(e: LedgerEntry): JournalLineInput[] {
  const b = new LineBuilder();

  const vat = e.kif_vat_registered + e.kif_vat_unregistered;
  const domesticBase = e.kif_base_registered + e.kif_base_unregistered;
  const exportAmt = e.kif_amount_export;
  const exemptAmt = e.kif_amount_exempt;
  const total = e.kif_amount_total;

  // Potraživanje od kupca (ili gotovina za maloprodaju)
  const customerAcc =
    e.partner_kind === "foreign" || e.partner_kind === "import_customs"
      ? POSTING_ACCOUNTS.customersForeign
      : e.source_type === "retail"
        ? POSTING_ACCOUNTS.cash
        : POSTING_ACCOUNTS.customersDomestic;

  b.add(customerAcc, total, "debit");

  // Prihodi (kredit)
  b.add(POSTING_ACCOUNTS.salesRevenue, domesticBase, "credit");
  b.add(POSTING_ACCOUNTS.exportRevenue, exportAmt, "credit");
  b.add(POSTING_ACCOUNTS.otherRevenue, exemptAmt, "credit");

  // Izlazni PDV (kredit — obaveza)
  b.add(POSTING_ACCOUNTS.outputVat, vat, "credit");

  return b.build();
}

/** KUF (nabavke) → nalog. Debit troškovi + pretporez, kredit dobavljači. */
export function kufEntryToLines(e: LedgerEntry): JournalLineInput[] {
  const b = new LineBuilder();

  const base = e.kuf_amount_without_vat;
  const flat = e.kuf_flat_fee;
  const deductible = e.kuf_vat_deductible;
  const nonDeductible = e.kuf_vat_non_deductible;

  const expenseAcc =
    e.uio_document_type === "05"
      ? POSTING_ACCOUNTS.servicesExpense
      : POSTING_ACCOUNTS.goodsExpense;

  // Trošak (osnovica + paušal)
  b.add(expenseAcc, base + flat, "debit");
  // Pretporez (odbitni)
  b.add(POSTING_ACCOUNTS.inputVat, deductible, "debit");
  // Neodbitni PDV → trošak
  b.add(POSTING_ACCOUNTS.nonMaterialExpense, nonDeductible, "debit");

  // Obaveza prema dobavljaču (ili carini)
  const supplierAcc =
    e.partner_kind === "foreign" || e.partner_kind === "import_customs"
      ? POSTING_ACCOUNTS.suppliersForeign
      : POSTING_ACCOUNTS.suppliersDomestic;

  b.add(supplierAcc, base + flat + deductible + nonDeductible, "credit");

  return b.build();
}

export interface BankTxForPosting {
  direction: "credit" | "debit";
  amount: number;
  /** Da li je transakcija sparena s partnerom (kupcem/dobavljačem). */
  has_partner: boolean;
}

/**
 * Bankovna transakcija → nalog.
 *
 * Priliv (credit): duguje banka / potražuje kupci (naplata potraživanja).
 * Odliv (debit):   duguje dobavljači / potražuje banka (plaćanje obaveza).
 *
 * Kad transakcija nije sparena s partnerom, protustavka ide na prelazni konto
 * (2490) koji se naknadno razknjižava. Ovako se bankovni saldo uvijek slaže,
 * a nerazvrstane stavke ostaju vidljive na prelaznom kontu.
 */
export function bankTxToLines(tx: BankTxForPosting): JournalLineInput[] {
  const b = new LineBuilder();
  const amount = Math.abs(round2(tx.amount));
  if (amount === 0) return [];

  if (tx.direction === "credit") {
    b.add(POSTING_ACCOUNTS.bank, amount, "debit");
    b.add(
      tx.has_partner
        ? POSTING_ACCOUNTS.customersDomestic
        : POSTING_ACCOUNTS.bankClearing,
      amount,
      "credit"
    );
  } else {
    b.add(
      tx.has_partner
        ? POSTING_ACCOUNTS.suppliersDomestic
        : POSTING_ACCOUNTS.bankClearing,
      amount,
      "debit"
    );
    b.add(POSTING_ACCOUNTS.bank, amount, "credit");
  }

  return b.build();
}

export interface SalaryForPosting {
  gross_salary: number;
  net_salary: number;
  income_tax: number;
  contributions_from: number; // doprinosi iz plate (na teret radnika)
  contributions_on: number; // doprinosi na platu (na teret poslodavca)
}

/** Obračun plate → nalog. */
export function salaryToLines(s: SalaryForPosting): JournalLineInput[] {
  const b = new LineBuilder();

  // Trošak bruto plate
  b.add(POSTING_ACCOUNTS.grossSalaryExpense, s.gross_salary, "debit");
  // Trošak doprinosa na teret poslodavca
  b.add(POSTING_ACCOUNTS.employerContribExpense, s.contributions_on, "debit");

  // Obaveze
  b.add(POSTING_ACCOUNTS.netSalaryPayable, s.net_salary, "credit");
  b.add(POSTING_ACCOUNTS.taxPayable, s.income_tax, "credit");
  b.add(
    POSTING_ACCOUNTS.contributionsPayable,
    s.contributions_from + s.contributions_on,
    "credit"
  );

  return b.build();
}
