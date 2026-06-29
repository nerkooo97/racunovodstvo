"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireActiveOrganization } from "@/lib/organization/server";
import { assertFeature } from "@/lib/organization/regime";
import { kufPeriod } from "@/lib/pdv/period";
import { mapPurchaseToKuf } from "@/lib/pdv/kuf-mapper";
import { partnerKindFromCategory } from "@/lib/pdv/partner-ids";
import type { PartnerKind } from "@/lib/pdv/constants";
import { ensurePeriod, isPeriodLocked, nextSerialNumber } from "./periods";

const PurchaseSchema = z.object({
  uio_document_type: z.string().regex(/^\d{2}$/).default("01"),
  partner_id: z.string().uuid().optional().or(z.literal("")),
  supplier_name: z.string().min(1, "Naziv dobavljača je obavezan."),
  supplier_address: z.string().optional().default(""),
  supplier_vat_id: z.string().optional().default(""),
  supplier_jib: z.string().optional().default(""),
  supplier_is_vat_obligor: z.boolean().default(true),
  partner_category: z
    .enum(["domestic_company", "foreign", "individual", "uio_customs"])
    .optional(),

  supplier_invoice_number: z.string().min(1, "Broj fakture je obavezan."),
  supplier_invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  receipt_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  amount_without_vat: z.coerce.number().min(0).default(0),
  amount_with_vat: z.coerce.number().min(0).default(0),
  amount_flat_fee: z.coerce.number().min(0).default(0),
  vat_input_total: z.coerce.number().min(0).default(0),

  is_deductible: z.boolean().default(true),
  deductible_percent: z.coerce.number().min(0).max(100).default(100),
  non_deductible_reason: z.string().optional(),

  jci_number: z.string().optional(),
  jci_date: z.string().optional(),
  attachment_url: z.string().optional(),
  notes: z.string().optional(),
});

const STORAGE_BUCKET = "purchase-attachments";
const ALLOWED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

/** Upload skena ulazne fakture / JCI u privatni bucket; vraća storage path. */
export async function uploadPurchaseAttachment(
  formData: FormData
): Promise<{ error?: string; path?: string }> {
  const { supabase, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "pdv");
  if (!feature.ok) return { error: feature.error };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Datoteka je obavezna." };
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { error: "Datoteka prelazi 10 MB." };
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return { error: "Dozvoljeni formati: PDF, PNG, JPEG, WEBP." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${org.id}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) return { error: error.message };
  return { path };
}

/** Kreira potpisani URL za pregled skena (privatni bucket). */
export async function getPurchaseAttachmentUrl(
  path: string
): Promise<{ error?: string; url?: string }> {
  const { supabase, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "pdv");
  if (!feature.ok) return { error: feature.error };

  // Putanja mora pripadati aktivnoj organizaciji
  if (!path.startsWith(`${org.id}/`)) {
    return { error: "Nedozvoljen pristup datoteci." };
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 10);

  if (error) return { error: error.message };
  return { url: data?.signedUrl };
}

export type PurchaseInput = z.input<typeof PurchaseSchema>;

