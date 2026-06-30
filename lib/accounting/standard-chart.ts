/**
 * Standardni kontni okvir (FBiH) — pojednostavljen, uređiv šablon.
 *
 * Klase: 0 stalna sredstva · 1 zalihe · 2 novčana sredstva i potraživanja ·
 * 3 kapital · 4 obaveze · 5 rashodi · 6 prihodi · 7 zaključak · 8 vanbilansno.
 *
 * Šifre su konvencionalne i mogu se prilagoditi u modulu Kontni plan.
 */

import type { AccountType } from "./types";

export interface StandardAccount {
  code: string;
  name: string;
  account_class: number;
  account_type: AccountType;
  parent_code?: string;
  is_synthetic?: boolean;
}

export const STANDARD_CHART: StandardAccount[] = [
  // ── Klasa 0 — Stalna sredstva ──
  { code: "0", name: "Stalna sredstva i dugoročni plasmani", account_class: 0, account_type: "asset", is_synthetic: true },
  { code: "0200", name: "Postrojenja i oprema", account_class: 0, account_type: "asset", parent_code: "0" },
  { code: "0290", name: "Ispravka vrijednosti opreme", account_class: 0, account_type: "asset", parent_code: "0" },

  // ── Klasa 1 — Zalihe ──
  { code: "1", name: "Zalihe", account_class: 1, account_type: "asset", is_synthetic: true },
  { code: "1000", name: "Zalihe materijala", account_class: 1, account_type: "asset", parent_code: "1" },
  { code: "1300", name: "Zalihe robe", account_class: 1, account_type: "asset", parent_code: "1" },

  // ── Klasa 2 — Novčana sredstva, potraživanja ──
  { code: "2", name: "Novčana sredstva i potraživanja", account_class: 2, account_type: "asset", is_synthetic: true },
  { code: "2000", name: "Kupci u zemlji", account_class: 2, account_type: "asset", parent_code: "2" },
  { code: "2010", name: "Kupci u inostranstvu", account_class: 2, account_type: "asset", parent_code: "2" },
  { code: "2400", name: "Transakcijski (tekući) račun", account_class: 2, account_type: "asset", parent_code: "2" },
  { code: "2410", name: "Devizni račun", account_class: 2, account_type: "asset", parent_code: "2" },
  { code: "2490", name: "Novčana sredstva u prenosu (prelazni konto)", account_class: 2, account_type: "asset", parent_code: "2" },
  { code: "2100", name: "Blagajna", account_class: 2, account_type: "asset", parent_code: "2" },
  { code: "2700", name: "Potraživanja za pretporez (ulazni PDV)", account_class: 2, account_type: "asset", parent_code: "2" },

  // ── Klasa 3 — Kapital ──
  { code: "3", name: "Kapital", account_class: 3, account_type: "equity", is_synthetic: true },
  { code: "3000", name: "Osnovni (upisani) kapital", account_class: 3, account_type: "equity", parent_code: "3" },
  { code: "3400", name: "Neraspoređena dobit ranijih perioda", account_class: 3, account_type: "equity", parent_code: "3" },
  { code: "3410", name: "Neraspoređena dobit izvještajnog perioda", account_class: 3, account_type: "equity", parent_code: "3" },
  { code: "3500", name: "Akumulirani gubici ranijih perioda", account_class: 3, account_type: "equity", parent_code: "3" },
  { code: "3510", name: "Gubitak izvještajnog perioda", account_class: 3, account_type: "equity", parent_code: "3" },

  // ── Klasa 4 — Obaveze ──
  { code: "4", name: "Obaveze", account_class: 4, account_type: "liability", is_synthetic: true },
  { code: "4320", name: "Dobavljači u zemlji", account_class: 4, account_type: "liability", parent_code: "4" },
  { code: "4330", name: "Dobavljači u inostranstvu", account_class: 4, account_type: "liability", parent_code: "4" },
  { code: "4500", name: "Obaveze za neto plate", account_class: 4, account_type: "liability", parent_code: "4" },
  { code: "4700", name: "Obaveze za PDV (izlazni)", account_class: 4, account_type: "liability", parent_code: "4" },
  { code: "4800", name: "Obaveze za porez na dohodak (radnici)", account_class: 4, account_type: "liability", parent_code: "4" },
  { code: "4810", name: "Obaveze za doprinose", account_class: 4, account_type: "liability", parent_code: "4" },
  { code: "4820", name: "Obaveze za porez na dobit preduzeća", account_class: 4, account_type: "liability", parent_code: "4" },
  { code: "2340", name: "Akontacije poreza na dobit", account_class: 2, account_type: "asset", parent_code: "2" },

  // ── Klasa 5 — Rashodi ──
  { code: "5", name: "Rashodi", account_class: 5, account_type: "expense", is_synthetic: true },
  { code: "5000", name: "Nabavna vrijednost / troškovi materijala i robe", account_class: 5, account_type: "expense", parent_code: "5" },
  { code: "5300", name: "Troškovi usluga", account_class: 5, account_type: "expense", parent_code: "5" },
  { code: "5200", name: "Troškovi bruto plata", account_class: 5, account_type: "expense", parent_code: "5" },
  { code: "5210", name: "Troškovi doprinosa na plate (na teret poslodavca)", account_class: 5, account_type: "expense", parent_code: "5" },
  { code: "5400", name: "Amortizacija (u visini porezno priznatih rashoda)", account_class: 5, account_type: "expense", parent_code: "5" },
  { code: "5410", name: "Amortizacija iznad porezno priznatih rashoda", account_class: 5, account_type: "expense", parent_code: "5" },
  { code: "5500", name: "Nematerijalni troškovi (neodbitni PDV i ostalo)", account_class: 5, account_type: "expense", parent_code: "5" },

  // ── Klasa 6 — Prihodi ──
  { code: "6", name: "Prihodi", account_class: 6, account_type: "income", is_synthetic: true },
  { code: "6000", name: "Prihodi od prodaje (zemlja)", account_class: 6, account_type: "income", parent_code: "6" },
  { code: "6010", name: "Prihodi od izvoza", account_class: 6, account_type: "income", parent_code: "6" },
  { code: "6900", name: "Ostali prihodi", account_class: 6, account_type: "income", parent_code: "6" },

  // ── Klasa 7 — Otvaranje i zaključak (tehnički konti, bez poslovnih transakcija) ──
  { code: "7", name: "Otvaranje i zaključak", account_class: 7, account_type: "equity", is_synthetic: true },
  { code: "7000", name: "Otvarajući račun glavne knjige", account_class: 7, account_type: "equity", parent_code: "7" },
  { code: "7100", name: "Rashodi tekuće godine (za zatvaranje kl. 5)", account_class: 7, account_type: "equity", parent_code: "7" },
  { code: "7120", name: "Prihodi tekuće godine (za zatvaranje kl. 6)", account_class: 7, account_type: "equity", parent_code: "7" },
  { code: "7200", name: "Račun dobitka ili gubitka", account_class: 7, account_type: "equity", parent_code: "7" },
  { code: "7210", name: "Porezni rashod perioda (porez na dobit)", account_class: 7, account_type: "equity", parent_code: "7" },
  { code: "7260", name: "Prijenos dobiti ili gubitka na kapital", account_class: 7, account_type: "equity", parent_code: "7" },
];

