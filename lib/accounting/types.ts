/** Tipovi za glavnu knjigu (kontni plan, nalozi, stavke). */

export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "income"
  | "expense"
  | "offbalance";

export interface Account {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  account_class: number;
  account_type: AccountType;
  parent_code: string | null;
  is_synthetic: boolean;
  is_active: boolean;
}

export type JournalSourceType =
  | "manual"
  | "invoice_out"
  | "invoice_cn"
  | "purchase"
  | "jci"
  | "salary"
  | "bank"
  | "retail";

export interface JournalLineInput {
  account_code: string;
  account_name?: string;
  description?: string | null;
  debit: number;
  credit: number;
  sort_order?: number;
  /** Opciono — veže stavku naloga za konkretnog partnera (saldakonti, analitičke kartice). */
  partner_id?: string | null;
}

export interface JournalLine extends JournalLineInput {
  id: string;
  journal_entry_id: string;
}

export interface JournalEntry {
  id: string;
  organization_id: string;
  entry_number: string;
  entry_date: string;
  period_year: number;
  period_month: number;
  description: string;
  source_type: JournalSourceType;
  source_id: string | null;
  posted: boolean;
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  account_type: AccountType;
  debit: number;
  credit: number;
  balance: number; // debit - credit
}
