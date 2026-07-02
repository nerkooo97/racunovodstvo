import { getTaxConfig, getCurrentTaxConfig, totalRate } from "@/lib/constants/tax-config";
import { getCantonalAccounts, FEDERAL_ACCOUNTS, CantonalAccountInfo } from "@/lib/constants/cantonal-accounts";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type SalaryCalculation = {
  gross_salary: number;
  gross_base: number;
  pro_rate_factor: number;
  min_base_applied: boolean;
  tax_coefficient: number;
  pension_contribution: number;
  health_contribution: number;
  unemployment_contribution: number;
  total_contributions_from: number;
  tax_base: number;
  personal_deduction: number;
  taxable_base: number;
  income_tax: number;
  net_salary: number;
  pension_contribution_on: number;
  health_contribution_on: number;
  unemployment_contribution_on: number;
  total_contributions_on: number;
  water_contribution: number;
  disaster_contribution: number;
  disability_fund: number;
  total_employer_cost: number;
};

export function calculateActiveDaysInMonth(
  year: number,
  month: number,
  hireDateStr?: string | null,
  terminationDateStr?: string | null
): { activeDays: number; totalDays: number } {
  const totalDays = new Date(year, month, 0).getDate();
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month - 1, totalDays));

  let activeStart = monthStart;
  if (hireDateStr) {
    const d = new Date(hireDateStr);
    if (!isNaN(d.getTime())) {
      const utcHire = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      if (utcHire > monthEnd) return { activeDays: 0, totalDays };
      if (utcHire > monthStart) activeStart = utcHire;
    }
  }

  let activeEnd = monthEnd;
  if (terminationDateStr) {
    const d = new Date(terminationDateStr);
    if (!isNaN(d.getTime())) {
      const utcTerm = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      if (utcTerm < monthStart) return { activeDays: 0, totalDays };
      if (utcTerm < monthEnd) activeEnd = utcTerm;
    }
  }

  if (activeStart > activeEnd) return { activeDays: 0, totalDays };

  const diffMs = activeEnd.getTime() - activeStart.getTime();
  const activeDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;

  return { activeDays: Math.min(totalDays, Math.max(0, activeDays)), totalDays };
}

/**
 * Minimalna neto plata FBiH — VREMENSKI VERZIONIRANA u lib/constants/tax-config.ts.
 * Ovaj re-export vraća vrijednost za DANAŠNJI datum i služi samo za prikaz;
 * obračuni koriste vrijednost za datum perioda (vidi computeMinGrossBase).
 */
export const MIN_NET_WAGE_FBIH = getCurrentTaxConfig().minNetWage;

/**
 * Računa minimalnu bruto osnovicu direktnom algebarskom formulom
 * (bez poziva calculateFromNet — izbjegava cirkularnu rekurziju:
 * calculateFromGross → ovdje → calculateFromNet → calculateFromGross).
 *
 * Sve stope (minimalna plata, doprinosi iz plate, porez, lični odbitak)
 * dolaze iz centralnog configa ZA DATUM PERIODA — obračun plate za stari
 * period koristi tada važeće vrijednosti.
 */
export function computeMinGrossBase(
  taxCoefficient: number = 1.0,
  periodDate?: string | Date
): number {
  const cfg = getTaxConfig(periodDate ?? new Date());
  const net = cfg.minNetWage;
  const a = totalRate(cfg.contributionsFrom); // npr. 0.31
  const deduction = cfg.personalDeductionMonthly * taxCoefficient;
  const t = cfg.incomeTaxRate; // npr. 0.10
  // Algebarski obrat neto→bruto uz porez: neto = bruto(1-a)(1-t) + t×odbitak
  const candidate = (net - t * deduction) / ((1 - a) * (1 - t));
  const gross = candidate * (1 - a) - deduction > 0.001
    ? candidate
    : net / (1 - a);
  return Math.round(gross * 100) / 100;
}

