"use server";

import { revalidatePath } from "next/cache";
import { assertFeature } from "@/lib/organization/regime";
import { requireActiveOrganization } from "@/lib/organization/server";

interface KprEntryInput {
  year: number;
  entry_date: string;
  document_type: string;
  document_number: string | null;
  partner_id: string | null;
  partner_name: string | null;
  partner_tax_id: string | null;
  description: string | null;
  income_cash: number;
  income_bank: number;
  income_other: number;
  income_total: number;
  income_vat: number;
  expense_goods: number;
  expense_salaries: number;
  expense_contribs: number;
  expense_other: number;
  expense_total: number;
  expense_vat: number;
  debit: number;
  credit: number;
}

export async function addKprEntry(input: KprEntryInput): Promise<{ error?: string }> {
  const { supabase, org } = await requireActiveOrganization();
  const check = assertFeature(org.type, "kpr");
  if (!check.ok) return { error: check.error };

  // Godina knjige se IZVODI iz datuma stavke — klijentska vrijednost (cookie/tab)
  // može biti zastarjela, a stavka mora biti u knjizi godine svog datuma.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.entry_date)) {
    return { error: "Neispravan datum stavke." };
  }
  const year = parseInt(input.entry_date.slice(0, 4), 10);

  const { data: last } = await supabase
    .from("kpr_entries")
    .select("entry_number")
    .eq("organization_id", org.id)
    .eq("year", year)
    .order("entry_number", { ascending: false })
    .limit(1)
    .single();

  const nextNumber = (last?.entry_number ?? 0) + 1;

  const { error } = await supabase.from("kpr_entries").insert({
    organization_id: org.id,
    entry_number: nextNumber,
    year,
    entry_date: input.entry_date,
    document_type: input.document_type,
    document_number: input.document_number,
    partner_id: input.partner_id,
    partner_name: input.partner_name,
    partner_tax_id: input.partner_tax_id,
    description: input.description,
    income_cash: input.income_cash,
    income_bank: input.income_bank,
    income_other: input.income_other,
    income_total: input.income_total,
    income_vat: input.income_vat,
    expense_goods: input.expense_goods,
    expense_salaries: input.expense_salaries,
    expense_contribs: input.expense_contribs,
    expense_other: input.expense_other,
    expense_total: input.expense_total,
    expense_vat: input.expense_vat,
    debit: input.debit,
    credit: input.credit,
  });

  if (error) return { error: error.message };

  revalidatePath("/kpr");
  return {};
}
