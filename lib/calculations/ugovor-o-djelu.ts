import { getTaxConfig } from "@/lib/constants/tax-config";
import { HEALTH_SPLIT } from "@/lib/constants/tax-rates";

export type UodExpenseType = "standard" | "author" | "none";

// Bruto = Neto / (1 - troškovi - (1-troškovi)×healthRate - (1-troškovi)×(1-healthRate)×incomeTaxRate)
//       = Neto / ((1-troškovi) × (1 - healthRate - (1-healthRate)×incomeTaxRate) + troškovi)
function netToGrossMultiplier(expenseType: UodExpenseType, periodDate?: string | Date): number {
  const cfg = getTaxConfig(periodDate ?? new Date());
  const e = expenseType === "standard"
    ? cfg.uod.standardExpenseRate
    : expenseType === "author"
    ? cfg.uod.authorExpenseRate
    : 0;
  const taxable = 1 - e;             // bruto × taxable = bruto_minus_troškovi
  const healthRate = taxable * cfg.uod.healthRate;
  const taxRate    = (taxable - healthRate) * cfg.incomeTaxRate;
  const netFactor  = taxable - healthRate - taxRate + e; // naknada za isplatu / bruto
  return 1 / netFactor;
}

export interface UodCalculation {
  neto:              number;  // naknada za isplatu (=ulazni neto)
  bruto:             number;  // bruto iznos UoD
  expenseRate:       number;
  expenseAmount:     number;  // rb3: troškovi
  brutoMinusExp:     number;  // rb4: bruto - troškovi
  healthContrib:     number;  // rb5: zdravstvo 4%
  taxBase:           number;  // rb6: osnovica za porez
  incomeTax:         number;  // rb7: porez 10%
  naknada:           number;  // rb8: po odbitku zdravstva i poreza
  netPayment:        number;  // rb10: naknada za isplatu (=neto)
  pensionOn:         number;  // rb11: PIO 6% na bruto-troškovi
  disaster:          number;  // rb12: 0.5% od neto
  water:             number;  // rb13: 0.5% od neto
  totalCost:         number;  // rb14: ukupni trošak naručioca
  taxPercent:        number;  // rb16: %
  // Health split
  healthKanton:      number;
  healthFbih:        number;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateUodFromNeto(
  neto: number,
  expenseType: UodExpenseType = "standard",
  periodDate?: string | Date
): UodCalculation {
  const multiplier   = netToGrossMultiplier(expenseType, periodDate);
  const bruto        = r2(neto * multiplier);
  return calculateUodFromBruto(bruto, expenseType, periodDate);
}

export function calculateUodFromBruto(
  bruto: number,
  expenseType: UodExpenseType = "standard",
  periodDate?: string | Date
): UodCalculation {
  const cfg = getTaxConfig(periodDate ?? new Date());
  const expenseRate = expenseType === "standard"
    ? cfg.uod.standardExpenseRate
    : expenseType === "author"
    ? cfg.uod.authorExpenseRate
    : 0;

  const expenseAmount = r2(bruto * expenseRate);
  const brutoMinusExp = r2(bruto - expenseAmount);
  const healthContrib = r2(brutoMinusExp * cfg.uod.healthRate);
  const taxBase       = r2(brutoMinusExp - healthContrib);
  const incomeTax     = r2(taxBase * cfg.incomeTaxRate);
  const naknada       = r2(brutoMinusExp - healthContrib - incomeTax);
  const netPayment    = r2(naknada + expenseAmount);  // = neto za isplatu

  // PIO na teret isplatioca (pensionRate) od bruto - troškovi
  const pensionOn     = r2(brutoMinusExp * cfg.uod.pensionRate);

  // water/disaster od neto
  const water         = r2(netPayment * cfg.waterRate);
  const disaster      = r2(netPayment * cfg.disasterRate);
  const totalCost     = r2(bruto + pensionOn + water + disaster);
  const taxPercent    = r2(((totalCost - netPayment) / netPayment) * 100);
  const healthKanton  = r2(healthContrib * HEALTH_SPLIT.cantonal_rate);
  const healthFbih    = r2(healthContrib * HEALTH_SPLIT.federal_rate);

  return {
    neto: netPayment,
    bruto, expenseRate, expenseAmount,
    brutoMinusExp, healthContrib, taxBase, incomeTax,
    naknada, netPayment,
    pensionOn, disaster, water,
    totalCost, taxPercent,
    healthKanton, healthFbih,
  };
}

export function calculateUod(
  gross: number,
  expenseType: UodExpenseType = "standard",
  periodDate?: string | Date
): UodCalculation {
  return calculateUodFromBruto(gross, expenseType, periodDate);
}

export { netToGrossMultiplier };
