"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireActiveOrganization } from "@/lib/organization/server";
import { assertFeature } from "@/lib/organization/regime";
import { STANDARD_CHART } from "@/lib/accounting/standard-chart";
import type { Account } from "@/lib/accounting/types";

/** Inicijalizuje standardni kontni plan ako organizacija još nema konta. */
export async function ensureChartOfAccounts(
  supabase: SupabaseClient,
  orgId: string
): Promise<void> {
  const { count } = await supabase
    .from("chart_of_accounts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);

  if ((count ?? 0) > 0) return;

  const rows = STANDARD_CHART.map((a) => ({
    organization_id: orgId,
    code: a.code,
    name: a.name,
    account_class: a.account_class,
    account_type: a.account_type,
    parent_code: a.parent_code ?? null,
    is_synthetic: a.is_synthetic ?? false,
  }));

  await supabase.from("chart_of_accounts").insert(rows);
}

export async function listAccounts(): Promise<{
  error?: string;
  accounts?: Account[];
}> {
  const { supabase, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "general_ledger");
  if (!feature.ok) return { error: feature.error };

  await ensureChartOfAccounts(supabase, org.id);

  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("organization_id", org.id)
    .order("code", { ascending: true });

  if (error) return { error: error.message };
  return { accounts: (data ?? []) as Account[] };
}

const AccountSchema = z.object({
  code: z.string().regex(/^\d{1,6}$/, "Šifra mora biti 1–6 cifara."),
  name: z.string().min(1, "Naziv je obavezan."),
  account_type: z.enum([
    "asset",
    "liability",
    "equity",
    "income",
    "expense",
    "offbalance",
  ]),
  parent_code: z.string().optional().default(""),
  is_synthetic: z.boolean().default(false),
});

export type AccountInput = z.input<typeof AccountSchema>;

export async function createAccount(
  input: AccountInput
): Promise<{ error?: string; success?: boolean }> {
  const { supabase, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "general_ledger");
  if (!feature.ok) return { error: feature.error };

  const parsed = AccountSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravan unos." };
  }
  const d = parsed.data;

  const { error } = await supabase.from("chart_of_accounts").insert({
    organization_id: org.id,
    code: d.code,
    name: d.name,
    account_class: parseInt(d.code[0], 10),
    account_type: d.account_type,
    parent_code: d.parent_code || null,
    is_synthetic: d.is_synthetic,
  });

  if (error) {
    if (error.code === "23505") return { error: "Konto s tom šifrom već postoji." };
    return { error: error.message };
  }

  revalidatePath("/knjigovodstvo/kontni-plan");
  return { success: true };
}

export async function updateAccount(
  id: string,
  input: { name: string; is_active: boolean }
): Promise<{ error?: string; success?: boolean }> {
  const { supabase, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "general_ledger");
  if (!feature.ok) return { error: feature.error };

  if (!input.name.trim()) return { error: "Naziv je obavezan." };

  const { error } = await supabase
    .from("chart_of_accounts")
    .update({
      name: input.name,
      is_active: input.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", org.id);

  if (error) return { error: error.message };
  revalidatePath("/knjigovodstvo/kontni-plan");
  return { success: true };
}
