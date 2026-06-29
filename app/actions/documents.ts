"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import { hasFeature } from "@/lib/organization/regime";

// ─── Bankovni izvodi ──────────────────────────────────────────────────────────

export async function importStatement(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niste prijavljeni." };

  const orgId = await getActiveOrgId(supabase, user.id);
  if (!orgId) return { error: "Nema organizacije." };

  const bank          = formData.get("bank") as string;
  const accountNumber = formData.get("account_number") as string | null;
  const periodFrom    = formData.get("period_from") as string;
  const periodTo      = formData.get("period_to") as string;
  const opening       = parseFloat(formData.get("opening_balance") as string || "0");
  const closing       = parseFloat(formData.get("closing_balance") as string || "0");

  if (!bank || !periodFrom || !periodTo) return { error: "Banka i period su obavezni." };

  const { data: stmt, error: stmtErr } = await supabase
    .from("bank_statements")
    .insert({
      organization_id: orgId,
      bank,
      account_number: accountNumber || null,
      period_from: periodFrom,
      period_to: periodTo,
      opening_balance: opening,
      closing_balance: closing,
    })
    .select("id")
    .single();

  if (stmtErr) return { error: stmtErr.message };

  revalidatePath("/bankovni-izvod");
  return { success: true, statementId: stmt.id };
}

export async function createTransaction(
  statementId: string,
  rows: {
    transaction_date: string;
    value_date?: string;
    amount: number;
    direction: "credit" | "debit";
    counterparty_name?: string;
    counterparty_account?: string;
    description?: string;
    reference_number?: string;
  }[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niste prijavljeni." };

  const orgId = await getActiveOrgId(supabase, user.id);
  if (!orgId) return { error: "Nema organizacije." };

  // Dohvati partnere za auto-match
  const { data: partners } = await supabase
    .from("partners")
    .select("id, name, keywords")
    .eq("organization_id", orgId);

  const insertRows = rows.map((row) => {
    let partnerId: string | null = null;
    let matchScore = 0;

    if (partners && row.counterparty_name) {
      const name = row.counterparty_name.toLowerCase();
      for (const p of partners) {
        const nameMatch = name.includes(p.name.toLowerCase()) ? 80 : 0;
        const kwMatch   = (p.keywords as string[]).some((kw) =>
          name.includes(kw.toLowerCase())
        ) ? 70 : 0;
        const score = Math.max(nameMatch, kwMatch);
        if (score > matchScore) {
          matchScore = score;
          partnerId  = p.id;
        }
      }
    }

    return {
      statement_id: statementId,
      organization_id: orgId,
      ...row,
      partner_id:  matchScore >= 70 ? partnerId : null,
      match_score: matchScore,
      status:      matchScore >= 70 ? "review" : "unmatched",
    };
  });

  const { error } = await supabase.from("transactions").insert(insertRows);
  if (error) return { error: error.message };

  revalidatePath("/bankovni-izvod");
  return { success: true };
}

export async function matchTransaction(transactionId: string, partnerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niste prijavljeni." };

  const orgId = await getActiveOrgId(supabase, user.id);
  if (!orgId) return { error: "Nema organizacije." };

  const { error } = await supabase
    .from("transactions")
    .update({
      partner_id:  partnerId,
      match_score: 100,
      status:      "review",
      updated_at:  new Date().toISOString(),
    })
    .eq("id", transactionId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/bankovni-izvod");
  return { success: true };
}

export async function confirmTransaction(transactionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niste prijavljeni." };

  const orgId = await getActiveOrgId(supabase, user.id);
  if (!orgId) return { error: "Nema organizacije." };

  // Dohvati transakciju
  const { data: tx } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("organization_id", orgId)
    .single();

  if (!tx) return { error: "Transakcija nije pronađena." };

  // Potvrdi transakciju
  const { error: txErr } = await supabase
    .from("transactions")
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", transactionId);

  if (txErr) return { error: txErr.message };

  const { data: org } = await supabase
    .from("organizations")
    .select("type")
    .eq("id", orgId)
    .single();

  if (hasFeature(org?.type, "kpr_auto_from_bank")) {
    await createKprEntry({
      orgId,
      entryDate: tx.transaction_date,
      documentType: `Bankovni izvod (${tx.direction === "credit" ? "uplata" : "isplata"})`,
      documentNumber: tx.reference_number || null,
      partnerName: tx.counterparty_name || null,
      description: tx.description || null,
      debit: tx.direction === "debit" ? tx.amount : 0,
      credit: tx.direction === "credit" ? tx.amount : 0,
      transactionId,
    });
    revalidatePath("/kpr");
  }

  revalidatePath("/bankovni-izvod");
  return { success: true };
}

// ─── KPR ─────────────────────────────────────────────────────────────────────

interface KprEntryInput {
  orgId: string;
  entryDate: string;
  documentType: string;
  documentNumber?: string | null;
  partnerName?: string | null;
  partnerTaxId?: string | null;
  description?: string | null;
  debit: number;
  credit: number;
  accountCode?: string | null;
  transactionId?: string | null;
  invoiceId?: string | null;
}

export async function createKprEntry(input: KprEntryInput) {
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("type")
    .eq("id", input.orgId)
    .single();

  if (!hasFeature(org?.type, "kpr")) {
    return { error: "KPR nije dostupan za ovaj tip organizacije." };
  }

  const year = new Date(input.entryDate).getFullYear();

  // Sljedeći redni broj
  const { data: last } = await supabase
    .from("kpr_entries")
    .select("entry_number")
    .eq("organization_id", input.orgId)
    .eq("year", year)
    .order("entry_number", { ascending: false })
    .limit(1)
    .single();

  const entryNumber = (last?.entry_number ?? 0) + 1;

  const { error } = await supabase.from("kpr_entries").insert({
    organization_id: input.orgId,
    entry_number:    entryNumber,
    year,
    entry_date:      input.entryDate,
    document_type:   input.documentType,
    document_number: input.documentNumber ?? null,
    partner_name:    input.partnerName ?? null,
    partner_tax_id:  input.partnerTaxId ?? null,
    description:     input.description ?? null,
    debit:           input.debit,
    credit:          input.credit,
    account_code:    input.accountCode ?? null,
    transaction_id:  input.transactionId ?? null,
    invoice_id:      input.invoiceId ?? null,
  });

  return error ? { error: error.message } : { success: true };
}
