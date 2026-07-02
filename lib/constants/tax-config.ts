/**
 * ════════════════════════════════════════════════════════════════════════════
 * CENTRALNI PORESKI CONFIG — JEDINI IZVOR ISTINE ZA SVE ZAKONSKE STOPE (FBiH)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * ZAŠTO OVAJ FAJL POSTOJI
 * ───────────────────────
 * Zakonske stope (PDV, porez na dohodak, doprinosi, minimalna plata...) se
 * mijenjaju izmjenama zakona — i to na ODREĐENI DATUM. Obračun plate za juni
 * 2025. mora koristiti stope koje su važile u junu 2025., čak i ako se računa
 * (ili preračunava/štampa PDF) godinama kasnije. Zato stope NISU obične
 * konstante nego su VERZIONIRANE PO DATUMU VAŽENJA.
 *
 * PRAVILA KORIŠTENJA (za svaki novi kod):
 *   1. NIKAD ne hardkodiraj stopu (0.17, 0.10, 300...) u stranici, akciji ili
 *      PDF ruti. Uvijek: `getTaxConfig(datum).nešto`.
 *   2. Datum koji proslijediš je DATUM DOKUMENTA/PERIODA (datum fakture,
 *      prvi dan obračunskog mjeseca plate, 31.12. za zaključak godine) —
 *      NE današnji datum. Današnji datum koristi samo za "kalkulator" alate
 *      koji nemaju vezani dokument.
 *   3. Ako komponenta zaista nema smisleni datum (npr. informativni
 *      kalkulator), koristi `getCurrentTaxConfig()`.
 *
 * KAKO AŽURIRATI KAD SE ZAKON PROMIJENI (jedina stvar koju treba raditi):
 * ────────────────────────────────────────────────────────────────────────
 * U listu `TAX_CONFIG_CHANGES` dodaj NOVI red na kraj, sa:
 *   - `validFrom`: datum početka primjene iz zakona/odluke (format YYYY-MM-DD)
 *   - `source`:    broj Službenih novina FBiH ili naziv zakona (za trag)
 *   - `changes`:   SAMO polja koja se mijenjaju — ostala se naslijeđuju
 *                  iz prethodnog stanja (kumulativno spajanje)
 *
 * Primjer — recimo da se 1.1.2027. PDV digne na 19% i minimalna plata na 1100:
 *
 *   {
 *     validFrom: "2027-01-01",
 *     source: "SN FBiH XX/26",
 *     changes: { vatRate: 0.19, minNetWage: 1100 },
 *   },
 *
 * To je SVE. Nijedan drugi fajl se ne dira: obračuni plata, PDV, fakture,
 * ugovori o djelu, PDF obrasci — svi čitaju odavde i automatski koriste
 * ispravnu stopu za datum svog dokumenta. Stari dokumenti i preračuni
 * zadržavaju stare stope jer je merge kumulativan po datumu.
 *
 * NAPOMENA O STARIM PODACIMA: pošto se merge radi po datumu, NIKAD ne mijenjaj
 * postojeći red (osim ispravke greške u prepisu) — uvijek dodaj novi. Izmjena
 * postojećeg reda mijenja i sve historijske obračune.
 * ════════════════════════════════════════════════════════════════════════════
 */

// ─── Struktura configa ────────────────────────────────────────────────────────

export interface ContributionRates {
  /** PIO/MIO — penzijsko i invalidsko osiguranje */
  pension: number;
  /** Zdravstveno osiguranje */
  health: number;
  /** Osiguranje od nezaposlenosti */
  unemployment: number;
}

export interface TaxConfig {
  /** PDV — Zakon o PDV BiH, čl. 23 (na nivou BiH, ne entiteta) */
  vatRate: number;

  /** Porez na dohodak — Zakon o porezu na dohodak FBiH, čl. 27 */
  incomeTaxRate: number;

  /** Porez na dobit pravnih lica — Zakon o porezu na dobit FBiH, čl. 36 */
  corporateTaxRate: number;