export function calculateFromGross(
  grossInput: number,
  taxCoefficient: number = 1.0,
  orgType: "obrt" | "doo" = "obrt",
  grossBaseInput?: number,
  proRateFactorInput?: number,
  periodDate?: string | Date
): SalaryCalculation {
  // JEDAN izvor istine za sve stope: centralni config za datum perioda.
  // Kad se zakon promijeni, dodaje se red u tax-config.ts — ovaj kod se ne dira.
  const cfg = getTaxConfig(periodDate ?? new Date());

  const minGrossBase = computeMinGrossBase(taxCoefficient, periodDate);
  const gross = round2(grossInput);
  const minBaseApplied = gross < minGrossBase;

  // Doprinosi IZ plate (na teret radnika)
  const pension = round2(gross * cfg.contributionsFrom.pension);
  const health = round2(gross * cfg.contributionsFrom.health);
  const unemployment = round2(gross * cfg.contributionsFrom.unemployment);
  const totalFrom = round2(gross * totalRate(cfg.contributionsFrom));

  // Porez na dohodak
  const taxBase = round2(gross - totalFrom);
  const personalDeduction = round2(cfg.personalDeductionMonthly * taxCoefficient);
  const taxableBase = round2(Math.max(0, taxBase - personalDeduction));
  const incomeTax = round2(taxableBase * cfg.incomeTaxRate);
  const net = round2(gross - totalFrom - incomeTax);

  // Doprinosi NA platu (na teret poslodavca) — stopa prema datumu perioda
  // (od 1.7.2025.: 2,5% + 2% + 0,5% za SVE poslodavce)
  const pensionOn = round2(gross * cfg.contributionsOn.pension);
  const healthOn = round2(gross * cfg.contributionsOn.health);
  const unemploymentOn = round2(gross * cfg.contributionsOn.unemployment);
  const totalOn = round2(pensionOn + healthOn + unemploymentOn);

  // Naknade: vodna i nesreće od NETO; OSI fond od BRUTO
  const water = round2(net * cfg.waterRate);
  const disaster = round2(net * cfg.disasterRate);
  const disability = orgType === "doo" ? round2(gross * cfg.disabilityRate) : 0;
  const totalEmployer = round2(gross + totalOn + water + disaster + disability);

  return {
    gross_salary: gross,
    gross_base: round2(grossBaseInput ?? grossInput),
    pro_rate_factor: proRateFactorInput ?? 1.0,
    min_base_applied: minBaseApplied,
    tax_coefficient: taxCoefficient,
    pension_contribution: pension,
    health_contribution: health,
    unemployment_contribution: unemployment,
    total_contributions_from: totalFrom,
    tax_base: taxBase,
    personal_deduction: personalDeduction,
    taxable_base: taxableBase,
    income_tax: incomeTax,
    net_salary: net,
    pension_contribution_on: pensionOn,
    health_contribution_on: healthOn,
    unemployment_contribution_on: unemploymentOn,
    total_contributions_on: totalOn,
    water_contribution: water,
    disaster_contribution: disaster,
    disability_fund: disability,
    total_employer_cost: totalEmployer,
  };
}

export function calculateFromNet(
  net: number,
  taxCoefficient: number = 1.0,
  orgType: "obrt" | "doo" = "obrt",
  grossBaseInput?: number,
  proRateFactorInput?: number,
  periodDate?: string | Date
): SalaryCalculation {
  // Početna procjena za iteraciju — stopa doprinosa iz configa za period
  let gross = round2(net / (1 - totalRate(getTaxConfig(periodDate ?? new Date()).contributionsFrom)));
  for (let i = 0; i < 15; i++) {
    const result = calculateFromGross(gross, taxCoefficient, orgType, grossBaseInput, proRateFactorInput, periodDate);
    const diff = net - result.net_salary;
    if (Math.abs(diff) < 0.005) break;
    gross = round2(gross + diff);
  }
  return calculateFromGross(gross, taxCoefficient, orgType, grossBaseInput, proRateFactorInput, periodDate);
}

