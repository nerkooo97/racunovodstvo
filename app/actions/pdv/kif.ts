"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireActiveOrganization } from "@/lib/organization/server";
import { assertFeature, hasFeature } from "@/lib/organization/regime";
import { kifPeriod, periodFromDateString } from "@/lib/pdv/period";
import { mapInvoiceToKif, type KifItemInput } from "@/lib/pdv/kif-mapper";
import { partnerKindFromCategory } from "@/lib/pdv/partner-ids";
import type { PartnerKind, SaleCategory } from "@/lib/pdv/constants";
import { ensurePeriod, isPeriodLocked, nextSerialNumber } from "./periods";

interface InvoiceRow {
  id: string;
  type: "invoice" | "proforma" | "credit_note" | "advance";
  status: string;
  sale_category: SaleCategory | null;
  charges_vat: boolean | null;
  issue_date: string;
  delivery_date: string | null;
  tax_point_date: string | null;
  invoice_number: string | null;
  buyer_name: string | null;
  buyer_address: string | null;
  buyer_city: string | null;
  buyer_jib: string | null;
  buyer_vat_no: string | null;
  vat_base_17: number | null;
  vat_amount_17: number | null;
  vat_base_0: number | null;
  total: number | null;
  jci_number: string | null;
  jci_date: string | null;
  advance_for_invoice_id: string | null;
}

function kifPartnerKind(inv: InvoiceRow): PartnerKind {
  if (inv.sale_category === "export_goods" || inv.sale_category === "export_services") {
    return "foreign";
  }
  if (inv.buyer_vat_no) return "domestic_vat";
  if (inv.buyer_jib) return "domestic_jib";
  return "individual";
}

/**
 * Sinhronizuje izlaznu fakturu u KIF ledger. Poziva se iz invoices.ts kad
 * faktura pređe u status koji znači "izdana" (npr. open). Idempotentno:
 * ažurira postojeći zapis ili kreira novi.
 *
 * Vraća poruku o grešci samo za logovanje; ne prekida glavnu akciju.
 */
