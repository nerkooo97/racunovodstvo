"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireActiveOrganization } from "@/lib/organization/server";
import { assertFeature } from "@/lib/organization/regime";
import {
  buildTrialBalance,
  type AccountMeta,
  type RawLine,
} from "@/lib/accounting/statements";
import { POSTING_ACCOUNTS } from "@/lib/accounting/standard-chart";
import { round2 } from "@/lib/pdv/amounts";
import { toLedgerEntry } from "@/lib/pdv/row";
import type { Account, TrialBalanceRow } from "@/lib/accounting/types";

async function loadAccountsMeta(
  supabase: SupabaseClient,
  orgId: string
): Promise<Map<string, AccountMeta>> {
  const { data } = await supabase
    .from("chart_of_accounts")
    .select("code, name, account_type")
    .eq("organization_id", orgId);
  const map = new Map<string, AccountMeta>();
  for (const a of (data ?? []) as Pick<Account, "code" | "name" | "account_type">[]) {
    map.set(a.code, { name: a.name, account_type: a.account_type });
  }
  return map;
}

/**
 * Bruto bilans za period (godina, opcionalno do uključivo mjeseca).
 */
export async function getTrialBalance(
  year: number,
  uptoMonth?: number
): Promise<{ error?: string; rows?: TrialBalanceRow[] }> {
  const { supabase, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "general_ledger");
  if (!feature.ok) return { error: feature.error };

  // Učitaj nalog → linije; filtriraj po periodu naloga
  let entryQuery = supabase
    .from("journal_entries")
    .select("id")
    .eq("organization_id", org.id)
    .eq("period_year", year);
  if (uptoMonth) entryQuery = entryQuery.lte("period_month", uptoMonth);

  const { data: entries } = await entryQuery;
  const ids = (entries ?? []).map((e) => e.id);

  if (ids.length === 0) return { rows: [] };

  const { data: lines, error } = await supabase
    .from("journal_lines")
    .select("account_code, account_name, debit, credit")
    .in("journal_entry_id", ids);

  if (error) return { error: error.message };

  const accounts = await loadAccountsMeta(supabase, org.id);
  const rows = buildTrialBalance((lines ?? []) as RawLine[], accounts);
  return { rows };
}

export interface AccountCardRow {
  entry_number: string;
  entry_date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

/** Kartica konta: hronološki promet i tekući saldo za jedan konto. */
export async function getAccountCard(
  code: string,
  year: number
): Promise<{ error?: string; rows?: AccountCardRow[]; name?: string }> {
  const { supabase, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "general_ledger");
  if (!feature.ok) return { error: feature.error };

  const { data: lines, error } = await supabase
    .from("journal_lines")
    .select(
      "debit, credit, account_name, journal_entries!inner(entry_number, entry_date, description, period_year, organization_id)"
    )
    .eq("organization_id", org.id)
    .eq("account_code", code)
    .eq("journal_entries.period_year", year);

  if (error) return { error: error.message };

  type Row = {
    debit: number;
    credit: number;
    account_name: string;
    journal_entries: {
      entry_number: string;
      entry_date: string;
      description: string;
    } | { entry_number: string; entry_date: string; description: string }[];
  };

  const flat = ((lines ?? []) as Row[]).map((l) => {
    const je = Array.isArray(l.journal_entries)
      ? l.journal_entries[0]
      : l.journal_entries;
    return {
      entry_number: je?.entry_number ?? "",
      entry_date: je?.entry_date ?? "",
      description: je?.description ?? "",
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      name: l.account_name,
    };
  });

  flat.sort((a, b) => a.entry_date.localeCompare(b.entry_date));

  let balance = 0;
  const rows: AccountCardRow[] = flat.map((f) => {
    balance += f.debit - f.credit;
    return {
      entry_number: f.entry_number,
      entry_date: f.entry_date,
      description: f.description,
      debit: f.debit,
      credit: f.credit,
      balance: Math.round(balance * 100) / 100,
    };
  });

  return { rows, name: flat[0]?.name ?? code };
}

export interface ReconciliationRow {
  label: string;
  pdv: number;
  gl: number;
  difference: number;
  ok: boolean;
}

/**
 * Usklađivanje PDV evidencija (KIF/KUF) i glavne knjige za period:
 * izlazni PDV ↔ konto 4700, odbitni pretporez ↔ konto 2700.
 */
export async function getPdvGlReconciliation(
  year: number,
  month: number
): Promise<{ error?: string; rows?: ReconciliationRow[] }> {
  const { supabase, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "general_ledger");
  if (!feature.ok) return { error: feature.error };

  // PDV strana
  const { data: rawEntries } = await supabase
    .from("pdv_ledger_entries")
    .select("*")
    .eq("organization_id", org.id)
    .eq("period_year", year)
    .eq("period_month", month);

  const entries = (rawEntries ?? []).map((r) =>
    toLedgerEntry(r as Record<string, unknown>)
  );
  const pdvOutputVat = round2(
    entries
      .filter((e) => e.record_type === "kif")
      .reduce((s, e) => s + e.kif_vat_registered + e.kif_vat_unregistered, 0)
  );
  const pdvInputVat = round2(
    entries
      .filter((e) => e.record_type === "kuf")
      .reduce((s, e) => s + e.kuf_vat_deductible, 0)
  );

  // GL strana
  const { data: glEntries } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("organization_id", org.id)
    .eq("period_year", year)
    .eq("period_month", month);
  const ids = (glEntries ?? []).map((e) => e.id);

  let glOutputVat = 0;
  let glInputVat = 0;

  if (ids.length > 0) {
    const { data: lines } = await supabase
      .from("journal_lines")
      .select("account_code, debit, credit")
      .in("journal_entry_id", ids)
      .in("account_code", [POSTING_ACCOUNTS.outputVat, POSTING_ACCOUNTS.inputVat]);

    for (const l of lines ?? []) {
      const debit = Number(l.debit) || 0;
      const credit = Number(l.credit) || 0;
      if (l.account_code === POSTING_ACCOUNTS.outputVat) {
        glOutputVat += credit - debit; // obaveza: kreditni saldo
      } else if (l.account_code === POSTING_ACCOUNTS.inputVat) {
        glInputVat += debit - credit; // potraživanje: debitni saldo
      }
    }
  }

  glOutputVat = round2(glOutputVat);
  glInputVat = round2(glInputVat);

  const rows: ReconciliationRow[] = [
    {
      label: `Izlazni PDV (KIF ↔ konto ${POSTING_ACCOUNTS.outputVat})`,
      pdv: pdvOutputVat,
      gl: glOutputVat,
      difference: round2(pdvOutputVat - glOutputVat),
      ok: round2(pdvOutputVat - glOutputVat) === 0,
    },
    {
      label: `Odbitni pretporez (KUF ↔ konto ${POSTING_ACCOUNTS.inputVat})`,
      pdv: pdvInputVat,
      gl: glInputVat,
      difference: round2(pdvInputVat - glInputVat),
      ok: round2(pdvInputVat - glInputVat) === 0,
    },
  ];

  return { rows };
}
