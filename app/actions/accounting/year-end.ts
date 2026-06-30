"use server";

import { revalidatePath } from "next/cache";
import { requireActiveOrganization } from "@/lib/organization/server";
import { assertFeature } from "@/lib/organization/regime";
import { round2 } from "@/lib/pdv/amounts";
import { POSTING_ACCOUNTS } from "@/lib/accounting/standard-chart";
import { postJournalEntry } from "./journal";
import { ensureChartOfAccounts } from "./accounts";

export interface YearEndSummary {
  year: number;
  totalRevenue: number;
  totalExpenses: number;
  accountingProfit: number;
  alreadyClosed: boolean;
}

/** Dohvata sažetak prihoda/rashoda za godinu iz GK. */
export async function getYearEndSummary(year: number): Promise<{ error?: string; data?: YearEndSummary }> {
  const { supabase, org } = await requireActiveOrganization();
  const check = assertFeature(org.type, "general_ledger");
  if (!check.ok) return { error: check.error };

  const { data: lines } = await supabase
    .from("journal_lines")
    .select("account_code, debit, credit, journal_entries!inner(period_year, source_type)")
    .eq("organization_id", org.id)
    .eq("journal_entries.period_year", year);

  let totalRevenue = 0;
  let totalExpenses = 0;
  let alreadyClosed = false;

  for (const line of lines ?? []) {
    const entry = line.journal_entries as unknown as { period_year: number; source_type: string };
    const code = line.account_code as string;
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;

    // Provjera da li je već zaključena (postoji li 7100/7120/7200 stavka)
    if (code.startsWith("720") || code.startsWith("712") || code.startsWith("710")) {
      alreadyClosed = true;
    }

    if (code.startsWith("6")) totalRevenue += credit - debit;
    if (code.startsWith("5")) totalExpenses += debit - credit;
  }

  return {
    data: {
      year,
      totalRevenue: round2(totalRevenue),
      totalExpenses: round2(totalExpenses),
      accountingProfit: round2(totalRevenue - totalExpenses),
      alreadyClosed,
    },
  };
}

/**
 * Zaključak poslovne godine — 4 naloga na datum 31.12.year:
 *   1. Zatvaranje klase 6 (prihodi → 7120)
 *   2. Zatvaranje klase 5 (rashodi ← 7100)
 *   3. Utvrđivanje rezultata (7100 + 7120 → 7200) + porez na dobit (7210 → 4820)
 *   4. Prenos rezultata na kapital (7260 → 3410 dobit / 3510 → 7260 gubitak)
 */
