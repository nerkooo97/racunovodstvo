"use server";

import { requireActiveOrganization } from "@/lib/organization/server";
import { assertFeature } from "@/lib/organization/regime";

export interface PartnerBalance {
  partner_id: string;
  partner_name: string;
  partner_tax_id: string | null;
  partner_type: string;
  total_debit: number;
  total_credit: number;
  balance: number;
}

export interface PartnerCardLine {
  line_id: string;
  entry_date: string;
  entry_number: string;
  source_type: string;
  journal_description: string;
  account_code: string;
  account_name: string;
  line_description: string | null;
  debit: number;
  credit: number;
  running_balance: number;
}

/** Lista svih partnera koji imaju knjiženja (saldakonti pregled). */
export async function getPartnerBalances(
  year?: number
): Promise<{ error?: string; data?: PartnerBalance[] }> {
  const { supabase, org } = await requireActiveOrganization();
  const check = assertFeature(org.type, "general_ledger");
  if (!check.ok) return { error: check.error };

  const from = year ? `${year}-01-01` : "2000-01-01";
  const to = year ? `${year}-12-31` : "2099-12-31";

  const { data, error } = await supabase
    .from("journal_lines")
    .select(
      `
      partner_id,
      debit,
      credit,
      partners!inner(id, name, tax_id, type),
      journal_entries!inner(entry_date)
    `
    )
    .eq("organization_id", org.id)
    .not("partner_id", "is", null)
    .gte("journal_entries.entry_date", from)
    .lte("journal_entries.entry_date", to);

  if (error) return { error: error.message };

  const map = new Map<string, PartnerBalance>();
  for (const row of data ?? []) {
    const partner = row.partners as unknown as { id: string; name: string; tax_id: string | null; type: string } | null;
    if (!partner || !row.partner_id) continue;

    const existing = map.get(row.partner_id) ?? {
      partner_id: partner.id,
      partner_name: partner.name,
      partner_tax_id: partner.tax_id ?? null,
      partner_type: partner.type,
      total_debit: 0,
      total_credit: 0,
      balance: 0,
    };
    existing.total_debit += Number(row.debit) || 0;
    existing.total_credit += Number(row.credit) || 0;
    existing.balance = existing.total_debit - existing.total_credit;
    map.set(row.partner_id, existing);
  }

  return {
    data: Array.from(map.values()).sort((a, b) =>
      a.partner_name.localeCompare(b.partner_name)
    ),
  };
}

/** Kartica konkretnog partnera — hronološke stavke s tekućim saldom. */
export async function getPartnerCard(
  partnerId: string,
  year?: number
): Promise<{ error?: string; partner?: { name: string; tax_id: string | null; type: string }; lines?: PartnerCardLine[] }> {
  const { supabase, org } = await requireActiveOrganization();
  const check = assertFeature(org.type, "general_ledger");
  if (!check.ok) return { error: check.error };

  const { data: partner } = await supabase
    .from("partners")
    .select("name, tax_id, type")
    .eq("id", partnerId)
    .eq("organization_id", org.id)
    .single();

  if (!partner) return { error: "Partner nije pronađen." };

  const from = year ? `${year}-01-01` : "2000-01-01";
  const to = year ? `${year}-12-31` : "2099-12-31";

  const { data, error } = await supabase
    .from("journal_lines")
    .select(
      `
      id,
      account_code,
      account_name,
      description,
      debit,
      credit,
      journal_entries!inner(
        entry_date,
        entry_number,
        source_type,
        description
      )
    `
    )
    .eq("organization_id", org.id)
    .eq("partner_id", partnerId)
    .gte("journal_entries.entry_date", from)
    .lte("journal_entries.entry_date", to)
    .order("journal_entries.entry_date", { ascending: true })
    .order("journal_entries.entry_number", { ascending: true });

  if (error) return { error: error.message };

  let runningBalance = 0;
  const lines: PartnerCardLine[] = (data ?? []).map((row) => {
    const entry = row.journal_entries as unknown as {
      entry_date: string;
      entry_number: string;
      source_type: string;
      description: string;
    } | null;
    const debit = Number(row.debit) || 0;
    const credit = Number(row.credit) || 0;
    runningBalance += debit - credit;

    return {
      line_id: row.id,
      entry_date: entry?.entry_date ?? "",
      entry_number: entry?.entry_number ?? "",
      source_type: entry?.source_type ?? "manual",
      journal_description: entry?.description ?? "",
      account_code: row.account_code,
      account_name: row.account_name,
      line_description: row.description ?? null,
      debit,
      credit,
      running_balance: runningBalance,
    };
  });

  return { partner, lines };
}

/** Otvorene stavke za IOS (nenaplaćene/neizmirene po izvoru). */
export async function getPartnerOpenItems(
  partnerId: string,
  asOfDate: string
): Promise<{ error?: string; partner?: { name: string; tax_id: string | null; type: string }; items?: Array<{ source_type: string; description: string; entry_date: string; debit: number; credit: number; balance: number }> }> {
  const { supabase, org } = await requireActiveOrganization();
  const check = assertFeature(org.type, "general_ledger");
  if (!check.ok) return { error: check.error };

  const { data: partner } = await supabase
    .from("partners")
    .select("name, tax_id, type")
    .eq("id", partnerId)
    .eq("organization_id", org.id)
    .single();

  if (!partner) return { error: "Partner nije pronađen." };

  const { data, error } = await supabase
    .from("journal_lines")
    .select(
      `
      debit, credit,
      journal_entries!inner(
        id,
        entry_date,
        source_type,
        description
      )
    `
    )
    .eq("organization_id", org.id)
    .eq("partner_id", partnerId)
    .lte("journal_entries.entry_date", asOfDate);

  if (error) return { error: error.message };

  // Grupiše po izvoru (journal_entry) i prikazuje samo one s otvorenim saldom
  const byEntry = new Map<string, { source_type: string; description: string; entry_date: string; debit: number; credit: number }>();
  for (const row of data ?? []) {
    const entry = row.journal_entries as unknown as { id: string; entry_date: string; source_type: string; description: string } | null;
    if (!entry) continue;
    const existing = byEntry.get(entry.id) ?? {
      source_type: entry.source_type,
      description: entry.description,
      entry_date: entry.entry_date,
      debit: 0,
      credit: 0,
    };
    existing.debit += Number(row.debit) || 0;
    existing.credit += Number(row.credit) || 0;
    byEntry.set(entry.id, existing);
  }

  const items = Array.from(byEntry.values())
    .map((e) => ({ ...e, balance: e.debit - e.credit }))
    .filter((e) => Math.abs(e.balance) > 0.01)
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date));

  return { partner, items };
}