/**
 * Logičke uloge konta za automatsko knjiženje. Vrijednosti su šifre iz
 * standardnog plana; mogu se kasnije mapirati na izmijenjene šifre.
 */
export const POSTING_ACCOUNTS = {
  customersDomestic: "2000",
  customersForeign: "2010",
  bank: "2400",
  bankClearing: "2490",
  cash: "2100",
  inputVat: "2700",
  outputVat: "4700",
  suppliersDomestic: "4320",
  suppliersForeign: "4330",
  netSalaryPayable: "4500",
  taxPayable: "4800",
  contributionsPayable: "4810",
  salesRevenue: "6000",
  exportRevenue: "6010",
  otherRevenue: "6900",
  goodsExpense: "5000",
  servicesExpense: "5300",
  grossSalaryExpense: "5200",
  employerContribExpense: "5210",
  nonMaterialExpense: "5500",
  depreciationExpense: "5400",
  accumulatedDepreciation: "0290",
  corporateTaxExpense: "7210",
  corporateTaxPayable: "4820",
  corporateTaxPrepaid: "2340",
  retainedEarningsCurrentYear: "3410",
  currentYearLoss: "3510",
  closingExpenses: "7100",
  closingRevenues: "7120",
  netResult: "7200",
  resultTransfer: "7260",
  openingEntry: "7000",
} as const;

export type PostingAccountRole = keyof typeof POSTING_ACCOUNTS;

export function accountName(code: string): string {
  return STANDARD_CHART.find((a) => a.code === code)?.name ?? code;
}
