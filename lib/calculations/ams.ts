import { AMS_RATES } from "@/lib/constants/tax-rates";

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

export function calculateAms(
  gross: number,
  expenseType: AmsExpenseType = "standard"
): AmsCalculation {
  const expenseRate =
    expenseType === "standard"
      ? AMS_RATES.standard_expense_deduction
      : expenseType === "author"
      ? AMS_RATES.author_expense_deduction
      : 0;

  const expenseAmount = gross * expenseRate;
  const taxableBase = gross - expenseAmount;
  const healthContribution = taxableBase * AMS_RATES.health_contribution;
  const incomeTax = (taxableBase - healthContribution) * AMS_RATES.income_tax;
  const netPayment = gross - healthContribution - incomeTax;

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
