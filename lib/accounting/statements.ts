/**
 * Agregacije za izvještaje glavne knjige: bruto bilans, bilans uspjeha,
 * bilans stanja. Sve funkcije su čiste (bez baze).
 */

import { round2 } from "@/lib/pdv/amounts";
import type { AccountType, TrialBalanceRow } from "./types";

export interface RawLine {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}

export interface AccountMeta {
  name: string;
  account_type: AccountType;
}

/** Bruto bilans: promet i saldo po kontu. */
export function buildTrialBalance(
  lines: RawLine[],
  accounts: Map<string, AccountMeta>
): TrialBalanceRow[] {
  const agg = new Map<string, { debit: number; credit: number; name: string }>();

  for (const l of lines) {
    const cur = agg.get(l.account_code) ?? {
      debit: 0,
      credit: 0,
      name: l.account_name || accounts.get(l.account_code)?.name || l.account_code,
    };
    cur.debit += Number(l.debit) || 0;
    cur.credit += Number(l.credit) || 0;
    agg.set(l.account_code, cur);
  }

  const rows: TrialBalanceRow[] = [];
  for (const [code, v] of agg) {
    const meta = accounts.get(code);
    rows.push({
      code,
      name: v.name,
      account_type: meta?.account_type ?? inferType(code),
      debit: round2(v.debit),
      credit: round2(v.credit),
      balance: round2(v.debit - v.credit),
    });
  }

  rows.sort((a, b) => a.code.localeCompare(b.code));
  return rows;
}

/** Gruba procjena tipa konta iz klase (kad nema meta podataka). */
function inferType(code: string): AccountType {
  switch (code[0]) {
    case "0":
    case "1":
    case "2":
      return "asset";
    case "3":
      return "equity";
    case "4":
      return "liability";
    case "5":
      return "expense";
    case "6":
      return "income";
    default:
      return "offbalance";
  }
}

export interface StatementRow {
  code: string;
  name: string;
  amount: number;
}

export interface IncomeStatement {
  revenueRows: StatementRow[];
  expenseRows: StatementRow[];
  totalRevenue: number;
  totalExpenses: number;
  result: number; // dobit (+) ili gubitak (−)
}

export function buildIncomeStatement(tb: TrialBalanceRow[]): IncomeStatement {
  const revenueRows: StatementRow[] = [];
  const expenseRows: StatementRow[] = [];

  for (const r of tb) {
    if (r.account_type === "income") {
      const amount = round2(r.credit - r.debit); // prihodi: kreditni saldo
      if (amount !== 0) revenueRows.push({ code: r.code, name: r.name, amount });
    } else if (r.account_type === "expense") {
      const amount = round2(r.debit - r.credit); // rashodi: debitni saldo
      if (amount !== 0) expenseRows.push({ code: r.code, name: r.name, amount });
    }
  }

  const totalRevenue = round2(revenueRows.reduce((s, r) => s + r.amount, 0));
  const totalExpenses = round2(expenseRows.reduce((s, r) => s + r.amount, 0));

  return {
    revenueRows,
    expenseRows,
    totalRevenue,
    totalExpenses,
    result: round2(totalRevenue - totalExpenses),
  };
}

export interface BalanceSheet {
  assetRows: StatementRow[];
  liabilityRows: StatementRow[];
  equityRows: StatementRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  /** Rezultat poslovanja (prenosi se u kapital). */
  result: number;
  /** Aktiva − (pasiva + kapital + rezultat); treba biti 0. */
  difference: number;
}

export function buildBalanceSheet(
  tb: TrialBalanceRow[],
  result: number
): BalanceSheet {
  const assetRows: StatementRow[] = [];
  const liabilityRows: StatementRow[] = [];
  const equityRows: StatementRow[] = [];

  for (const r of tb) {
    if (r.account_type === "asset") {
      const amount = round2(r.debit - r.credit);
      if (amount !== 0) assetRows.push({ code: r.code, name: r.name, amount });
    } else if (r.account_type === "liability") {
      const amount = round2(r.credit - r.debit);
      if (amount !== 0) liabilityRows.push({ code: r.code, name: r.name, amount });
    } else if (r.account_type === "equity") {
      const amount = round2(r.credit - r.debit);
      if (amount !== 0) equityRows.push({ code: r.code, name: r.name, amount });
    }
  }

  const totalAssets = round2(assetRows.reduce((s, r) => s + r.amount, 0));
  const totalLiabilities = round2(
    liabilityRows.reduce((s, r) => s + r.amount, 0)
  );
  const totalEquity = round2(equityRows.reduce((s, r) => s + r.amount, 0));

  // Pasiva = obaveze + kapital + neraspoređeni rezultat tekućeg perioda
  const difference = round2(
    totalAssets - (totalLiabilities + totalEquity + result)
  );

  return {
    assetRows,
    liabilityRows,
    equityRows,
    totalAssets,
    totalLiabilities,
    totalEquity,
    result,
    difference,
  };
}