  /** Lični odbitak — Zakon o porezu na dohodak FBiH, čl. 24 (300 KM/mj = faktor 1.0) */
  personalDeductionMonthly: number;
  personalDeductionAnnual: number;

  /**
   * Doprinosi IZ plate (na teret RADNIKA — odbijaju se od bruto plate).
   * Zakon o doprinosima FBiH, čl. 10.
   */
  contributionsFrom: ContributionRates;

  /**
   * Doprinosi NA platu (na teret POSLODAVCA — dodaju se na bruto).
   * Zakon o doprinosima FBiH. PAŽNJA: ovo je stopa koja se najčešće mijenja —
   * zadnja izmjena 1.7.2025. (smanjenje sa 6+4+0,5 na 2,5+2+0,5).
   */
  contributionsOn: ContributionRates;

  /** Opća vodna naknada — Zakon o vodama FBiH, čl. 170: 0,5% od NETO plate */
  waterRate: number;

  /** Naknada za zaštitu od prirodnih nesreća — čl. 180: 0,5% od NETO plate */
  disasterRate: number;

  /**
   * Fond za profesionalnu rehabilitaciju OSI — Zakon o prof. rehabilitaciji OSI
   * (SN FBiH 9/10): 0,5% od BRUTO. Obveznik je poslodavac sa ≥16 zaposlenih
   * koji ne ispunjava kvotu zapošljavanja OSI.
   */
  disabilityRate: number;

  /**
   * Minimalna NETO plata FBiH — utvrđuje Vlada FBiH odlukom za svaku godinu.
   * Koristi se kao donja granica osnovice za obračun doprinosa.
   */
  minNetWage: number;

  /**
   * Ugovor o djelu — stope po Zakonu o porezu na dohodak FBiH + Zakonu o
   * doprinosima FBiH za primanja van radnog odnosa.
   */
  uod: {
    /** Zdravstveno osiguranje na UoD: % od (bruto − priznati troškovi) */
    healthRate: number;
    /** PIO na UoD (na teret isplatioca): % od (bruto − priznati troškovi) */
    pensionRate: number;
    /** Priznati troškovi — standardni (čl. 12: 20%) */
    standardExpenseRate: number;
    /** Priznati troškovi — autorski honorari (30%) */
    authorExpenseRate: number;
  };

  /**
   * AMS-1035 — prihodi iz inostranstva (samostalna prijava poreza i doprinosa).
   */
  ams: {
    standardExpenseDeduction: number;
    authorExpenseDeduction: number;
    healthContribution: number;
    incomeTax: number;
  };
}

// ─── Bazno stanje (važi od 1.1.2024. — početak podrške u aplikaciji) ──────────
// Za dokumente sa datumom PRIJE 2024-01-01 vraća se ovo bazno stanje.

const BASE_CONFIG: TaxConfig = {
  vatRate: 0.17,
  incomeTaxRate: 0.10,
  corporateTaxRate: 0.10,
  personalDeductionMonthly: 300,
  personalDeductionAnnual: 3600,
  contributionsFrom: { pension: 0.17, health: 0.125, unemployment: 0.015 }, // ukupno 31%
  contributionsOn: { pension: 0.06, health: 0.04, unemployment: 0.005 },    // ukupno 10,5% (do 30.6.2025.)
  waterRate: 0.005,
  disasterRate: 0.005,
  disabilityRate: 0.005,
  minNetWage: 619, // Odluka Vlade FBiH za 2024.
  uod: {
    healthRate: 0.04,
    pensionRate: 0.06,
    standardExpenseRate: 0.20,
    authorExpenseRate: 0.30,
  },
  ams: {
    standardExpenseDeduction: 0.20,
    authorExpenseDeduction: 0.30,
    healthContribution: 0.04,
    incomeTax: 0.10,
  },
};

// ─── Historija izmjena (SAMO polja koja se mijenjaju — dodavati na KRAJ) ──────