export async function closeYear(
  year: number,
  corporateTaxAmount: number
): Promise<{ error?: string; success?: boolean }> {
  const { supabase, user, org } = await requireActiveOrganization();
  const check = assertFeature(org.type, "general_ledger");
  if (!check.ok) return { error: check.error };

  await ensureChartOfAccounts(supabase, org.id);

  const entryDate = `${year}-12-31`;
  const sourcePrefix = `year-end-${year}-${org.id}`;

  // Provjeri idempotenciju
  const { count } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .eq("source_id", `${sourcePrefix}-1`);
  if ((count ?? 0) > 0) return { error: `Godina ${year}. je već zaključena.` };

  // ─── Dohvati salde klase 5 i 6 ──────────────────────────────────────────
  const { data: lines } = await supabase
    .from("journal_lines")
    .select("account_code, debit, credit, journal_entries!inner(period_year)")
    .eq("organization_id", org.id)
    .eq("journal_entries.period_year", year);

  // Agregujem po kontu
  const balances = new Map<string, number>(); // pozitivno = prirodna strana
  for (const line of lines ?? []) {
    const code = line.account_code as string;
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;
    // Preskočimo klasu 7 (zaključak konta)
    if (code.startsWith("7")) continue;
    const existing = balances.get(code) ?? 0;
    // Prihodi (kl. 6): prirodna strana = potražuje
    if (code.startsWith("6")) balances.set(code, existing + credit - debit);
    // Rashodi (kl. 5): prirodna strana = duguje
    else if (code.startsWith("5")) balances.set(code, existing + debit - credit);
  }

  const revenueAccounts = Array.from(balances.entries()).filter(([code]) => code.startsWith("6") && balances.get(code)! > 0);
  const expenseAccounts = Array.from(balances.entries()).filter(([code]) => code.startsWith("5") && balances.get(code)! > 0);

  const totalRevenue = round2(revenueAccounts.reduce((s, [, v]) => s + v, 0));
  const totalExpenses = round2(expenseAccounts.reduce((s, [, v]) => s + v, 0));
  const grossProfit = round2(totalRevenue - totalExpenses);
  const tax = round2(Math.max(0, corporateTaxAmount));
  const netResult = round2(grossProfit - tax);

  if (totalRevenue === 0 && totalExpenses === 0) {
    return { error: "Nema proknjiženih stavki za ovu godinu." };
  }

  // ─── Nalog 1: Zatvaranje prihoda (D 6xxx / P 7120) ──────────────────────
  if (revenueAccounts.length > 0) {
    const res = await postJournalEntry(supabase, org.id, user.id, {
      entry_date: entryDate,
      description: `Zaključak ${year}. — zatvaranje prihoda`,
      source_type: "manual",
      source_id: `${sourcePrefix}-1`,
      lines: [
        ...revenueAccounts.map(([code, bal], i) => ({
          account_code: code, debit: round2(bal), credit: 0, sort_order: i,
        })),
        { account_code: POSTING_ACCOUNTS.closingRevenues, debit: 0, credit: totalRevenue, sort_order: 99 },
      ],
    });
    if (res.error) return { error: `Nalog 1: ${res.error}` };
  }

  // ─── Nalog 2: Zatvaranje rashoda (D 7100 / P 5xxx) ──────────────────────
  if (expenseAccounts.length > 0) {
    const res = await postJournalEntry(supabase, org.id, user.id, {
      entry_date: entryDate,
      description: `Zaključak ${year}. — zatvaranje rashoda`,
      source_type: "manual",
      source_id: `${sourcePrefix}-2`,
      lines: [
        { account_code: POSTING_ACCOUNTS.closingExpenses, debit: totalExpenses, credit: 0, sort_order: 0 },
        ...expenseAccounts.map(([code, bal], i) => ({
          account_code: code, debit: 0, credit: round2(bal), sort_order: i + 1,
        })),
      ],
    });
    if (res.error) return { error: `Nalog 2: ${res.error}` };
  }

  // ─── Nalog 3: Utvrđivanje rezultata + porez na dobit ────────────────────
  {
    const lines3 = [];
    if (totalRevenue > 0) lines3.push({ account_code: POSTING_ACCOUNTS.closingRevenues, debit: totalRevenue, credit: 0, sort_order: 0 });
    if (totalExpenses > 0) lines3.push({ account_code: POSTING_ACCOUNTS.closingExpenses, debit: 0, credit: totalExpenses, sort_order: 1 });

    if (grossProfit > 0) {
      lines3.push({ account_code: POSTING_ACCOUNTS.netResult, debit: 0, credit: grossProfit, sort_order: 2 });
    } else if (grossProfit < 0) {
      lines3.push({ account_code: POSTING_ACCOUNTS.netResult, debit: Math.abs(grossProfit), credit: 0, sort_order: 2 });
    }

    if (tax > 0) {
      lines3.push({ account_code: POSTING_ACCOUNTS.corporateTaxExpense, debit: tax, credit: 0, sort_order: 3 });
      lines3.push({ account_code: POSTING_ACCOUNTS.corporateTaxPayable, debit: 0, credit: tax, sort_order: 4 });
    }

    if (lines3.length >= 2) {
      const res = await postJournalEntry(supabase, org.id, user.id, {
        entry_date: entryDate,
        description: `Zaključak ${year}. — utvrđivanje rezultata`,
        source_type: "manual",
        source_id: `${sourcePrefix}-3`,
        lines: lines3,
      });
      if (res.error) return { error: `Nalog 3: ${res.error}` };
    }
  }

  // ─── Nalog 4: Prenos na kapital ──────────────────────────────────────────
  {
    const isProfit = netResult >= 0;
    const absResult = round2(Math.abs(netResult));

    if (absResult > 0) {
      const lines4 = isProfit
        ? [
            { account_code: POSTING_ACCOUNTS.netResult, debit: absResult, credit: 0, sort_order: 0 },
            { account_code: POSTING_ACCOUNTS.resultTransfer, debit: 0, credit: absResult, sort_order: 1 },
          ]
        : [
            { account_code: POSTING_ACCOUNTS.resultTransfer, debit: absResult, credit: 0, sort_order: 0 },
            { account_code: POSTING_ACCOUNTS.netResult, debit: 0, credit: absResult, sort_order: 1 },
          ];

      const res4 = await postJournalEntry(supabase, org.id, user.id, {
        entry_date: entryDate,
        description: `Zaključak ${year}. — prenos ${isProfit ? "dobiti" : "gubitka"} na kapital`,
        source_type: "manual",
        source_id: `${sourcePrefix}-4`,
        lines: lines4,
      });
      if (res4.error) return { error: `Nalog 4a: ${res4.error}` };

      const lines5 = isProfit
        ? [
            { account_code: POSTING_ACCOUNTS.resultTransfer, debit: absResult, credit: 0, sort_order: 0 },
            { account_code: POSTING_ACCOUNTS.retainedEarningsCurrentYear, debit: 0, credit: absResult, sort_order: 1 },
          ]
        : [
            { account_code: POSTING_ACCOUNTS.currentYearLoss, debit: absResult, credit: 0, sort_order: 0 },
            { account_code: POSTING_ACCOUNTS.resultTransfer, debit: 0, credit: absResult, sort_order: 1 },
          ];

      const res5 = await postJournalEntry(supabase, org.id, user.id, {
        entry_date: entryDate,
        description: `Zaključak ${year}. — ${isProfit ? "dobit" : "gubitak"} u kapitalu`,
        source_type: "manual",
        source_id: `${sourcePrefix}-5`,
        lines: lines5,
      });
      if (res5.error) return { error: `Nalog 4b: ${res5.error}` };
    }
  }

  revalidatePath("/knjigovodstvo/dnevnik");
  revalidatePath("/knjigovodstvo/bruto-bilans");
  revalidatePath(`/zakljucak-godine`);
  return { success: true };
}