export type SalaryType = "target_net" | "net_contract" | "gross_base";

export function calculateEmployee(
  salaryType: SalaryType,
  grossSalary: number | null,
  netSalary: number | null,
  taxCoefficient: number = 1.0,
  orgType: "obrt" | "doo" = "obrt",
  activeDays?: number,
  totalDays?: number,
  minuliRadYears: number = 0,
  minuliRadRate: number = 0.4,
  companyCarNet: number = 0,
  periodDate?: string | Date
): SalaryCalculation | null {
  const ratio = (activeDays !== undefined && totalDays !== undefined && totalDays > 0)
    ? (activeDays / totalDays)
    : 1;

  // Faktor za preračun neto koristi (službeno vozilo) → bruto: 1/(1 − doprinosi iz plate)
  // npr. 1/(1−0.31) ≈ 1.449 (provjeren prema Porezni Kalkulator BiH, modul computeKorist)
  const TOTAL_EMP_CONTRIBUTIONS = totalRate(getTaxConfig(periodDate ?? new Date()).contributionsFrom);
  const carBruto = round2(companyCarNet / (1 - TOTAL_EMP_CONTRIBUTIONS));

  if (salaryType === "gross_base" && grossSalary) {
    const baseGross = round2(grossSalary * ratio);
    const minuliAmount = round2(minuliRadYears * (minuliRadRate / 100) * baseGross);
    const finalGross = round2(baseGross + minuliAmount + carBruto);
    return calculateFromGross(finalGross, taxCoefficient, orgType, grossSalary, ratio, periodDate);
  }
  if ((salaryType === "net_contract" || salaryType === "target_net") && netSalary) {
    const proRatedNet = round2(netSalary * ratio);
    const baseCalc = calculateFromNet(proRatedNet, taxCoefficient, orgType, grossSalary ?? undefined, ratio, periodDate);
    const minuliAmount = round2(minuliRadYears * (minuliRadRate / 100) * baseCalc.gross_salary);
    const finalGross = round2(baseCalc.gross_salary + minuliAmount + carBruto);
    return calculateFromGross(finalGross, taxCoefficient, orgType, grossSalary ?? undefined, ratio, periodDate);
  }
  return null;
}

export interface PaymentVoucher {
  id: string;
  type: string;
  label: string;
  amount: number;
  account: string;
  vrstaPrihoda: string;
  budgetOrg: string;
  primalac: string[];
  opcinaIme: string;
  opcinaKod: string;
}

export interface SalaryItemForVoucher {
  calc: SalaryCalculation;
  canton: string | null;
  municipalityCode: string | null;
  municipalityName: string | null;
}

