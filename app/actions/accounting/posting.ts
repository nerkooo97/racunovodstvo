"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireActiveOrganization } from "@/lib/organization/server";
import { assertFeature } from "@/lib/organization/regime";
import { toLedgerEntry } from "@/lib/pdv/row";
import { monthName } from "@/lib/pdv/period";
import {
  bankTxToLines,
  kifEntryToLines,
  kufEntryToLines,
  salaryToLines,
} from "@/lib/accounting/posting-rules";
import { ensureChartOfAccounts } from "./accounts";
import { postJournalEntry } from "./journal";

export interface PostingResult {
  error?: string;
  posted?: number;
  skipped?: number;
}

/** Vraća skup source_id-eva koji su već proknjiženi (idempotencija). */
async function existingSourceIds(
  supabase: SupabaseClient,
  orgId: string,
  sourceIds: string[]
): Promise<Set<string>> {
  if (sourceIds.length === 0) return new Set();
  const { data } = await supabase
    .from("journal_entries")
    .select("source_id")
    .eq("organization_id", orgId)
    .in("source_id", sourceIds);
  return new Set((data ?? []).map((r) => r.source_id as string));
}

/** Knjiži sve KIF i KUF stavke poreznog perioda u glavnu knjigu (idempotentno). */
export async function postPdvPeriodToGl(
  year: number,
  month: number
): Promise<PostingResult> {
  const { supabase, user, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "general_ledger");
  if (!feature.ok) return { error: feature.error };

  await ensureChartOfAccounts(supabase, org.id);

  const { data: rawEntries } = await supabase
    .from("pdv_ledger_entries")
    .select("*")
    .eq("organization_id", org.id)
    .eq("period_year", year)
    .eq("period_month", month)
    .order("record_type", { ascending: true })
    .order("serial_number", { ascending: true });

  const entries = (rawEntries ?? []).map((r) =>
    toLedgerEntry(r as Record<string, unknown>)
  );
  if (entries.length === 0) {
    return { error: "Nema PDV stavki za knjiženje u ovom periodu." };
  }

  const already = await existingSourceIds(
    supabase,
    org.id,
    entries.map((e) => e.id)
  );

  let posted = 0;
  let skipped = 0;

  for (const e of entries) {
    if (already.has(e.id)) {
      skipped++;
      continue;
    }

    const lines =
      e.record_type === "kif" ? kifEntryToLines(e) : kufEntryToLines(e);
    if (lines.length < 2) {
      skipped++;
      continue;
    }

    const sourceType =
      e.record_type === "kif"
        ? e.source_type === "invoice_cn"
          ? "invoice_cn"
          : "invoice_out"
        : e.uio_document_type === "04"
          ? "jci"
          : "purchase";

    const desc =
      e.record_type === "kif"
        ? `KIF ${e.serial_number}: ${e.document_number} — ${e.partner_name}`
        : `KUF ${e.serial_number}: ${e.document_number} — ${e.partner_name}`;

    const res = await postJournalEntry(supabase, org.id, user.id, {
      entry_date: e.document_date,
      description: desc,
      source_type: sourceType,
      source_id: e.id,
      lines,
    });

    if (res.error) return { error: `Greška pri knjiženju (${desc}): ${res.error}` };
    posted++;
  }

  revalidatePath("/knjigovodstvo/dnevnik");
  revalidatePath(`/pdv/${year}/${month}`);
  return { posted, skipped };
}