interface TaxConfigChange {
  /** Datum početka primjene (YYYY-MM-DD) — iz zakona/odluke, ne datum objave */
  validFrom: string;
  /** Broj Službenih novina / naziv propisa — radi kasnije provjere */
  source: string;
  /** Samo izmijenjena polja; ugniježdeni objekti se spajaju plitko po sekciji */
  changes: Partial<{
    vatRate: number;
    incomeTaxRate: number;
    corporateTaxRate: number;
    personalDeductionMonthly: number;
    personalDeductionAnnual: number;
    contributionsFrom: ContributionRates;
    contributionsOn: ContributionRates;
    waterRate: number;
    disasterRate: number;
    disabilityRate: number;
    minNetWage: number;
    uod: TaxConfig["uod"];
    ams: TaxConfig["ams"];
  }>;
}

const TAX_CONFIG_CHANGES: TaxConfigChange[] = [
  {
    // Minimalna plata za 2025. podignuta na 1.000 KM neto
    validFrom: "2025-01-01",
    source: "Odluka Vlade FBiH o minimalnoj plati za 2025.",
    changes: { minNetWage: 1000 },
  },
  {
    // Izmjene Zakona o doprinosima FBiH — smanjenje doprinosa NA platu
    // sa 6% + 4% + 0,5% na 2,5% + 2% + 0,5%, ZA SVE POSLODAVCE
    validFrom: "2025-07-01",
    source: "Zakon o izmjenama Zakona o doprinosima FBiH (primjena od 1.7.2025.)",
    changes: {
      contributionsOn: { pension: 0.025, health: 0.02, unemployment: 0.005 },
    },
  },
  {
    // Minimalna plata za 2026. — 1.027 KM neto
    validFrom: "2026-01-01",
    source: "SN FBiH 100/25",
    changes: { minNetWage: 1027 },
  },
  // ── OVDJE dodavati buduće izmjene (vidi uputstvo na vrhu fajla) ──
];

// ─── Lookup ───────────────────────────────────────────────────────────────────

function toDateString(date: string | Date): string {
  if (typeof date === "string") return date.slice(0, 10);
  // Lokalni datum (ne UTC) — obračunski periodi su lokalni
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Vraća kompletan poreski config važeći na dati datum.
 *
 * @param date Datum DOKUMENTA ili PERIODA (datum fakture, prvi dan obračunskog
 *             mjeseca, 31.12. za godišnji zaključak) — ne današnji datum!
 *
 * Primjeri:
 *   getTaxConfig("2025-06-01").contributionsOn.pension  // 0.06  (staro)
 *   getTaxConfig("2025-07-01").contributionsOn.pension  // 0.025 (novo)
 *   getTaxConfig(`${year}-12-31`).corporateTaxRate      // za zaključak godine
 */
export function getTaxConfig(date: string | Date): TaxConfig {
  const d = toDateString(date);
  // Kumulativno spajanje: krećemo od baze i primjenjujemo sve izmjene
  // čiji je validFrom <= traženi datum, redom.
  let cfg: TaxConfig = { ...BASE_CONFIG };
  for (const change of TAX_CONFIG_CHANGES) {
    if (change.validFrom > d) break; // lista je hronološka — dalje nema šta
    cfg = {
      ...cfg,
      ...change.changes,
      // Ugniježdene sekcije: nova sekcija u potpunosti zamjenjuje staru
      // (u changes se navodi KOMPLETNA sekcija, ne pojedinačno polje)
      contributionsFrom: change.changes.contributionsFrom ?? cfg.contributionsFrom,
      contributionsOn: change.changes.contributionsOn ?? cfg.contributionsOn,
      uod: change.changes.uod ?? cfg.uod,
      ams: change.changes.ams ?? cfg.ams,
    };
  }
  return cfg;
}

/**
 * Config za DANAŠNJI datum — koristiti SAMO za informativne kalkulatore
 * bez vezanog dokumenta. Za sve što se knjiži ili štampa koristi
 * getTaxConfig(datum dokumenta).
 */
export function getCurrentTaxConfig(): TaxConfig {
  return getTaxConfig(new Date());
}

/** Zbir stopa doprinosa (pomoćna — npr. 0.17+0.125+0.015 = 0.31). */
export function totalRate(rates: ContributionRates): number {
  return rates.pension + rates.health + rates.unemployment;
}
