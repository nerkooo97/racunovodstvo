"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireActiveOrganization } from "@/lib/organization/server";
import { assertFeature } from "@/lib/organization/regime";
import { round2 } from "@/lib/pdv/amounts";
import { periodFromDateString } from "@/lib/pdv/period";
import { accountName } from "@/lib/accounting/standard-chart";
import type {
  JournalEntry,
  JournalLine,
  JournalLineInput,
  JournalSourceType,
} from "@/lib/accounting/types";
import { ensureChartOfAccounts } from "./accounts";

/** Sljedeći broj naloga za godinu (NAL-YYYY-NNN). */
export async function nextEntryNumber(
  supabase: SupabaseClient,
  orgId: string,
  year: number
): Promise<string> {
  const { count } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("period_year", year);
  const seq = (count ?? 0) + 1;
  return `NAL-${year}-${String(seq).padStart(4, "0")}`;
}

interface PostJournalInput {
  entry_date: string;
  description: string;
  source_type: JournalSourceType;
  source_id?: string | null;
  lines: JournalLineInput[];
}

/**
 * Interno knjiženje (koristi se i iz automatskih pravila). Ne radi auth provjeru —
 * pozivalac mora osigurati ovlaštenje. Provjerava ravnotežu duguje/potražuje.
 */
export async function postJournalEntry(
  supabase: SupabaseClient,
  orgId: string,
  userId: string | null,
  input: PostJournalInput
): Promise<{ error?: string; id?: string }> {
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

  const period = periodFromDateString(input.entry_date);
  const entryNumber = await nextEntryNumber(supabase, orgId, period.year);

  const { data: entry, error: entryErr } = await supabase
    .from("journal_entries")
    .insert({
      organization_id: orgId,
      entry_number: entryNumber,
      entry_date: input.entry_date,
      period_year: period.year,
      period_month: period.month,
      description: input.description,
      source_type: input.source_type,
      source_id: input.source_id ?? null,
      posted: true,
      created_by: userId,
    })
    .select("id")
    .single();

  if (entryErr || !entry) {
    return { error: entryErr?.message ?? "Greška pri kreiranju naloga." };
  }

  const lineRows = lines.map((l, i) => ({
    journal_entry_id: entry.id,
    organization_id: orgId,
    account_code: l.account_code,
    account_name: l.account_name || accountName(l.account_code),
    description: l.description ?? null,
    debit: round2(l.debit || 0),
    credit: round2(l.credit || 0),
    sort_order: l.sort_order ?? i,
  }));

  const { error: linesErr } = await supabase
    .from("journal_lines")
    .insert(lineRows);

  if (linesErr) {
    await supabase.from("journal_entries").delete().eq("id", entry.id);
    return { error: linesErr.message };
  }

  return { id: entry.id };
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

export async function deleteJournalEntry(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const { supabase, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "general_ledger");
  if (!feature.ok) return { error: feature.error };

  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", id)
    .eq("organization_id", org.id);

  if (error) return { error: error.message };
  revalidatePath("/knjigovodstvo/dnevnik");
  return { success: true };
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
