// FBiH poreske stope i konstante (2024)
// Izvor: Zakon o doprinosima FBiH, Zakon o porezu na dohodak FBiH

export const EUR_TO_BAM = 1.95583;

export const INCOME_TAX_RATE = 0.10;
export const VAT_RATE = 0.17;

export const PERSONAL_DEDUCTION_MONTHLY = 300;
export const PERSONAL_DEDUCTION_ANNUAL = 3600;

// Doprinosi IZ plate (radnik plaća, oduzimaju se od bruta)
export const CONTRIBUTIONS_FROM = {
  pension:      { rate: 0.17,   code: "712112", name: "PIO/MIO" },
  health:       { rate: 0.125,  code: "712111", name: "Zdravstveno osiguranje" },
  unemployment: { rate: 0.015,  code: "712113", name: "Osiguranje od nezaposlenosti" },
  total:        0.31,
} as const;

// Doprinosi NA bruto (poslodavac plaća, dodaju se na bruto)
// Izmjena Zakona o doprinosima FBiH: stope PIO/MIO i zdravstvenog smanjene
export const CONTRIBUTIONS_ON = {
  pension:      { rate: 0.06,  code: "712112", name: "PIO/MIO na bruto" },       // 6% za d.o.o.
  health:       { rate: 0.04,  code: "712111", name: "Zdravstveno na bruto" },    // 4% za d.o.o.
  unemployment: { rate: 0.005, code: "712113", name: "Nezaposlenost na bruto" },  // 0,5%
  water:        { rate: 0.005, code: "722529", name: "Vodna naknada" },            // 0,5% od neto
  disaster:     { rate: 0.005, code: "722581", name: "Zaštita od prirodnih nesreća" }, // 0,5% od neto
  disability:   { rate: 0.005, code: "",       name: "Fond za profesionalnu rehab." }, // 0,5%, samo d.o.o.
  total_obrt:   0.05,   // 2,5+2+0,5 = 5% na bruto (bez vode i nesreća koje su od neto)
  total_doo:    0.11,  // 6+4+0.5+0.5 = 11% na bruto (uključujući OSI)
} as const;

// Raspodjela zdravstvenog doprinosa
export const HEALTH_SPLIT = {
  cantonal_rate: 0.898,
  federal_rate:  0.102,
  federal_account: "102-050-00000640-18",
} as const;

// Raspodjela doprinosa za nezaposlenost
export const UNEMPLOYMENT_SPLIT = {
  cantonal_rate: 0.70,
  federal_rate:  0.30,
} as const;

// AMS-1035 (prihodi iz inostranstva)
export const AMS_RATES = {
  standard_expense_deduction: 0.20,
  author_expense_deduction:   0.30,
  health_contribution:        0.04,
  income_tax:                 0.10,
} as const;

// Stope amortizacije (PLDI-1043)
export const DEPRECIATION_RATES = {
  computers_software: { rate: 0.3333, years: 3,  name: "Računari i softver" },
  vehicles:           { rate: 0.20,   years: 5,  name: "Motorna vozila" },
  equipment:          { rate: 0.1429, years: 7,  name: "Oprema i uređaji" },
  furniture:          { rate: 0.10,   years: 10, name: "Namještaj i inventar" },
  buildings_fast:     { rate: 0.04,   years: 25, name: "Poslovne zgrade (brza)" },
  buildings_slow:     { rate: 0.025,  years: 40, name: "Poslovne zgrade (spora)" },
} as const;