export function generateAggregatedVouchers(
  items: SalaryItemForVoucher[],
  orgCantonName: string | null | undefined,
  orgCity: string = "Sarajevo",
  orgMunicipalityCode: string = "109",
  combineKantonal: boolean = false
): PaymentVoucher[] {
  const orgAcc = getCantonalAccounts(orgCantonName);

  let sumPio = 0;
  let sumHealthTotal = 0;
  let sumUnempTotal = 0;
  let sumWater = 0, sumDisaster = 0, sumDisability = 0;

  // Per-canton buckets for kantonal health + unemployment splits
  const cantonBuckets = new Map<string, {
    healthTotal: number;
    unempTotal: number;
    acc: CantonalAccountInfo;
  }>();

  // Per-municipality buckets for income tax (employee residence)
  const munBuckets = new Map<string, {
    taxTotal: number;
    munCode: string;
    munName: string;
    cantonAcc: CantonalAccountInfo;
  }>();

  for (const { calc, canton, municipalityCode, municipalityName } of items) {
    const cAcc = getCantonalAccounts(canton || orgCantonName);

    sumPio += calc.pension_contribution + calc.pension_contribution_on;

    const healthTotal = calc.health_contribution + calc.health_contribution_on;
    sumHealthTotal += healthTotal;
    const unempTotal = calc.unemployment_contribution + calc.unemployment_contribution_on;
    sumUnempTotal += unempTotal;

    const existing = cantonBuckets.get(cAcc.cantonName);
    if (existing) {
      existing.healthTotal += healthTotal;
      existing.unempTotal += unempTotal;
    } else {
      cantonBuckets.set(cAcc.cantonName, { healthTotal, unempTotal, acc: cAcc });
    }

    // Income tax per employee municipality of residence
    const munKey = municipalityCode ?? orgMunicipalityCode;
    const munName = municipalityName ?? orgCity;
    const munExisting = munBuckets.get(munKey);
    if (munExisting) {
      munExisting.taxTotal += calc.income_tax;
    } else {
      munBuckets.set(munKey, { taxTotal: calc.income_tax, munCode: munKey, munName, cantonAcc: cAcc });
    }

    // Vodna + nesreće + OSI go to org's canton (not per employee)
    sumWater += calc.water_contribution;
    sumDisaster += calc.disaster_contribution;
    sumDisability += calc.disability_fund;
  }

  const vouchers: PaymentVoucher[] = [];

  // 1. PIO/MIO — single federal account (both employee + employer portions)
  vouchers.push({
    id: "pio",
    type: "UPLATNICA_PIO",
    label: "PIO/MIO doprinos",
    amount: round2(sumPio),
    account: FEDERAL_ACCOUNTS.pio.account,
    vrstaPrihoda: FEDERAL_ACCOUNTS.pio.vrstaPrihoda,
    budgetOrg: FEDERAL_ACCOUNTS.pio.budgetOrg,
    primalac: ["Budžet Federacije BiH", "Doprinos za PIO/MIO"],
    opcinaIme: orgCity,
    opcinaKod: orgMunicipalityCode,
  });

  // 2. Zdravstveno + Nezaposlenost kantonal — one voucher per canton
  for (const [, bucket] of cantonBuckets) {
    const healthKant = round2(bucket.healthTotal * 0.898);
    const unempKant = round2(bucket.unempTotal * 0.70);

    if (combineKantonal) {
      if (healthKant + unempKant > 0) {
        vouchers.push({
          id: `zdr_nez_kant_${bucket.acc.cantonName}`,
          type: "UPLATNICA_ZDR_NEZ_KANTONAL",
          label: `Zdravstvo + Nezaposlenost kantonalno — ${bucket.acc.cantonName}`,
          amount: round2(healthKant + unempKant),
          account: bucket.acc.healthAccount,
          vrstaPrihoda: "712111",
          budgetOrg: "0000000",
          primalac: ["Zavod zdravstvenog osiguranja i služba zapošljavanja", bucket.acc.cantonName],
          opcinaIme: orgCity,
          opcinaKod: orgMunicipalityCode,
        });
      }
    } else {
      if (healthKant > 0) {
        vouchers.push({
          id: `zdr_kant_${bucket.acc.cantonName}`,
          type: "UPLATNICA_ZDR",
          label: `Zdravstvo, kantonalni (89,8%) — ${bucket.acc.cantonName}`,
          amount: healthKant,
          account: bucket.acc.healthAccount,
          vrstaPrihoda: "712111",
          budgetOrg: "0000000",
          primalac: ["Zavod zdravstvenog osiguranja", bucket.acc.cantonName],
          opcinaIme: orgCity,
          opcinaKod: orgMunicipalityCode,
        });
      }
      if (unempKant > 0) {
        vouchers.push({
          id: `nez_kant_${bucket.acc.cantonName}`,
          type: "UPLATNICA_NEZ",
          label: `Nezaposlenost, kantonalni (70%) — ${bucket.acc.cantonName}`,
          amount: unempKant,
          account: bucket.acc.unemploymentAccount,
          vrstaPrihoda: "712113",
          budgetOrg: "0000000",
          primalac: ["Kantonalna služba za zapošljavanje", bucket.acc.cantonName],
          opcinaIme: orgCity,
          opcinaKod: orgMunicipalityCode,
        });
      }
    }
  }

  // 3. Zdravstveno federalni (10,2%) — single federal account
  const healthFederalTotal = round2(sumHealthTotal * 0.102);
  if (healthFederalTotal > 0) {
    vouchers.push({
      id: "zdr_federal",
      type: "UPLATNICA_ZDR_FED",
      label: "Zdravstvo, federalni (10,2%)",
      amount: healthFederalTotal,
      account: FEDERAL_ACCOUNTS.healthFederal.account,
      vrstaPrihoda: FEDERAL_ACCOUNTS.healthFederal.vrstaPrihoda,
      budgetOrg: FEDERAL_ACCOUNTS.healthFederal.budgetOrg,
      primalac: ["Zavod zdravstvenog osiguranja i reosiguranja FBiH", ""],
      opcinaIme: orgCity,
      opcinaKod: orgMunicipalityCode,
    });
  }

  // 4. Nezaposlenost federalni (30%) — single federal account
  const unempFederalTotal = round2(sumUnempTotal * 0.30);
  if (unempFederalTotal > 0) {
    vouchers.push({
      id: "nez_federal",
      type: "UPLATNICA_NEZ_FED",
      label: "Nezaposlenost, federalni (30%)",
      amount: unempFederalTotal,
      account: FEDERAL_ACCOUNTS.unemploymentFederal.account,
      vrstaPrihoda: FEDERAL_ACCOUNTS.unemploymentFederal.vrstaPrihoda,
      budgetOrg: FEDERAL_ACCOUNTS.unemploymentFederal.budgetOrg,
      primalac: ["Federalni zavod za zapošljavanje", ""],
      opcinaIme: orgCity,
      opcinaKod: orgMunicipalityCode,
    });
  }

  // 5. Porez na dohodak (716111) — separate voucher per employee municipality of residence
  for (const [, bucket] of munBuckets) {
    if (bucket.taxTotal > 0) {
      vouchers.push({
        id: `porez_${bucket.munCode}`,
        type: "UPLATNICA_POREZ",
        label: `Porez na dohodak — ${bucket.munName}`,
        amount: round2(bucket.taxTotal),
        account: bucket.cantonAcc.budgetAccount,
        vrstaPrihoda: "716111",
        budgetOrg: "0000000",
        primalac: ["Budžet Kantona — Porez na dohodak", bucket.cantonAcc.cantonName],
        opcinaIme: bucket.munName,
        opcinaKod: bucket.munCode,
      });
    }
  }

  // 6. Naknada za zaštitu od prirodnih nesreća — org canton budget
  if (sumDisaster > 0) {
    vouchers.push({
      id: "nesrece",
      type: "UPLATNICA_NESRECE",
      label: "Zaštita od prirodnih nesreća",
      amount: round2(sumDisaster),
      account: orgAcc.budgetAccount,
      vrstaPrihoda: FEDERAL_ACCOUNTS.disasterDefault.vrstaPrihoda,
      budgetOrg: "0000000",
      primalac: ["Budžet Kantona", "Naknada za zaštitu od prirodnih nesreća"],
      opcinaIme: orgCity,
      opcinaKod: orgMunicipalityCode,
    });
  }

  // 7. Opća vodna naknada — org canton budget
  if (sumWater > 0) {
    vouchers.push({
      id: "vodna",
      type: "UPLATNICA_VODNA",
      label: "Opća vodna naknada",
      amount: round2(sumWater),
      account: orgAcc.budgetAccount,
      vrstaPrihoda: FEDERAL_ACCOUNTS.waterDefault.vrstaPrihoda,
      budgetOrg: "0000000",
      primalac: ["Budžet Kantona", "Opća vodna naknada"],
      opcinaIme: orgCity,
      opcinaKod: orgMunicipalityCode,
    });
  }

  // 8. OSI fond — only d.o.o. (sumDisability > 0 only when org is d.o.o.)
  if (sumDisability > 0) {
    vouchers.push({
      id: "osi",
      type: "UPLATNICA_INVALIDI",
      label: "Fond za rehabilitaciju OSI (0,5%)",
      amount: round2(sumDisability),
      account: FEDERAL_ACCOUNTS.osiFund.account,
      vrstaPrihoda: FEDERAL_ACCOUNTS.osiFund.vrstaPrihoda,
      budgetOrg: FEDERAL_ACCOUNTS.osiFund.budgetOrg,
      primalac: ["Fond za profesionalnu rehabilitaciju i zapošljavanje OSI", ""],
      opcinaIme: orgCity,
      opcinaKod: orgMunicipalityCode,
    });
  }

  return vouchers;
}

