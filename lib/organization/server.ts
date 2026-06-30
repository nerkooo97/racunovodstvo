import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import {
  assertFeature,
  hasFeature,
  normalizeOrgType,
  type OrgFeature,
  type OrgType,
} from "./regime";

export interface ActiveOrganization {
  id: string;
  name: string;
  type: OrgType;
  is_vat_registered: boolean;
  plan: string;
  tax_id: string | null;
}

export async function getActiveOrganization(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email?: string };
  org: ActiveOrganization;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const orgId = await getActiveOrgId(supabase, user.id);
  if (!orgId) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, type, is_vat_registered, plan, tax_id")
    .eq("id", orgId)
    .single();

  if (!org) return null;

  return {
    supabase,
    user: { id: user.id, email: user.email ?? undefined },
    org: {
      id: org.id,
      name: org.name,
      type: normalizeOrgType(org.type),
      is_vat_registered: org.is_vat_registered ?? false,
      plan: org.plan ?? "free",
      tax_id: org.tax_id ?? null,
    },
  };
}

/** Preusmjeri na login / nova djelatnost ako nema org */
export async function requireActiveOrganization() {
  const auth = await getActiveOrganization();
  if (!auth) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    redirect("/nova-djelatnost");
  }
  return auth;
}

/** Preusmjeri na /racunovodstvo ako org nema traženu mogućnost */
export async function requireOrgFeature(feature: OrgFeature) {
  const auth = await requireActiveOrganization();
  const check = assertFeature(auth.org.type, feature);
  if (!check.ok) redirect("/racunovodstvo");
  return auth;
}

export async function orgHasFeature(feature: OrgFeature): Promise<boolean> {
  const auth = await getActiveOrganization();
  if (!auth) return false;
  return hasFeature(auth.org.type, feature);
}