export async function syncInvoiceToKif(
  supabase: SupabaseClient,
  orgId: string,
  orgType: string,
  invoiceId: string,
  userId: string
): Promise<{ skipped?: boolean; error?: string }> {
  if (!hasFeature(orgType, "pdv")) return { skipped: true };

  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, type, status, sale_category, charges_vat, issue_date, delivery_date, tax_point_date, invoice_number, buyer_name, buyer_address, buyer_city, buyer_jib, buyer_vat_no, vat_base_17, vat_amount_17, vat_base_0, total, jci_number, jci_date, advance_for_invoice_id"
    )
    .eq("id", invoiceId)
    .eq("organization_id", orgId)
    .single();

  if (error || !data) return { error: error?.message ?? "Faktura nije pronađena." };
  const inv = data as InvoiceRow;

  // Predračun ne ulazi u KIF
  if (inv.type === "proforma") return { skipped: true };
  // Faktura bez PDV-a (obveznik koji ne obračunava) — preskoči
  if (inv.charges_vat === false) return { skipped: true };

  const period = kifPeriod({
    taxPointDate: inv.tax_point_date,
    deliveryDate: inv.delivery_date,
    issueDate: inv.issue_date,
  });

  if (await isPeriodLocked(supabase, orgId, period.year, period.month)) {
    return { error: `Period ${period.month}/${period.year} je zaključan.` };
  }

  const invoiceCategory: SaleCategory = inv.sale_category ?? "domestic_b2b";
  const buyerRegistered = invoiceCategory !== "domestic_b2c";

  // Razlaganje po stavkama (miješane stope/oslobođenja). Ako stavki nema,
  // sintetiziraj iz agregata fakture.
  const { data: itemRows } = await supabase
    .from("invoice_items")
    .select("subtotal, vat_amount, vat_rate, sale_category")
    .eq("invoice_id", invoiceId);

  let items: KifItemInput[];
  if (itemRows && itemRows.length > 0) {
    items = itemRows.map((it) => ({
      base: Number(it.subtotal ?? 0),
      vat: Number(it.vat_amount ?? 0),
      rate: Number(it.vat_rate ?? 0),
      category: (it.sale_category as SaleCategory | null) ?? invoiceCategory,
    }));
  } else {
    items = [
      {
        base: inv.vat_base_17 ?? 0,
        vat: inv.vat_amount_17 ?? 0,
        rate: 17,
        category: invoiceCategory,
      },
      {
        base: inv.vat_base_0 ?? 0,
        vat: 0,
        rate: 0,
        category: invoiceCategory,
      },
    ];
  }

  const amounts = mapInvoiceToKif({
    type: inv.type,
    sale_category: inv.sale_category,
    buyer_registered: buyerRegistered,
    charges_vat: inv.charges_vat ?? true,
    items,
  });

  const isExport = amounts.uio_document_type === "04";
  const docNumber = isExport && inv.jci_number ? inv.jci_number : inv.invoice_number ?? "—";
  const docDate = isExport && inv.jci_date ? inv.jci_date : inv.issue_date;
  const address = [inv.buyer_address, inv.buyer_city].filter(Boolean).join(", ");

  await ensurePeriod(supabase, orgId, period.year, period.month);

  const sourceType = inv.type === "credit_note" ? "invoice_cn" : "invoice_out";

  const { data: existing } = await supabase
    .from("pdv_ledger_entries")
    .select("id")
    .eq("organization_id", orgId)
    .eq("source_id", invoiceId)
    .in("source_type", ["invoice_out", "invoice_cn"])
    .maybeSingle();

  const payload = {
    organization_id: orgId,
    record_type: "kif" as const,
    period_year: period.year,
    period_month: period.month,
    uio_document_type: amounts.uio_document_type,
    document_number: docNumber,
    document_date: docDate,
    partner_id: null,
    partner_name: inv.buyer_name ?? "—",
    partner_address: address || null,
    partner_vat_id: inv.buyer_vat_no || null,
    partner_jib: inv.buyer_jib || null,
    partner_kind: kifPartnerKind(inv),
    kif_amount_total: amounts.kif_amount_total,
    kif_amount_internal: amounts.kif_amount_internal,
    kif_amount_export: amounts.kif_amount_export,
    kif_amount_exempt: amounts.kif_amount_exempt,
    kif_base_registered: amounts.kif_base_registered,
    kif_vat_registered: amounts.kif_vat_registered,
    kif_base_unregistered: amounts.kif_base_unregistered,
    kif_vat_unregistered: amounts.kif_vat_unregistered,
    field_32: amounts.field_32,
    field_33: amounts.field_33,
    field_34: amounts.field_34,
    source_type: sourceType,
    source_id: invoiceId,
    created_by: userId,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error: upErr } = await supabase
      .from("pdv_ledger_entries")
      .update(payload)
      .eq("id", existing.id);
    if (upErr) return { error: upErr.message };
  } else {
    const serial = await nextSerialNumber(
      supabase,
      orgId,
      "kif",
      period.year,
      period.month
    );
    const { error: insErr } = await supabase
      .from("pdv_ledger_entries")
      .insert({ ...payload, serial_number: serial });
    if (insErr) return { error: insErr.message };
  }

  // Zatvaranje avansa: ako konačna faktura referencira avans, upiši negativni
  // storno avansa u istom periodu da se izlazni PDV ne broji dvaput.
  if (inv.advance_for_invoice_id) {
    const closeErr = await syncAdvanceClose(
      supabase,
      orgId,
      inv,
      period,
      docDate,
      userId
    );
    if (closeErr) return { error: closeErr };
  }

  return {};
}

/**
 * Upisuje (ili ažurira) negativni storno avansa na konačnoj fakturi.
 * Kopira KIF kolone iz postojeće stavke avansa i negira ih.
 */
async function syncAdvanceClose(
  supabase: SupabaseClient,
  orgId: string,
  finalInv: InvoiceRow,
  period: { year: number; month: number },
  docDate: string,
  userId: string
): Promise<string | undefined> {
  const advanceId = finalInv.advance_for_invoice_id;
  if (!advanceId) return undefined;

  // Postojeća KIF stavka avansa (proknjižena kao invoice_out, tip 03)
  const { data: advEntry } = await supabase
    .from("pdv_ledger_entries")
    .select(
      "document_number, kif_amount_total, kif_amount_internal, kif_amount_export, kif_amount_exempt, kif_base_registered, kif_vat_registered, kif_base_unregistered, kif_vat_unregistered"
    )
    .eq("organization_id", orgId)
    .eq("source_id", advanceId)
    .in("source_type", ["invoice_out", "invoice_cn"])
    .maybeSingle();

  // Avans nije proknjižen — nema šta zatvoriti
  if (!advEntry) return undefined;

  const address = [finalInv.buyer_address, finalInv.buyer_city]
    .filter(Boolean)
    .join(", ");

  const neg = (v: unknown) => -Number(v ?? 0);

  const closePayload = {
    organization_id: orgId,
    record_type: "kif" as const,
    period_year: period.year,
    period_month: period.month,
    uio_document_type: "03",
    document_number: `Avans ${advEntry.document_number} (zatvaranje)`,
    document_date: docDate,
    partner_id: null,
    partner_name: finalInv.buyer_name ?? "—",
    partner_address: address || null,
    partner_vat_id: finalInv.buyer_vat_no || null,
    partner_jib: finalInv.buyer_jib || null,
    partner_kind: kifPartnerKind(finalInv),
    kif_amount_total: neg(advEntry.kif_amount_total),
    kif_amount_internal: neg(advEntry.kif_amount_internal),
    kif_amount_export: neg(advEntry.kif_amount_export),
    kif_amount_exempt: neg(advEntry.kif_amount_exempt),
    kif_base_registered: neg(advEntry.kif_base_registered),
    kif_vat_registered: neg(advEntry.kif_vat_registered),
    kif_base_unregistered: neg(advEntry.kif_base_unregistered),
    kif_vat_unregistered: neg(advEntry.kif_vat_unregistered),
    field_32: 0,
    field_33: 0,
    field_34: 0,
    source_type: "advance_close",
    source_id: finalInv.id,
    created_by: userId,
    updated_at: new Date().toISOString(),
  };

  const { data: existingClose } = await supabase
    .from("pdv_ledger_entries")
    .select("id")
    .eq("organization_id", orgId)
    .eq("source_id", finalInv.id)
    .eq("source_type", "advance_close")
    .maybeSingle();

  if (existingClose) {
    const { error } = await supabase
      .from("pdv_ledger_entries")
      .update(closePayload)
      .eq("id", existingClose.id);
    return error?.message;
  }

  const serial = await nextSerialNumber(
    supabase,
    orgId,
    "kif",
    period.year,
    period.month
  );
  const { error } = await supabase
    .from("pdv_ledger_entries")
    .insert({ ...closePayload, serial_number: serial });
  return error?.message;
}

