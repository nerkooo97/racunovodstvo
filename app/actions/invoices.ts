"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { syncInvoiceToKif, removeInvoiceFromKif } from "@/app/actions/pdv/kif";

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  return data?.id ?? null;
}

// ─── Partners ────────────────────────────────────────────────────────────────

const PartnerSchema = z.object({
  name:         z.string().min(1, "Naziv je obavezan"),
  tax_id:       z.string().optional(),
  vat_number:   z.string().optional(),
  address:      z.string().optional(),
  city:         z.string().optional(),
  email:        z.string().email().optional().or(z.literal("")),
  phone:        z.string().optional(),
  bank_account: z.string().optional(),
  type:         z.enum(["customer", "supplier", "both"]).default("both"),
  keywords:     z.string().optional(),
});

export async function createPartner(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niste prijavljeni." };

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return { error: "Nema organizacije." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = PartnerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { keywords, ...rest } = parsed.data;
  const keywordsArr = keywords
    ? keywords.split(",").map((k) => k.trim()).filter(Boolean)
    : [];

  const { error } = await supabase.from("partners").insert({
    organization_id: orgId,
    ...rest,
    keywords: keywordsArr,
  });

  if (error) return { error: error.message };
  revalidatePath("/partneri");
  return { success: true };
}

export async function updatePartner(partnerId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niste prijavljeni." };

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return { error: "Nema organizacije." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = PartnerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { keywords, ...rest } = parsed.data;
  const keywordsArr = keywords
    ? keywords.split(",").map((k) => k.trim()).filter(Boolean)
    : [];

  const { error } = await supabase
    .from("partners")
    .update({ ...rest, keywords: keywordsArr, updated_at: new Date().toISOString() })
    .eq("id", partnerId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/partneri");
  return { success: true };
}

// ─── Invoices ────────────────────────────────────────────────────────────────

const InvoiceItemSchema = z.object({
  description: z.string().min(1),
  unit:        z.string().optional(),
  quantity:    z.coerce.number().positive(),
  unit_price:  z.coerce.number().min(0),
  discount:    z.coerce.number().min(0).max(100).default(0),
  vat_rate:    z.coerce.number().min(0).max(100).default(17),
  sale_category: z
    .enum([
      "domestic_b2b",
      "domestic_b2c",
      "export_goods",
      "export_services",
      "exempt",
      "internal_use",
    ])
    .optional(),
  sort_order:  z.coerce.number().default(0),
});

const InvoiceSchema = z.object({
  partner_id:    z.string().uuid().optional().or(z.literal("")),
  type:          z.enum(["invoice", "proforma", "credit_note", "advance"]).default("invoice"),
  issue_date:    z.string(),
  due_date:      z.string().optional(),
  delivery_date: z.string().optional(),
  tax_point_date: z.string().optional(),
  sale_category: z
    .enum([
      "domestic_b2b",
      "domestic_b2c",
      "export_goods",
      "export_services",
      "exempt",
      "internal_use",
    ])
    .optional(),
  jci_number:    z.string().optional(),
  jci_date:      z.string().optional(),
  advance_for_invoice_id: z.string().uuid().optional().or(z.literal("")),
  currency:      z.string().default("BAM"),
  note:          z.string().optional(),
});

function computeItem(raw: z.infer<typeof InvoiceItemSchema>) {
  const subtotal  = raw.quantity * raw.unit_price * (1 - raw.discount / 100);
  const vat       = subtotal * (raw.vat_rate / 100);
  return { ...raw, subtotal, vat_amount: vat, total: subtotal + vat };
}

export async function createInvoice(
  formData: FormData,
  items: z.infer<typeof InvoiceItemSchema>[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niste prijavljeni." };

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return { error: "Nema organizacije." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = InvoiceSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { type, issue_date } = parsed.data;
  const year = new Date(issue_date).getFullYear();

  // Next sequence number
  const { data: lastSeq } = await supabase
    .from("invoices")
    .select("sequence_number")
    .eq("organization_id", orgId)
    .eq("type", type)
    .eq("year", year)
    .order("sequence_number", { ascending: false })
    .limit(1)
    .single();

  const sequenceNumber = (lastSeq?.sequence_number ?? 0) + 1;
  const invoiceNumber  = `${year}-${String(sequenceNumber).padStart(3, "0")}`;

  const computedItems = items.map((it) => computeItem(InvoiceItemSchema.parse(it)));
  const subtotal = computedItems.reduce((s, it) => s + it.subtotal, 0);
  const vat17Items = computedItems.filter((it) => it.vat_rate === 17);
  const vat0Items  = computedItems.filter((it) => it.vat_rate === 0);
  const vatBase17  = vat17Items.reduce((s, it) => s + it.subtotal, 0);
  const vatAmt17   = vat17Items.reduce((s, it) => s + it.vat_amount, 0);
  const vatBase0   = vat0Items.reduce((s, it) => s + it.subtotal, 0);
  const total      = computedItems.reduce((s, it) => s + it.total, 0);

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      organization_id: orgId,
      partner_id: parsed.data.partner_id || null,
      type,
      status: "draft",
      invoice_number: invoiceNumber,
      sequence_number: sequenceNumber,
      year,
      issue_date: parsed.data.issue_date,
      due_date: parsed.data.due_date || null,
      delivery_date: parsed.data.delivery_date || null,
      tax_point_date: parsed.data.tax_point_date || parsed.data.delivery_date || null,
      sale_category: parsed.data.sale_category || "domestic_b2b",
      jci_number: parsed.data.jci_number || null,
      jci_date: parsed.data.jci_date || null,
      advance_for_invoice_id: parsed.data.advance_for_invoice_id || null,
      currency: parsed.data.currency,
      note: parsed.data.note || null,
      subtotal,
      vat_base_17: vatBase17,
      vat_amount_17: vatAmt17,
      vat_base_0: vatBase0,
      total,
    })
    .select("id")
    .single();

  if (invErr) return { error: invErr.message };

  const itemRows = computedItems.map((it) => ({
    invoice_id: invoice!.id,
    description: it.description,
    unit: it.unit || null,
    quantity: it.quantity,
    unit_price: it.unit_price,
    discount: it.discount,
    vat_rate: it.vat_rate,
    sale_category: it.sale_category ?? null,
    subtotal: it.subtotal,
    vat_amount: it.vat_amount,
    total: it.total,
    sort_order: it.sort_order,
  }));

  const { error: itemErr } = await supabase.from("invoice_items").insert(itemRows);
  if (itemErr) return { error: itemErr.message };

  revalidatePath("/fakture");
  return { success: true, invoiceId: invoice!.id };
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: "draft" | "open" | "paid" | "cancelled" | "overdue"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niste prijavljeni." };

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return { error: "Nema organizacije." };

  const { data: inv, error: fetchErr } = await supabase
    .from("invoices")
    .select("id, type, status")
    .eq("id", invoiceId)
    .eq("organization_id", orgId)
    .single();

  if (fetchErr || !inv) return { error: fetchErr?.message ?? "Faktura nije pronađena." };

  const { error } = await supabase
    .from("invoices")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  // KIF evidencija: izdana faktura/knjižna obavijest → upiši; nacrt/storno → ukloni
  const { data: orgRow } = await supabase
    .from("organizations")
    .select("type")
    .eq("id", orgId)
    .single();

  const countsForKif = inv.type === "invoice" || inv.type === "credit_note" || inv.type === "advance";
  if (countsForKif) {
    if (status === "open" || status === "paid" || status === "overdue") {
      await syncInvoiceToKif(supabase, orgId, orgRow?.type ?? "obrt", invoiceId, user.id);
    } else if (status === "draft" || status === "cancelled") {
      await removeInvoiceFromKif(supabase, orgId, invoiceId);
    }
  }

  revalidatePath("/fakture");
  revalidatePath("/pdv");
  return { success: true };
}
