import { getTaxConfig } from "@/lib/constants/tax-config";

export type AmsExpenseType = "standard" | "author" | "none";

export interface AmsCalculation {
  gross: number;
  expenseRate: number;
  expenseAmount: number;
  taxableBase: number;
  healthContribution: number;
  incomeTax: number;
  netPayment: number;
  totalCost: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function calculateAms(
  gross: number,
  expenseType: AmsExpenseType = "standard",
  periodDate?: string | Date
): AmsCalculation {
  const cfg = getTaxConfig(periodDate ?? new Date());
  const amsCfg = cfg.ams;

  const expenseRate =
    expenseType === "standard"
      ? amsCfg.standardExpenseDeduction
      : expenseType === "author"
      ? amsCfg.authorExpenseDeduction
      : 0;

  const expenseAmount = r2(gross * expenseRate);
  const taxableBase = r2(gross - expenseAmount);
  const healthContribution = r2(taxableBase * amsCfg.healthContribution);
  const incomeTax = r2((taxableBase - healthContribution) * amsCfg.incomeTax);
  const netPayment = r2(gross - healthContribution - incomeTax);

  return {
    gross,
    expenseRate,
    expenseAmount,
    taxableBase,
    healthContribution,
    incomeTax,
    netPayment,
    totalCost: gross,
  };
}