/** Uklanja KIF zapis fakture (npr. pri storniranju / vraćanju u nacrt). */
export async function removeInvoiceFromKif(
  supabase: SupabaseClient,
  orgId: string,
  invoiceId: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("pdv_ledger_entries")
    .delete()
    .eq("organization_id", orgId)
    .eq("source_id", invoiceId)
    .in("source_type", ["invoice_out", "invoice_cn", "advance_close"]);
  // Zaključan PDV period blokira brisanje na DB nivou — greška se mora vratiti,
  // inače faktura ostaje "stornirana" a stavka i dalje sjedi u KIF-u
  if (error) return { error: error.message };
  return {};
}

// ─── Ručni / interni KIF unos ────────────────────────────────────────────────

const ManualKifSchema = z.object({
  uio_document_type: z.string().regex(/^\d{2}$/).default("01"),
  document_number: z.string().min(1, "Broj dokumenta je obavezan."),
  document_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neispravan datum."),
  sale_category: z.enum([
    "domestic_b2b",
    "domestic_b2c",
    "export_goods",
    "export_services",
    "exempt",
    "internal_use",
  ]),
  partner_name: z.string().min(1, "Naziv je obavezan."),
  partner_address: z.string().optional().default(""),
  partner_vat_id: z.string().optional().default(""),
  partner_jib: z.string().optional().default(""),
  partner_category: z
    .enum(["domestic_company", "foreign", "individual", "uio_customs"])
    .optional(),
  base_17: z.coerce.number().default(0),
  vat_17: z.coerce.number().default(0),
  base_0: z.coerce.number().default(0),
  notes: z.string().optional(),
});

export type ManualKifInput = z.input<typeof ManualKifSchema>;

