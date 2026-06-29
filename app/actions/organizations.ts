"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { appCookieSecure } from "@/lib/supabase/cookie-options";

const createOrgSchema = z.object({
  name: z.string().min(1, "Naziv je obavezan"),
  type: z.enum(["obrt", "doo"]),
});

export async function createOrganization(formData: FormData) {
  console.log("createOrganization pozvan sa:", Object.fromEntries(formData.entries()));
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  
  console.log("createOrganization - getUser rezultat:", { user: user?.id, userError });
  
  if (!user) {
    console.log("createOrganization - Nema korisnika, redirect na /login");
    redirect("/login");
  }

  const parsed = createOrgSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });

  if (!parsed.success) {
    console.log("createOrganization - Validacija neuspješna:", parsed.error.issues);
    return { error: parsed.error.issues[0]?.message ?? "Nevažeći podaci." };
  }

  console.log("createOrganization - Pokušavam insert u bazu za user:", user.id);
  const { error } = await supabase.from("organizations").insert({
    name: parsed.data.name,
    type: parsed.data.type,
    owner_id: user.id,
  });

  if (error) {
    console.error("createOrganization greška pri insertu:", error);
    return {
      error:
        error.message.includes("relation") && error.message.includes("organizations")
          ? "Tabela organizations ne postoji — pokrenite SQL migracije na Supabaseu."
          : error.message || "Greška pri kreiranju djelatnosti.",
    };
  }

  console.log("createOrganization - Insert uspješan! Revalidacija /dashboard i redirect.");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

const updateOrgSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1, "Naziv je obavezan"),
  type: z.enum(["obrt", "doo"]),
  tax_id: z.string().max(13).nullable().optional(),
  vat_number: z.string().nullable().optional(),
  is_vat_registered: z.boolean(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  canton: z.string().nullable().optional(),
  municipality: z.string().nullable().optional(),
  municipality_code: z.string().nullable().optional(),
  activity_code: z.string().nullable().optional(),
  activity_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
  bank_account: z.string().nullable().optional(),
  bank_name: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  owner_tax_regime: z.enum(["STVARNI_DOHODAK", "PAUSALNI", "OSTALI"]).nullable().optional(),
  owner_activity_category: z.enum(["SLOBODNA_ZANIMANJA", "OBRT_SRODNE", "POLJOPRIVREDA_SUMARSTVO", "TRGOVAC_POJEDINAC"]).nullable().optional(),
});

export type UpdateOrgResult = { error: string } | { success: true; logo_url?: string };

export async function updateOrganization(
  formData: FormData
): Promise<UpdateOrgResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const raw = Object.fromEntries(formData.entries());
  const logoFile = formData.get("logo") as File | null;

  const parsed = updateOrgSchema.safeParse({
    ...raw,
    is_vat_registered: raw.is_vat_registered === "true",
    tax_id: raw.tax_id || null,
    vat_number: raw.vat_number || null,
    address: raw.address || null,
    city: raw.city || null,
    canton: raw.canton || null,
    municipality: raw.municipality || null,
    municipality_code: raw.municipality_code || null,
    activity_code: raw.activity_code || null,
    activity_name: raw.activity_name || null,
    phone: raw.phone || null,
    email: raw.email || null,
    bank_account: raw.bank_account || null,
    bank_name: raw.bank_name || null,
    owner_tax_regime: raw.owner_tax_regime || null,
    owner_activity_category: raw.owner_activity_category || null,
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    console.error("Validation error in updateOrganization:", parsed.error.format());
    return { error: firstError?.message ?? "Nevažeći podaci." };
  }

  const { orgId, ...fields } = parsed.data;

  let logo_url = fields.logo_url ?? null;

  if (logoFile && logoFile.size > 0) {
    const ext = logoFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${user.id}/${orgId}.${ext}`;
    const buffer = await logoFile.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(path, buffer, {
        contentType: logoFile.type,
        upsert: true,
      });

    if (uploadError) return { error: uploadError.message };

    logo_url = supabase.storage.from("logos").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase
    .from("organizations")
    .update({ ...fields, logo_url })
    .eq("id", orgId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profil");
  return { success: true, logo_url: logo_url ?? undefined };
}

export async function setActiveOrg(orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .eq("owner_id", user.id)
    .single();

  if (!org) return { error: "Organizacija nije pronađena" };

  const cookieStore = await cookies();
  cookieStore.set("active_org_id", orgId, {
    httpOnly: true,
    secure: appCookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/", "layout");
}

export async function selectOrgAndRedirect(formData: FormData) {
  const orgId = formData.get("orgId") as string;
  if (!orgId) return;
  await setActiveOrg(orgId);
  redirect("/dashboard");
}
