"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireActiveOrganization } from "@/lib/organization/server";
import { assertFeature } from "@/lib/organization/regime";

export interface PeriodActionResult {
  error?: string;
  success?: boolean;
}

/** Vraća (i kreira ako ne postoji) red perioda. */
export async function ensurePeriod(
  supabase: SupabaseClient,
  orgId: string,
  year: number,
  month: number
): Promise<{ id: string; status: string } | null> {
  const { data: existing } = await supabase
    .from("pdv_periods")
    .select("id, status")
    .eq("organization_id", orgId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (existing) return existing as { id: string; status: string };

  const { data: created, error } = await supabase
    .from("pdv_periods")
    .insert({ organization_id: orgId, year, month })
    .select("id, status")
    .single();

  if (error) return null;
  return created as { id: string; status: string };
}

export async function isPeriodLocked(
  supabase: SupabaseClient,
  orgId: string,
  year: number,
  month: number
): Promise<boolean> {
  const { data } = await supabase
    .from("pdv_periods")
    .select("status")
    .eq("organization_id", orgId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();
  return data?.status === "locked" || data?.status === "submitted";
}

export async function lockPeriod(
  year: number,
  month: number
): Promise<PeriodActionResult> {
  const { supabase, user, org } = await requireActiveOrganization();
  const check = assertFeature(org.type, "pdv");
  if (!check.ok) return { error: check.error };

  await ensurePeriod(supabase, org.id, year, month);

  const { error } = await supabase
    .from("pdv_periods")
    .update({
      status: "locked",
      locked_at: new Date().toISOString(),
      locked_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", org.id)
    .eq("year", year)
    .eq("month", month);

  if (error) return { error: error.message };

  // Napomena: zaključavanje stavki se NE radi po koloni status, nego ga
  // osigurava okidač pdv_ledger_guard na osnovu statusa perioda (izbjegava
  // self-lock pri samom zaključavanju).

  revalidatePath("/pdv");
  revalidatePath(`/pdv/${year}/${month}`);
  return { success: true };
}

export async function unlockPeriod(
  year: number,
  month: number
): Promise<PeriodActionResult> {
  const { supabase, org } = await requireActiveOrganization();
  const check = assertFeature(org.type, "pdv");
  if (!check.ok) return { error: check.error };

  const { error } = await supabase
    .from("pdv_periods")
    .update({
      status: "open",
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", org.id)
    .eq("year", year)
    .eq("month", month);

  if (error) return { error: error.message };

  revalidatePath("/pdv");
  revalidatePath(`/pdv/${year}/${month}`);
  return { success: true };
}

/** Sljedeći redni broj u knjizi za dati tip i period. */
export async function nextSerialNumber(
  supabase: SupabaseClient,
  orgId: string,
  recordType: "kif" | "kuf",
  year: number,
  month: number
): Promise<number> {
  const { data } = await supabase
    .from("pdv_ledger_entries")
    .select("serial_number")
    .eq("organization_id", orgId)
    .eq("record_type", recordType)
    .eq("period_year", year)
    .eq("period_month", month)
    .order("serial_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.serial_number ?? 0) + 1;
}