/** Ručni KIF unos (interna potrošnja, knjižno odobrenje, oslobođene isporuke). */
export async function addManualKifEntry(
  input: ManualKifInput
): Promise<{ error?: string; success?: boolean; id?: string }> {
  const { supabase, user, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "pdv");
  if (!feature.ok) return { error: feature.error };

  const parsed = ManualKifSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravan unos." };
  }
  const d = parsed.data;

  const period = periodFromDateString(d.document_date);
  if (await isPeriodLocked(supabase, org.id, period.year, period.month)) {
    return { error: `Period ${period.month}/${period.year} je zaključan.` };
  }

  const buyerRegistered = d.sale_category !== "domestic_b2c";
  const items: KifItemInput[] = [
    { base: d.base_17, vat: d.vat_17, rate: 17, category: d.sale_category },
    { base: d.base_0, vat: 0, rate: 0, category: d.sale_category },
  ];

  const amounts = mapInvoiceToKif({
    type: "invoice",
    sale_category: d.sale_category,
    buyer_registered: buyerRegistered,
    charges_vat: true,
    items,
  });
  // Ručni unos može imati eksplicitan tip dokumenta (npr. 06 knjižno odobrenje)
  amounts.uio_document_type = d.uio_document_type;

  const partnerKind: PartnerKind = partnerKindFromCategory(
    d.partner_category,
    !!d.partner_vat_id
  );

  await ensurePeriod(supabase, org.id, period.year, period.month);
  const serial = await nextSerialNumber(
    supabase,
    org.id,
    "kif",
    period.year,
    period.month
  );

  const { data: entry, error } = await supabase
    .from("pdv_ledger_entries")
    .insert({
      organization_id: org.id,
      record_type: "kif",
      period_year: period.year,
      period_month: period.month,
      serial_number: serial,
      uio_document_type: amounts.uio_document_type,
      document_number: d.document_number,
      document_date: d.document_date,
      partner_id: null,
      partner_name: d.partner_name,
      partner_address: d.partner_address || null,
      partner_vat_id: d.partner_vat_id || null,
      partner_jib: d.partner_jib || null,
      partner_kind: partnerKind,
      kif_amount_total: amounts.kif_amount_total,
      kif_amount_internal: amounts.kif_amount_internal,
      kif_amount_export: amounts.kif_amount_export,
      kif_amount_exempt: amounts.kif_amount_exempt,
      kif_base_registered: amounts.kif_base_registered,
      kif_vat_registered: amounts.kif_vat_registered,
      kif_base_unregistered: amounts.kif_base_unregistered,
      kif_vat_unregistered: amounts.kif_vat_unregistered,
      field_32: amounts.field_32,
      field_33: amounts.field_33,
      field_34: amounts.field_34,
      source_type: d.sale_category === "internal_use" ? "internal" : "manual",
      notes: d.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/pdv");
  revalidatePath(`/pdv/${period.year}/${period.month}`);
  return { success: true, id: entry.id };
}

// ─── Zbirni maloprodajni promet (B2C) ────────────────────────────────────────

const RetailKifSchema = z.object({
  document_number: z.string().min(1, "Oznaka prometa je obavezna."),
  document_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neispravan datum."),
  base_17: z.coerce.number().min(0).default(0),
  vat_17: z.coerce.number().min(0).default(0),
  base_0: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

export type RetailKifInput = z.input<typeof RetailKifSchema>;

/** Zbirni unos maloprodajnog (fiskalnog) prometa kao jedan KIF slog (B2C). */
export async function addRetailKifEntry(
  input: RetailKifInput
): Promise<{ error?: string; success?: boolean; id?: string }> {
  const { supabase, user, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "pdv");
  if (!feature.ok) return { error: feature.error };

  const parsed = RetailKifSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravan unos." };
  }
  const d = parsed.data;

  const period = periodFromDateString(d.document_date);
  if (await isPeriodLocked(supabase, org.id, period.year, period.month)) {
    return { error: `Period ${period.month}/${period.year} je zaključan.` };
  }

  const items: KifItemInput[] = [
    { base: d.base_17, vat: d.vat_17, rate: 17, category: "domestic_b2c" },
    { base: d.base_0, vat: 0, rate: 0, category: "exempt" },
  ];

  const amounts = mapInvoiceToKif({
    type: "invoice",
    sale_category: "domestic_b2c",
    buyer_registered: false,
    charges_vat: true,
    items,
  });

  await ensurePeriod(supabase, org.id, period.year, period.month);
  const serial = await nextSerialNumber(
    supabase,
    org.id,
    "kif",
    period.year,
    period.month
  );

  const { data: entry, error } = await supabase
    .from("pdv_ledger_entries")
    .insert({
      organization_id: org.id,
      record_type: "kif",
      period_year: period.year,
      period_month: period.month,
      serial_number: serial,
      uio_document_type: "01",
      document_number: d.document_number,
      document_date: d.document_date,
      partner_id: null,
      partner_name: "Maloprodaja (zbirno)",
      partner_address: null,
      partner_vat_id: null,
      partner_jib: null,
      partner_kind: "individual",
      kif_amount_total: amounts.kif_amount_total,
      kif_amount_internal: amounts.kif_amount_internal,
      kif_amount_export: amounts.kif_amount_export,
      kif_amount_exempt: amounts.kif_amount_exempt,
      kif_base_registered: amounts.kif_base_registered,
      kif_vat_registered: amounts.kif_vat_registered,
      kif_base_unregistered: amounts.kif_base_unregistered,
      kif_vat_unregistered: amounts.kif_vat_unregistered,
      field_32: 0,
      field_33: 0,
      field_34: 0,
      source_type: "retail",
      notes: d.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/pdv");
  revalidatePath(`/pdv/${period.year}/${period.month}`);
  return { success: true, id: entry.id };
}

/** Briše ručni KIF unos (npr. interna potrošnja, zbirni maloprodajni promet). */
export async function deleteKifEntry(
  entryId: string
): Promise<{ error?: string; success?: boolean }> {
  const { supabase, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "pdv");
  if (!feature.ok) return { error: feature.error };

  const { error } = await supabase
    .from("pdv_ledger_entries")
    .delete()
    .eq("id", entryId)
    .eq("organization_id", org.id)
    .eq("record_type", "kif");

  if (error) return { error: error.message };
  revalidatePath("/pdv");
  return { success: true };
}
