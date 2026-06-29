export type UodExpenseType = "standard" | "author" | "none";

const EXPENSE_RATES: Record<UodExpenseType, number> = {
  standard: 0.20,
  author:   0.30,
  none:     0.00,
};

// Bruto = Neto / (1 - troškovi - (1-troškovi)×0.04 - (1-troškovi)×0.96×0.10)
//       = Neto / ((1-troškovi) × (1 - 0.04 - 0.96×0.10) + troškovi)
// For standard 20%: 0.80 × (1-0.04-0.096) + 0.20 = 0.80×0.864 + 0.20 = 0.8912
// bruto = neto / 0.8912 → multiplier 1.122083
function netToGrossMultiplier(expenseType: UodExpenseType): number {
  const e = EXPENSE_RATES[expenseType];
  const taxable = 1 - e;             // bruto × taxable = bruto_minus_troškovi
  const healthRate = taxable * 0.04;
  const taxRate    = (taxable - healthRate) * 0.10;
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
  expenseType: UodExpenseType = "standard"
): UodCalculation {
  const multiplier   = netToGrossMultiplier(expenseType);
  const bruto        = r2(neto * multiplier);
  return calculateUodFromBruto(bruto, expenseType, neto);
}

export function calculateUodFromBruto(
  bruto: number,
  expenseType: UodExpenseType = "standard",
  _netHint?: number
): UodCalculation {
  const expenseRate  = EXPENSE_RATES[expenseType];
  const expenseAmount = r2(bruto * expenseRate);
  const brutoMinusExp = r2(bruto - expenseAmount);
  const healthContrib = r2(brutoMinusExp * 0.04);
  const taxBase       = r2(brutoMinusExp - healthContrib);
  const incomeTax     = r2(taxBase * 0.10);
  const naknada       = r2(brutoMinusExp - healthContrib - incomeTax);
  const netPayment    = r2(naknada + expenseAmount);  // = neto za isplatu
  // PIO = 6% od bruto - troškovi (brutoMinusExp)
  const pensionOn     = r2(brutoMinusExp * 0.06);
  // water/disaster = 0.5% od neto
  const water         = r2(netPayment * 0.005);
  const disaster      = r2(netPayment * 0.005);
  const totalCost     = r2(bruto + pensionOn + water + disaster);
  const taxPercent    = r2(((totalCost - netPayment) / netPayment) * 100);
  const healthKanton  = r2(healthContrib * 0.898);
  const healthFbih    = r2(healthContrib * 0.102);

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
  expenseType: UodExpenseType = "standard"
): UodCalculation {
  return calculateUodFromBruto(gross, expenseType);
}

export { netToGrossMultiplier };
