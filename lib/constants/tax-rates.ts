/**
 * ════════════════════════════════════════════════════════════════════════════
 * KOMPATIBILNI SLOJ — NE DODAVATI NOVE STOPE OVDJE!
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Sve zakonske stope žive u `lib/constants/tax-config.ts` (vremenski
 * verzionirane po datumu važenja). Ovaj fajl postoji samo da postojeći kod
 * koji importuje stare konstante nastavi raditi — vrijednosti se IZVODE iz
 * configa za današnji datum.
 *
 * ZA NOVI KOD: importuj `getTaxConfig(datumDokumenta)` iz `tax-config.ts` i
 * čitaj stopu za datum dokumenta/perioda. Konstante ispod su prihvatljive samo
 * za informativne kalkulatore bez vezanog dokumenta.
 *
 * KAD SE ZAKON PROMIJENI: dodaj red u TAX_CONFIG_CHANGES u `tax-config.ts` —
 * ovaj fajl se NE dira (vrijednosti se same ažuriraju).
 *
 * Ono što legitimno živi ovdje (jer NISU stope koje se mijenjaju zakonom o
 * stopama): šifre vrsta prihoda za uplatnice, raspodjele po računima,
 * kursevi, amortizacione grupe.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { getCurrentTaxConfig, getTaxConfig, totalRate, type ContributionRates } from "./tax-config";

export type { ContributionRates as EmployerRates };

const CURRENT = getCurrentTaxConfig();

// ─── Fiksne konstante (nisu zakonske stope) ──────────────────────────────────

/** Fiksni kurs KM/EUR (currency board — nepromjenjiv) */
export const EUR_TO_BAM = 1.95583;

// ─── Stope za današnji datum (izvedene iz tax-config.ts) ─────────────────────

export const INCOME_TAX_RATE = CURRENT.incomeTaxRate;
export const VAT_RATE = CURRENT.vatRate;
export const CORPORATE_TAX_RATE = CURRENT.corporateTaxRate;
export const PERSONAL_DEDUCTION_MONTHLY = CURRENT.personalDeductionMonthly;
export const PERSONAL_DEDUCTION_ANNUAL = CURRENT.personalDeductionAnnual;
export const MIN_NET_WAGE_FBIH = CURRENT.minNetWage;

/**
 * Doprinosi IZ plate (na teret radnika) + šifre vrsta prihoda za uplatnice.
 * Stope dolaze iz configa; šifre (712xxx) su iz Pravilnika o načinu uplate
 * javnih prihoda i mijenjaju se rijetko.
 */
export const CONTRIBUTIONS_FROM = {
  pension:      { rate: CURRENT.contributionsFrom.pension,      code: "712112", name: "PIO/MIO" },
  health:       { rate: CURRENT.contributionsFrom.health,       code: "712111", name: "Zdravstveno osiguranje" },
  unemployment: { rate: CURRENT.contributionsFrom.unemployment, code: "712113", name: "Osiguranje od nezaposlenosti" },
  total:        totalRate(CURRENT.contributionsFrom),
} as const;

/**
 * Doprinosi NA platu i naknade — šifre za uplatnice + stope od neto/bruto.
 * NAPOMENA: stope pension/health/unemployment na platu su vremenski
 * verzionirane — za obračun za konkretan period koristi getEmployerRates(datum).
 */
export const CONTRIBUTIONS_ON = {
  pension:      { code: "712112", name: "PIO/MIO na bruto" },
  health:       { code: "712111", name: "Zdravstveno na bruto" },
  unemployment: { code: "712113", name: "Nezaposlenost na bruto" },
  water:        { rate: CURRENT.waterRate,      code: "722529", name: "Vodna naknada" },
  disaster:     { rate: CURRENT.disasterRate,   code: "722581", name: "Zaštita od prirodnih nesreća" },
  disability:   { rate: CURRENT.disabilityRate, code: "",       name: "Fond za profesionalnu rehab." },
} as const;

/**
 * Stope doprinosa na teret poslodavca važeće na dati datum obračunskog perioda.
 * (Delegira na centralni config — zadržano ime radi postojećih poziva.)
 */
export function getEmployerRates(date: string | Date): ContributionRates {
  return getTaxConfig(date).contributionsOn;
}

// ─── Raspodjele po računima (Pravilnik o načinu uplate javnih prihoda) ────────

export const HEALTH_SPLIT = {
  cantonal_rate: 0.898,
  federal_rate:  0.102,
  federal_account: "102-050-00000640-18",
} as const;

export const UNEMPLOYMENT_SPLIT = {
  cantonal_rate: 0.70,
  federal_rate:  0.30,
} as const;

// ─── AMS-1035 (prihodi iz inostranstva) — iz configa ─────────────────────────

export const AMS_RATES = {
  standard_expense_deduction: CURRENT.ams.standardExpenseDeduction,
  author_expense_deduction:   CURRENT.ams.authorExpenseDeduction,
  health_contribution:        CURRENT.ams.healthContribution,
  income_tax:                 CURRENT.ams.incomeTax,
} as const;

// ─── Amortizacione grupe (PLDI-1043) ─────────────────────────────────────────
// Maksimalne porezno priznate stope: čl. 19 st. 2 Zakona o porezu na dobit
// FBiH — građevine 5% (10% ceste/komunalno), oprema/vozila/mehanizacija 15%,
// hardver/softver 33,3%, nematerijalna 20%, zasadi 15%, osnovno stado 40%.

export const DEPRECIATION_RATES = {
  computers_software: { rate: 0.3333, years: 3,  name: "Računari i softver" },
  vehicles:           { rate: 0.15,   years: 7,  name: "Motorna vozila" },
  equipment:          { rate: 0.1429, years: 7,  name: "Oprema i uređaji" },
  furniture:          { rate: 0.10,   years: 10, name: "Namještaj i inventar" },
  buildings_fast:     { rate: 0.04,   years: 25, name: "Poslovne zgrade (brza)" },
  buildings_slow:     { rate: 0.025,  years: 40, name: "Poslovne zgrade (spora)" },
} as const;

/** Maksimalne porezno priznate stope amortizacije (%) po tipu sredstva */
export const MAX_DEPRECIATION_RATE_PERCENT: Record<string, number> = {
  computers_software: 33.33,
  vehicles: 15,
  equipment: 15,
  furniture: 15,
  buildings_fast: 5,
  buildings_slow: 5,
};