export async function addPurchaseInvoice(
  input: PurchaseInput
): Promise<{ error?: string; success?: boolean; id?: string }> {
  const { supabase, user, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "pdv");
  if (!feature.ok) return { error: feature.error };

  const parsed = PurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravan unos." };
  }
  const d = parsed.data;

  // Period se određuje po datumu prijema
  const period = kufPeriod(d.receipt_date);

  if (await isPeriodLocked(supabase, org.id, period.year, period.month)) {
    return {
      error: `Period ${period.month}/${period.year} je zaključan. Otključajte ga ili unesite u sljedeći otvoreni period.`,
    };
  }

  // Tip 04 (JCI/uvoz) ⇒ partner je carina
  const isImport = d.uio_document_type === "04";
  const partnerKind: PartnerKind = isImport
    ? "import_customs"
    : partnerKindFromCategory(d.partner_category, d.supplier_is_vat_obligor);

  // 1) Snimi ulazni račun
  const { data: purchase, error: pErr } = await supabase
    .from("purchase_invoices")
    .insert({
      organization_id: org.id,
      partner_id: d.partner_id || null,
      uio_document_type: d.uio_document_type,
      supplier_name: d.supplier_name,
      supplier_address: d.supplier_address || null,
      supplier_vat_id: d.supplier_vat_id || null,
      supplier_jib: d.supplier_jib || null,
      supplier_is_vat_obligor: d.supplier_is_vat_obligor,
      supplier_invoice_number: d.supplier_invoice_number,
      supplier_invoice_date: d.supplier_invoice_date,
      receipt_date: d.receipt_date,
      amount_without_vat: d.amount_without_vat,
      amount_with_vat: d.amount_with_vat,
      amount_flat_fee: d.amount_flat_fee,
      vat_input_total: d.vat_input_total,
      is_deductible: d.is_deductible,
      deductible_percent: d.deductible_percent,
      non_deductible_reason: d.non_deductible_reason || null,
      jci_number: d.jci_number || null,
      jci_date: d.jci_date || null,
      attachment_url: d.attachment_url || null,
      notes: d.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (pErr) return { error: pErr.message };

  // 2) Knjiži u KUF ledger
  await ensurePeriod(supabase, org.id, period.year, period.month);
  const serial = await nextSerialNumber(
    supabase,
    org.id,
    "kuf",
    period.year,
    period.month
  );

  const amounts = mapPurchaseToKuf({
    amount_without_vat: d.amount_without_vat,
    amount_with_vat: d.amount_with_vat,
    amount_flat_fee: d.amount_flat_fee,
    vat_input_total: d.vat_input_total,
    is_deductible: d.is_deductible,
    deductible_percent: d.deductible_percent,
    supplier_is_vat_obligor: d.supplier_is_vat_obligor,
  });

  // JCI: broj/datum = carinska deklaracija
  const docNumber = isImport && d.jci_number ? d.jci_number : d.supplier_invoice_number;
  const docDate = isImport && d.jci_date ? d.jci_date : d.supplier_invoice_date;

  const { data: entry, error: eErr } = await supabase
    .from("pdv_ledger_entries")
    .insert({
      organization_id: org.id,
      record_type: "kuf",
      period_year: period.year,
      period_month: period.month,
      serial_number: serial,
      uio_document_type: d.uio_document_type,
      document_number: docNumber,
      document_date: docDate,
      receipt_date: d.receipt_date,
      partner_id: d.partner_id || null,
      partner_name: d.supplier_name,
      partner_address: d.supplier_address || null,
      partner_vat_id: d.supplier_vat_id || null,
      partner_jib: d.supplier_jib || null,
      partner_kind: partnerKind,
      ...amounts,
      is_deductible: d.is_deductible,
      deductible_percent: d.deductible_percent,
      source_type: isImport ? "jci" : "purchase",
      source_id: purchase.id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (eErr) return { error: eErr.message };

  await supabase
    .from("purchase_invoices")
    .update({ ledger_entry_id: entry.id })
    .eq("id", purchase.id);

  revalidatePath("/pdv");
  revalidatePath(`/pdv/${period.year}/${period.month}`);
  return { success: true, id: entry.id };
}

export async function deleteKufEntry(
  entryId: string
): Promise<{ error?: string; success?: boolean }> {
  const { supabase, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "pdv");
  if (!feature.ok) return { error: feature.error };

  // Trigger u bazi blokira brisanje iz zaključanog perioda
  const { error } = await supabase
    .from("pdv_ledger_entries")
    .delete()
    .eq("id", entryId)
    .eq("organization_id", org.id)
    .eq("record_type", "kuf");

  if (error) return { error: error.message };

  revalidatePath("/pdv");
  return { success: true };
}
