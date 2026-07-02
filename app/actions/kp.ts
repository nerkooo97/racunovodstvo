"use server";

import { revalidatePath } from "next/cache";
import { assertFeature } from "@/lib/organization/regime";
import { requireActiveOrganization } from "@/lib/organization/server";

interface KpEntryInput {
  year: number;
  entry_date: string;
  document_number: string | null;
  document_type: string | null;
  cash_amount: number;
  noncash_amount: number;
  notes: string | null;
}

export async function addKpEntry(input: KpEntryInput): Promise<{ error?: string }> {
  const { supabase, org } = await requireActiveOrganization();
  const check = assertFeature(org.type, "kp");
  if (!check.ok) return { error: check.error };

  // Godina knjige se izvodi iz datuma stavke, ne iz klijentskog inputa
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.entry_date)) {
    return { error: "Neispravan datum stavke." };
  }
  const year = parseInt(input.entry_date.slice(0, 4), 10);

  const { data: last } = await supabase
    .from("kp_entries")
    .select("entry_number")
    .eq("organization_id", org.id)
    .eq("year", year)
    .order("entry_number", { ascending: false })
    .limit(1)
    .single();

  const nextNumber = (last?.entry_number ?? 0) + 1;

  const { error } = await supabase.from("kp_entries").insert({
    organization_id: org.id,
    entry_number: nextNumber,
    year,
    entry_date: input.entry_date,
    document_number: input.document_number,
    document_type: input.document_type,
    cash_amount: input.cash_amount,
    noncash_amount: input.noncash_amount,
    notes: input.notes,
  });

  if (error) return { error: error.message };

  revalidatePath("/kp");
  return {};
}

export async function deleteKpEntry(id: string): Promise<{ error?: string }> {
  const { supabase, org } = await requireActiveOrganization();
  const check = assertFeature(org.type, "kp");
  if (!check.ok) return { error: check.error };

  const { error } = await supabase
    .from("kp_entries")
    .delete()
    .eq("id", id)
    .eq("organization_id", org.id);

  if (error) return { error: error.message };

  revalidatePath("/kp");
  return {};
}