/** Knjiži sve transakcije jednog bankovnog izvoda u glavnu knjigu (idempotentno). */
export async function postBankStatementToGl(
  statementId: string
): Promise<PostingResult> {
  const { supabase, user, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "general_ledger");
  if (!feature.ok) return { error: feature.error };

  await ensureChartOfAccounts(supabase, org.id);

  const { data: stmt } = await supabase
    .from("bank_statements")
    .select("id, bank")
    .eq("id", statementId)
    .eq("organization_id", org.id)
    .single();

  if (!stmt) return { error: "Bankovni izvod nije pronađen." };

  const { data: txs } = await supabase
    .from("transactions")
    .select(
      "id, transaction_date, amount, direction, counterparty_name, partner_id, description"
    )
    .eq("statement_id", statementId)
    .eq("organization_id", org.id)
    .order("transaction_date", { ascending: true });

  if (!txs || txs.length === 0) {
    return { error: "Nema transakcija za knjiženje na ovom izvodu." };
  }

  const already = await existingSourceIds(
    supabase,
    org.id,
    txs.map((t) => t.id as string)
  );

  let posted = 0;
  let skipped = 0;

  for (const t of txs) {
    if (already.has(t.id as string)) {
      skipped++;
      continue;
    }

    const direction = t.direction === "credit" ? "credit" : "debit";
    const lines = bankTxToLines({
      direction,
      amount: Number(t.amount) || 0,
      has_partner: t.partner_id != null,
    });
    if (lines.length < 2) {
      skipped++;
      continue;
    }

    const party = t.counterparty_name ?? t.description ?? "";
    const desc =
      `Banka ${stmt.bank}: ${direction === "credit" ? "uplata" : "isplata"}` +
      (party ? ` — ${party}` : "");

    const res = await postJournalEntry(supabase, org.id, user.id, {
      entry_date: t.transaction_date as string,
      description: desc,
      source_type: "bank",
      source_id: t.id as string,
      lines,
    });

    if (res.error) {
      return { error: `Greška pri knjiženju (${desc}): ${res.error}` };
    }
    posted++;
  }

  revalidatePath("/knjigovodstvo/dnevnik");
  revalidatePath(`/bankovni-izvod/${statementId}`);
  return { posted, skipped };
}

/** Knjiži obračun plata (salary_period) u glavnu knjigu (jedan zbirni nalog). */
export async function postSalaryPeriodToGl(
  periodId: string
): Promise<PostingResult> {
  const { supabase, user, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "general_ledger");
  if (!feature.ok) return { error: feature.error };

  await ensureChartOfAccounts(supabase, org.id);

  const { data: period } = await supabase
    .from("salary_periods")
    .select("id, year, month")
    .eq("id", periodId)
    .eq("organization_id", org.id)
    .single();

  if (!period) return { error: "Obračun plata nije pronađen." };

  const already = await existingSourceIds(supabase, org.id, [periodId]);
  if (already.has(periodId)) {
    return { posted: 0, skipped: 1 };
  }

  const { data: items } = await supabase
    .from("salary_items")
    .select(
      "gross_salary, net_salary, income_tax, total_contributions_from, pension_contribution_on, health_contribution_on, unemployment_contribution_on, water_contribution, disaster_contribution, disability_fund"
    )
    .eq("period_id", periodId);

  if (!items || items.length === 0) {
    return { error: "Nema stavki obračuna za knjiženje." };
  }

  const agg = items.reduce(
    (acc, it) => {
      const onSum =
        (it.pension_contribution_on ?? 0) +
        (it.health_contribution_on ?? 0) +
        (it.unemployment_contribution_on ?? 0) +
        (it.water_contribution ?? 0) +
        (it.disaster_contribution ?? 0) +
        (it.disability_fund ?? 0);
      return {
        gross_salary: acc.gross_salary + (it.gross_salary ?? 0),
        net_salary: acc.net_salary + (it.net_salary ?? 0),
        income_tax: acc.income_tax + (it.income_tax ?? 0),
        contributions_from:
          acc.contributions_from + (it.total_contributions_from ?? 0),
        contributions_on: acc.contributions_on + onSum,
      };
    },
    {
      gross_salary: 0,
      net_salary: 0,
      income_tax: 0,
      contributions_from: 0,
      contributions_on: 0,
    }
  );

  const lines = salaryToLines(agg);
  const entryDate = new Date(period.year, period.month - 1, 1)
    .toISOString()
    .slice(0, 10);

  const res = await postJournalEntry(supabase, org.id, user.id, {
    entry_date: entryDate,
    description: `Obračun plata ${monthName(period.month)} ${period.year}`,
    source_type: "salary",
    source_id: periodId,
    lines,
  });

  if (res.error) return { error: res.error };

  revalidatePath("/knjigovodstvo/dnevnik");
  return { posted: 1, skipped: 0 };
}
