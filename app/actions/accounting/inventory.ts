"use server";

import { revalidatePath } from "next/cache";
import { requireActiveOrganization } from "@/lib/organization/server";
import { assertFeature } from "@/lib/organization/regime";
import { round2 } from "@/lib/pdv/amounts";
import { POSTING_ACCOUNTS } from "@/lib/accounting/standard-chart";
import { postJournalEntry } from "./journal";
import { ensureChartOfAccounts } from "./accounts";

export interface InventoryStatus {
  year: number;
  /** Knjigovodstveno stanje konta 1300 (početno + nabavke − razduženja) */
  bookBalance: number;
  /** Da li je razduženje za godinu već proknjiženo */
  alreadyAdjusted: boolean;
}

/** Stanje zaliha robe (konto 1300) za godinu iz glavne knjige. */
export async function getInventoryStatus(
  year: number
): Promise<{ error?: string; data?: InventoryStatus }> {
  const { supabase, org } = await requireActiveOrganization();
  const check = assertFeature(org.type, "general_ledger");
  if (!check.ok) return { error: check.error };

  const [{ data: lines }, { count }] = await Promise.all([
    supabase
      .from("journal_lines")
      .select("debit, credit, journal_entries!inner(period_year)")
      .eq("organization_id", org.id)
      .eq("account_code", POSTING_ACCOUNTS.goodsInventory)
      .lte("journal_entries.period_year", year),
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("source_id", `inventory-adj-${year}-${org.id}`),
  ]);

  let balance = 0;
  for (const l of lines ?? []) {
    balance += (Number(l.debit) || 0) - (Number(l.credit) || 0);
  }

  return {
    data: {
      year,
      bookBalance: round2(balance),
      alreadyAdjusted: (count ?? 0) > 0,
    },
  };
}

/**
 * Razduženje zaliha nakon popisa (inventure) — periodični sistem po MRS 2:
 * nabavna vrijednost prodate robe = knjigovodstveno stanje − stanje po popisu.
 * Knjiži D 5010 (Nabavna vrijednost prodate robe) / P 1300 (Zalihe robe)
 * na 31.12. godine. Idempotentno po godini.
 */
export async function postInventoryAdjustment(
  year: number,
  closingStockValue: number
): Promise<{ error?: string; success?: boolean; costOfGoodsSold?: number }> {
  const { supabase, user, org } = await requireActiveOrganization();
  const check = assertFeature(org.type, "general_ledger");
  if (!check.ok) return { error: check.error };

  const closing = round2(closingStockValue);
  if (closing < 0) return { error: "Stanje po popisu ne može biti negativno." };

  await ensureChartOfAccounts(supabase, org.id);

  const status = await getInventoryStatus(year);
  if (status.error || !status.data) return { error: status.error ?? "Greška." };
  if (status.data.alreadyAdjusted) {
    return { error: `Razduženje zaliha za ${year}. je već proknjiženo.` };
  }

  const bookBalance = status.data.bookBalance;
  const cogs = round2(bookBalance - closing);

  if (cogs < 0) {
    return {
      error: `Stanje po popisu (${closing.toFixed(2)} KM) je veće od knjigovodstvenog stanja konta 1300 (${bookBalance.toFixed(2)} KM). Provjerite jesu li sve nabavke robe proknjižene.`,
    };
  }
  if (cogs === 0) {
    return { error: "Nema razlike za razduženje — knjigovodstveno stanje jednako je popisu." };
  }

  const res = await postJournalEntry(supabase, org.id, user.id, {
    entry_date: `${year}-12-31`,
    description: `Razduženje zaliha po popisu — nabavna vrijednost prodate robe ${year}.`,
    source_type: "manual",
    source_id: `inventory-adj-${year}-${org.id}`,
    lines: [
      { account_code: POSTING_ACCOUNTS.costOfGoodsSold, debit: cogs, credit: 0 },
      { account_code: POSTING_ACCOUNTS.goodsInventory, debit: 0, credit: cogs },
    ],
  });

  if (res.error) return { error: res.error };

  revalidatePath("/knjigovodstvo/dnevnik");
  revalidatePath("/knjigovodstvo/bruto-bilans");
  revalidatePath("/zakljucak-godine");
  return { success: true, costOfGoodsSold: cogs };
}
