"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireActiveOrganization } from "@/lib/organization/server";
import { assertFeature } from "@/lib/organization/regime";
import { round2 } from "@/lib/pdv/amounts";
import { accountName } from "@/lib/accounting/standard-chart";
import type {
  JournalEntry,
  JournalLine,
  JournalLineInput,
  JournalSourceType,
} from "@/lib/accounting/types";
import { ensureChartOfAccounts } from "./accounts";

interface PostJournalInput {
  entry_date: string;
  description: string;
  source_type: JournalSourceType;
  source_id?: string | null;
  lines: JournalLineInput[];
}

/**
 * Knjiženje kroz atomsku RPC funkciju (jedna transakcija: broj naloga + zaglavlje
 * + stavke + ravnoteža + idempotencija po source_id). Ne radi auth provjeru na
 * app nivou — RPC provjerava vlasništvo organizacije.
 */
export async function postJournalEntry(
  supabase: SupabaseClient,
  orgId: string,
  userId: string | null,
  input: PostJournalInput
): Promise<{ error?: string; id?: string; skipped?: boolean }> {
  const lines = input.lines.filter(
    (l) => round2(l.debit) !== 0 || round2(l.credit) !== 0
  );
  if (lines.length < 2) {
    return { error: "Nalog mora imati najmanje dvije stavke." };
  }

  const totalDebit = round2(lines.reduce((s, l) => s + (l.debit || 0), 0));
  const totalCredit = round2(lines.reduce((s, l) => s + (l.credit || 0), 0));
  if (totalDebit !== totalCredit) {
    return {
      error: `Nalog nije u ravnoteži: duguje ${totalDebit.toFixed(2)} ≠ potražuje ${totalCredit.toFixed(2)}.`,
    };
  }
  if (totalDebit === 0) return { error: "Iznos naloga ne može biti nula." };

  const { data, error } = await supabase.rpc("post_journal_entry", {
    p_org_id: orgId,
    p_user_id: userId,
    p_entry_date: input.entry_date,
    p_description: input.description,
    p_source_type: input.source_type,
    p_source_id: input.source_id ?? null,
    p_lines: lines.map((l, i) => ({
      account_code: l.account_code,
      account_name: l.account_name || accountName(l.account_code),
      description: l.description ?? null,
      debit: round2(l.debit || 0),
      credit: round2(l.credit || 0),
      sort_order: l.sort_order ?? i,
      partner_id: l.partner_id ?? null,
    })),
  });

  if (error) return { error: error.message };
  const res = data as { id: string; entry_number: string; skipped: boolean };
  return { id: res.id, skipped: res.skipped };
}

const LineSchema = z.object({
  account_code: z.string().regex(/^\d{1,6}$/, "Šifra konta 1–6 cifara."),
  description: z.string().optional(),
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
});

const JournalSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neispravan datum."),
  description: z.string().optional().default(""),
  lines: z.array(LineSchema).min(2, "Najmanje dvije stavke."),
});

export type JournalInput = z.input<typeof JournalSchema>;

/** Ručni nalog za knjiženje. */
export async function createJournalEntry(
  input: JournalInput
): Promise<{ error?: string; success?: boolean; id?: string }> {
  const { supabase, user, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "general_ledger");
  if (!feature.ok) return { error: feature.error };

  const parsed = JournalSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravan unos." };
  }
  const d = parsed.data;

  await ensureChartOfAccounts(supabase, org.id);

  const res = await postJournalEntry(supabase, org.id, user.id, {
    entry_date: d.entry_date,
    description: d.description,
    source_type: "manual",
    lines: d.lines.map((l) => ({
      account_code: l.account_code,
      description: l.description ?? null,
      debit: l.debit,
      credit: l.credit,
    })),
  });

  if (res.error) return { error: res.error };
  revalidatePath("/knjigovodstvo/dnevnik");
  return { success: true, id: res.id };
}

/**
 * Ručni nalozi se smiju obrisati (ispravka unosa u otvorenom periodu).
 * Automatski nalozi (PDV, banka, plate, zaključak) se NE brišu — rade se stornom,
 * čime izvorni nalog i revizijski trag ostaju u dnevniku (ZRR FBiH 15/21).
 */
export async function deleteJournalEntry(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const { supabase, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "general_ledger");
  if (!feature.ok) return { error: feature.error };

  const { data: entry } = await supabase
    .from("journal_entries")
    .select("id, source_type")
    .eq("id", id)
    .eq("organization_id", org.id)
    .single();

  if (!entry) return { error: "Nalog nije pronađen." };
  if (entry.source_type !== "manual") {
    return {
      error:
        "Automatski nalozi se ne brišu — koristite storno (obrnuti nalog ostaje u dnevniku).",
    };
  }

  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", id)
    .eq("organization_id", org.id);

  if (error) return { error: error.message };
  revalidatePath("/knjigovodstvo/dnevnik");
  return { success: true };
}

/** Storno naloga: kreira obrnuti nalog, izvorni ostaje netaknut. */
export async function reverseJournalEntry(
  id: string
): Promise<{ error?: string; success?: boolean; id?: string }> {
  const { supabase, user, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "general_ledger");
  if (!feature.ok) return { error: feature.error };

  const { data, error } = await supabase.rpc("reverse_journal_entry", {
    p_org_id: org.id,
    p_user_id: user.id,
    p_entry_id: id,
  });

  if (error) return { error: error.message };
  const res = data as { id: string; skipped: boolean };
  if (res.skipped) return { error: "Ovaj nalog je već storniran." };
  revalidatePath("/knjigovodstvo/dnevnik");
  return { success: true, id: res.id };
}

export interface JournalEntryWithLines extends JournalEntry {
  lines: JournalLine[];
}

export async function listJournalEntries(
  year: number
): Promise<{ error?: string; entries?: JournalEntryWithLines[] }> {
  const { supabase, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "general_ledger");
  if (!feature.ok) return { error: feature.error };

  const { data: entries, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("organization_id", org.id)
    .eq("period_year", year)
    .order("entry_date", { ascending: false })
    .order("entry_number", { ascending: false });

  if (error) return { error: error.message };

  const ids = (entries ?? []).map((e) => e.id);
  const { data: lines } = ids.length
    ? await supabase
        .from("journal_lines")
        .select("*")
        .in("journal_entry_id", ids)
        .order("sort_order", { ascending: true })
    : { data: [] as JournalLine[] };

  const byEntry = new Map<string, JournalLine[]>();
  for (const l of (lines ?? []) as JournalLine[]) {
    const arr = byEntry.get(l.journal_entry_id) ?? [];
    arr.push(l);
    byEntry.set(l.journal_entry_id, arr);
  }

  return {
    entries: (entries ?? []).map((e) => ({
      ...(e as JournalEntry),
      lines: byEntry.get(e.id) ?? [],
    })),
  };
}
