"use server";

import { revalidatePath } from "next/cache";
import { assertFeature } from "@/lib/organization/regime";
import { requireActiveOrganization } from "@/lib/organization/server";
import { POSTING_ACCOUNTS } from "@/lib/accounting/standard-chart";
import { postJournalEntry } from "./accounting/journal";
import { ensureChartOfAccounts } from "./accounting/accounts";

interface FixedAssetInput {
  name: string;
  asset_type: string;
  acquisition_date: string;
  document_number: string | null;
  acquisition_cost: number;
  depreciation_rate: number;
  useful_life_years: number;
  disposal_date: string | null;
  disposal_value: number | null;
  notes: string | null;
}

function annualDepreciation(
  acquisitionCost: number,
  rate: number,
  acquisitionDate: string,
  year: number
): { annual: number; accumulated: number; bookValue: number } {
  const acqYear = new Date(acquisitionDate).getFullYear();
  const yearsElapsed = year - acqYear + 1;
  const annual = Math.round(acquisitionCost * (rate / 100) * 100) / 100;
  const accumulated = Math.min(
    Math.round(annual * Math.max(0, yearsElapsed) * 100) / 100,
    acquisitionCost
  );
  const bookValue = Math.max(0, Math.round((acquisitionCost - accumulated) * 100) / 100);
  return { annual, accumulated, bookValue };
}

export async function addFixedAsset(
  input: FixedAssetInput
): Promise<{ id?: string; error?: string }> {
  const { supabase, org } = await requireActiveOrganization();
  const check = assertFeature(org.type, "fixed_assets");
  if (!check.ok) return { error: check.error };

  const { data, error } = await supabase
    .from("fixed_assets")
    .insert({
      organization_id: org.id,
      name: input.name,
      asset_type: input.asset_type,
      acquisition_date: input.acquisition_date,
      document_number: input.document_number,
      acquisition_cost: input.acquisition_cost,
      depreciation_rate: input.depreciation_rate,
      useful_life_years: input.useful_life_years,
      disposal_date: input.disposal_date,
      disposal_value: input.disposal_value,
      notes: input.notes,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Populate fixed_asset_years from acquisition year up to current year
  const currentYear = new Date().getFullYear();
  const acqYear = new Date(input.acquisition_date).getFullYear();
  const yearRows = [];

  for (let y = acqYear; y <= currentYear; y++) {
    const { annual, accumulated, bookValue } = annualDepreciation(
      input.acquisition_cost,
      input.depreciation_rate,
      input.acquisition_date,
      y
    );
    yearRows.push({
      asset_id: data.id,
      year: y,
      annual_amount: annual,
      accumulated,
      book_value: bookValue,
    });
  }

  if (yearRows.length > 0) {
    await supabase.from("fixed_asset_years").insert(yearRows);
  }

  revalidatePath("/dugotrajnaimovina");
  return { id: data.id };
}

export async function deleteFixedAsset(id: string): Promise<{ error?: string }> {
  const { supabase, org } = await requireActiveOrganization();
  const check = assertFeature(org.type, "fixed_assets");
  if (!check.ok) return { error: check.error };

  const { error } = await supabase
    .from("fixed_assets")
    .delete()
    .eq("id", id)
    .eq("organization_id", org.id);

  if (error) return { error: error.message };

  revalidatePath("/dugotrajnaimovina");
  return {};
}

/**
 * Kreira GK nalog za godišnji obračun amortizacije (DOO, idempotentno).
 * D 5400 (Amortizacija) / P 0290 (Ispravka vrijednosti opreme)
 */
export async function postDepreciationToGl(
  year: number
): Promise<{ error?: string; posted?: number; skipped?: boolean }> {
  const { supabase, user, org } = await requireActiveOrganization();
  const glCheck = assertFeature(org.type, "general_ledger");
  if (!glCheck.ok) return { error: glCheck.error };

  await ensureChartOfAccounts(supabase, org.id);

  // Idempotencija: source_id = `depreciation-{year}-{orgId}`
  const sourceId = `depreciation-${year}-${org.id}`;
  const { count } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .eq("source_id", sourceId);

  if ((count ?? 0) > 0) return { skipped: true };

  // Dohvati sve aktivne stavke za godinu
  const { data: yearRows } = await supabase
    .from("fixed_asset_years")
    .select("annual_amount, asset_id, fixed_assets!inner(organization_id, name, disposal_date)")
    .eq("year", year)
    .eq("fixed_assets.organization_id", org.id);

  const active = (yearRows ?? []).filter((r) => {
    const asset = r.fixed_assets as unknown as { disposal_date: string | null };
    return !asset?.disposal_date || asset.disposal_date > `${year}-12-31`;
  });

  if (active.length === 0) {
    return { error: `Nema aktivnih stalnih sredstava za ${year}. godinu.` };
  }

  const totalAmort = active.reduce((s, r) => s + Number(r.annual_amount), 0);
  if (totalAmort <= 0) return { error: "Iznos amortizacije je nula." };

  const rounded = Math.round(totalAmort * 100) / 100;

  const res = await postJournalEntry(supabase, org.id, user.id, {
    entry_date: `${year}-12-31`,
    description: `Amortizacija stalnih sredstava — ${year}.`,
    source_type: "manual",
    source_id: sourceId,
    lines: [
      { account_code: POSTING_ACCOUNTS.depreciationExpense, debit: rounded, credit: 0 },
      { account_code: POSTING_ACCOUNTS.accumulatedDepreciation, debit: 0, credit: rounded },
    ],
  });

  if (res.error) return { error: res.error };

  revalidatePath("/dugotrajnaimovina");
  revalidatePath("/knjigovodstvo/dnevnik");
  return { posted: active.length };
}
