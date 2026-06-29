import accountsData from "./cantonal-accounts.json";

export interface CantonalAccountInfo {
  cantonName: string;
  healthAccount: string;
  unemploymentAccount: string;
  budgetAccount: string; // Za vodnu i nesreće
}

export const CANTONAL_ACCOUNTS: Record<string, CantonalAccountInfo> = accountsData.cantonal;

export const FEDERAL_ACCOUNTS = accountsData.federal;

export function getCantonalAccounts(cantonName: string | null | undefined): CantonalAccountInfo {
  if (cantonName && CANTONAL_ACCOUNTS[cantonName]) {
    return CANTONAL_ACCOUNTS[cantonName];
  }
  // Default fallback
  return CANTONAL_ACCOUNTS["Tuzlanski kanton"];
}