export interface JournalEntry {
  konto: string;
  opis: string;
  duguje: number;
  potrazuje: number;
}

export function generateAccountingJournal(
  items: SalaryCalculation[],
  mealAllowanceTotal: number
): JournalEntry[] {
  let sumGross = 0;
  let sumEmpPio = 0, sumEmpHealth = 0, sumEmpUnemp = 0;
  let sumTax = 0, sumNet = 0;
  let sumErpPio = 0, sumErpHealth = 0, sumErpUnemp = 0;
  let sumWaterDisaster = 0, sumDisability = 0;

  items.forEach((it) => {
    sumGross += it.gross_salary;
    sumEmpPio += it.pension_contribution;
    sumEmpHealth += it.health_contribution;
    sumEmpUnemp += it.unemployment_contribution;
    sumTax += it.income_tax;
    sumNet += it.net_salary;
    sumErpPio += it.pension_contribution_on;
    sumErpHealth += it.health_contribution_on;
    sumErpUnemp += it.unemployment_contribution_on;
    sumWaterDisaster += (it.water_contribution + it.disaster_contribution);
    sumDisability += it.disability_fund;
  });

  // Konta po FBiH kontnom okviru (SN 81/21) — ISTA konta kao GK knjiženje
  // (lib/accounting/posting-rules.ts salaryToLines): 5200/5210 troškovi,
  // 4500 neto, 4800 porez, 4810 doprinosi.
  const sumEmpContrib = round2(sumEmpPio + sumEmpHealth + sumEmpUnemp);
  const sumErpContrib = round2(sumErpPio + sumErpHealth + sumErpUnemp + sumWaterDisaster + sumDisability);

  const journal: JournalEntry[] = [
    { konto: "5200", opis: "Troškovi bruto plata", duguje: round2(sumGross), potrazuje: 0 },
    { konto: "5210", opis: "Troškovi doprinosa na teret poslodavca (uklj. vodna, nesreće, OSI)", duguje: sumErpContrib, potrazuje: 0 },
    { konto: "4500", opis: "Obaveze za neto plate", duguje: 0, potrazuje: round2(sumNet) },
    { konto: "4800", opis: "Obaveze za porez na dohodak", duguje: 0, potrazuje: round2(sumTax) },
    { konto: "4810", opis: "Obaveze za doprinose (iz plate + na platu)", duguje: 0, potrazuje: round2(sumEmpContrib + sumErpContrib) },
  ];

  if (mealAllowanceTotal > 0) {
    journal.push(
      { konto: "5210", opis: "Naknade zaposlenima — topli obrok", duguje: round2(mealAllowanceTotal), potrazuje: 0 },
      { konto: "4500", opis: "Obaveze za naknade zaposlenima", duguje: 0, potrazuje: round2(mealAllowanceTotal) }
    );
  }

  return journal;
}