/**
 * Otvaranje nove poslovne godine — nalog na datum 01.01.(year+1).
 * Prenosi saldo svih bilansnih konta (klase 0,1,2,3,4) putem konta 7000.
 */
export async function openYear(year: number): Promise<{ error?: string; success?: boolean }> {
  const { supabase, user, org } = await requireActiveOrganization();
  const check = assertFeature(org.type, "general_ledger");
  if (!check.ok) return { error: check.error };

  await ensureChartOfAccounts(supabase, org.id);

  const newYear = year + 1;
  const entryDate = `${newYear}-01-01`;
  const sourceId = `year-open-${newYear}-${org.id}`;

  const { count: existing } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .eq("source_id", sourceId);
  if ((existing ?? 0) > 0) return { error: `Nova ${newYear}. godina je već otvorena.` };

  // Svi redovi glavne knjige za `year`
  const { data: lines } = await supabase
    .from("journal_lines")
    .select("account_code, debit, credit, journal_entries!inner(period_year)")
    .eq("organization_id", org.id)
    .eq("journal_entries.period_year", year);

  // Neto saldo po kontu (samo klase 0-4 → bilansna konta)
  const netBalance = new Map<string, number>();
  for (const line of lines ?? []) {
    const code = line.account_code as string;
    if (!code.match(/^[01234]/)) continue;
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;
    netBalance.set(code, (netBalance.get(code) ?? 0) + debit - credit);
  }

  const activeBalances = Array.from(netBalance.entries()).filter(([, v]) => Math.abs(v) > 0.01);
  if (activeBalances.length === 0) {
    return { error: "Nema bilansnih stavki za prenos. Provjerite je li zaključak izvršen." };
  }

  const totalDebitActive = round2(activeBalances.filter(([, v]) => v > 0).reduce((s, [, v]) => s + v, 0));
  const totalCreditActive = round2(activeBalances.filter(([, v]) => v < 0).reduce((s, [, v]) => s + Math.abs(v), 0));

  // Aktiva (pozitivan saldo) duguje; pasiva (negativan saldo) potražuje
  const openingLines = activeBalances.map(([code, bal], i) => ({
    account_code: code,
    debit: bal > 0 ? round2(bal) : 0,
    credit: bal < 0 ? round2(Math.abs(bal)) : 0,
    sort_order: i,
  }));

  // Konto 7000 izravnava
  openingLines.push({
    account_code: POSTING_ACCOUNTS.openingEntry,
    debit: round2(totalCreditActive),
    credit: round2(totalDebitActive),
    sort_order: 999,
  });

  const res = await postJournalEntry(supabase, org.id, user.id, {
    entry_date: entryDate,
    description: `Otvaranje poslovnih knjiga ${newYear}.`,
    source_type: "manual",
    source_id: sourceId,
    lines: openingLines,
  });

  if (res.error) return { error: res.error };

  revalidatePath("/knjigovodstvo/dnevnik");
  revalidatePath(`/zakljucak-godine`);
  return { success: true };
}
