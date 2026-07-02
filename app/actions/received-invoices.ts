"use server";

import { revalidatePath } from "next/cache";
import { assertFeature } from "@/lib/organization/regime";
import { requireActiveOrganization } from "@/lib/organization/server";
import { POSTING_ACCOUNTS } from "@/lib/accounting/standard-chart";
import { postJournalEntry } from "./accounting/journal";
import { ensureChartOfAccounts } from "./accounting/accounts";

// ─── Obrt: isti tip kao i prije, samo amount (ukupan iznos) ─────────────────
interface ObrtReceivedInvoiceInput {
  partner_id: string | null;
  partner_name: string;
  partner_tax_id: string | null;
  invoice_number: string | null;
  invoice_date: string;
  received_date: string | null;
  amount: number;
  payment_date: string | null;
  paid_amount: number;
  notes: string | null;
}

// ─── DOO: razrez na osnovicu + PDV + vrsta troška ───────────────────────────
// expense_type:
//   'inventory' — roba za dalju prodaju → zalihe 1300 (rashod tek pri prodaji,
//                 razduženjem nakon popisa — MRS 2)
//   'goods'     — odmah utrošeni materijal → direktan rashod 5000
//   'services'  — usluge → rashod 5300
interface DooReceivedInvoiceInput extends ObrtReceivedInvoiceInput {
  amount_base: number;   // bez PDV
  vat_amount: number;    // PDV iznos (može biti 0 ako nema odbitka)
  expense_type: "goods" | "services" | "inventory";
  is_foreign: boolean;
}

export type ReceivedInvoiceInput = ObrtReceivedInvoiceInput | DooReceivedInvoiceInput;

function isDoo(input: ReceivedInvoiceInput): input is DooReceivedInvoiceInput {
  return "amount_base" in input;
}

export async function addReceivedInvoice(
  input: ReceivedInvoiceInput
): Promise<{ id?: string; error?: string; gl_entry_id?: string }> {
  const { supabase, user, org } = await requireActiveOrganization();
  const check = assertFeature(org.type, "received_invoices");
  if (!check.ok) return { error: check.error };

  const { data, error } = await supabase
    .from("received_invoices")
    .insert({
      organization_id: org.id,
      partner_id: input.partner_id,
      partner_name: input.partner_name,
      partner_tax_id: input.partner_tax_id,
      invoice_number: input.invoice_number,
      invoice_date: input.invoice_date,
      received_date: input.received_date,
      amount: input.amount,
      payment_date: input.payment_date,
      paid_amount: input.paid_amount,
      notes: input.notes,
      // DOO polja (default vrijednosti za obrt)
      amount_base: isDoo(input) ? input.amount_base : input.amount,
      vat_amount: isDoo(input) ? input.vat_amount : 0,
      expense_type: isDoo(input) ? input.expense_type : "goods",
      is_foreign: isDoo(input) ? input.is_foreign : false,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // ─── DOO: automatski GK nalog ─────────────────────────────────────────────
  let glEntryId: string | undefined;

  if (isDoo(input) && assertFeature(org.type, "general_ledger").ok) {
    await ensureChartOfAccounts(supabase, org.id);

    const expenseAcc =
      input.expense_type === "services"
        ? POSTING_ACCOUNTS.servicesExpense    // 5300
        : input.expense_type === "inventory"
          ? POSTING_ACCOUNTS.goodsInventory   // 1300 — zalihe, ne rashod
          : POSTING_ACCOUNTS.goodsExpense;    // 5000

    const supplierAcc = input.is_foreign
      ? POSTING_ACCOUNTS.suppliersForeign  // 4330
      : POSTING_ACCOUNTS.suppliersDomestic; // 4320

    const lines = [
      { account_code: expenseAcc, debit: input.amount_base, credit: 0, partner_id: input.partner_id },
      ...(input.vat_amount > 0
        ? [{ account_code: POSTING_ACCOUNTS.inputVat, debit: input.vat_amount, credit: 0 }]
        : []),
      { account_code: supplierAcc, debit: 0, credit: input.amount, partner_id: input.partner_id },
    ];

    const entryDesc = [
      input.invoice_number ? `Fakt. ${input.invoice_number}` : "Primljena faktura",
      input.partner_name,
    ].filter(Boolean).join(" — ");

    const res = await postJournalEntry(supabase, org.id, user.id, {
      entry_date: input.invoice_date,
      description: entryDesc,
      source_type: "purchase",
      source_id: data.id,
      lines,
    });

    if (res.error) {
      // Rollback — obrišemo fakturu ako GK ne uspije
      await supabase.from("received_invoices").delete().eq("id", data.id);
      return { error: `GK knjiženje nije uspjelo: ${res.error}` };
    }

    glEntryId = res.id;

    await supabase
      .from("received_invoices")
      .update({ gl_entry_id: glEntryId })
      .eq("id", data.id);
  }

  revalidatePath("/primljene-fakture");
  revalidatePath("/epo");
  if (glEntryId) revalidatePath("/knjigovodstvo/dnevnik");

  return { id: data.id, gl_entry_id: glEntryId };
}

export async function updateReceivedInvoicePayment(
  id: string,
  paymentDate: string,
  paidAmount: number
): Promise<{ error?: string }> {
  const { supabase, org } = await requireActiveOrganization();
  const check = assertFeature(org.type, "received_invoices");
  if (!check.ok) return { error: check.error };

  const { error } = await supabase
    .from("received_invoices")
    .update({ payment_date: paymentDate, paid_amount: paidAmount, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", org.id);

  if (error) return { error: error.message };

  revalidatePath("/primljene-fakture");
  revalidatePath("/epo");
  return {};
}

export async function deleteReceivedInvoice(id: string): Promise<{ error?: string }> {
  const { supabase, org } = await requireActiveOrganization();
  const check = assertFeature(org.type, "received_invoices");
  if (!check.ok) return { error: check.error };

  // Dohvati gl_entry_id prije brisanja
  const { data: inv } = await supabase
    .from("received_invoices")
    .select("gl_entry_id")
    .eq("id", id)
    .eq("organization_id", org.id)
    .single();

  const { error } = await supabase
    .from("received_invoices")
    .delete()
    .eq("id", id)
    .eq("organization_id", org.id);

  if (error) return { error: error.message };

  // Obriši GK nalog ako postoji
  if (inv?.gl_entry_id) {
    await supabase
      .from("journal_entries")
      .delete()
      .eq("id", inv.gl_entry_id)
      .eq("organization_id", org.id);
    revalidatePath("/knjigovodstvo/dnevnik");
  }

  revalidatePath("/primljene-fakture");
  revalidatePath("/epo");
  return {};
}
