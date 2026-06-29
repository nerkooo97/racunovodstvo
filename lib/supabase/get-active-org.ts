import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getActiveOrgId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get("active_org_id")?.value;

  if (cookieOrgId) {
    const { data } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", cookieOrgId)
      .eq("owner_id", userId)
      .single();

    if (data) return data.id;
  }

  const { data } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  return data?.id ?? null;
}
