"use server";

import { requireActiveOrganization } from "@/lib/organization/server";
import { assertFeature } from "@/lib/organization/regime";
import { normalizeDigits } from "@/lib/pdv/partner-ids";
import { toLedgerEntry } from "@/lib/pdv/row";
import { buildKifCsv } from "@/lib/pdv/export/kif-csv";
import { buildKufCsv } from "@/lib/pdv/export/kuf-csv";
import { buildSplitCsv } from "@/lib/pdv/export/split";
import type { LedgerEntry } from "@/lib/pdv/types";
import {
  validateForExport,
  type ValidationResult,
} from "@/lib/pdv/validation/export-gate";
import type { TaxPeriod } from "@/lib/pdv/period";

export interface ExportFile {
  filename: string;
  content: string;
}

export interface ExportResult {
  error?: string;
  validation?: ValidationResult;
  files?: ExportFile[];
  tooLarge?: boolean;
}

async function loadEntries(
  supabase: Awaited<ReturnType<typeof requireActiveOrganization>>["supabase"],
  orgId: string,
  recordType: "kif" | "kuf",
  year: number,
  month: number
) {
  const { data } = await supabase
    .from("pdv_ledger_entries")
    .select("*")
    .eq("organization_id", orgId)
    .eq("record_type", recordType)
    .eq("period_year", year)
    .eq("period_month", month)
    .order("serial_number", { ascending: true });
  return (data ?? []).map((r) => toLedgerEntry(r as Record<string, unknown>));
}

export async function generateExport(
  recordType: "kif" | "kuf",
  year: number,
  month: number
): Promise<ExportResult> {
  const { supabase, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "pdv");
  if (!feature.ok) return { error: feature.error };

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("name, vat_number")
    .eq("id", org.id)
    .single();

  const vatNumber = normalizeDigits(orgRow?.vat_number);
  const period: TaxPeriod = { year, month };
  const entries = await loadEntries(supabase, org.id, recordType, year, month);

  const orgInfo = { vatNumber, name: orgRow?.name ?? "" };

  const validation = validateForExport({
    org: orgInfo,
    period,
    recordType,
    entries,
  });

  if (!validation.ok) {
    return { validation };
  }

  // Bez stavki — po čl. 7 obveznik ne mora dostaviti praznu evidenciju
  if (entries.length === 0) {
    return {
      validation,
      error: "Nema stavki za ovaj period — evidencija se ne mora dostaviti.",
    };
  }

  // Redni broj datoteke iz perioda
  const { data: periodRow } = await supabase
    .from("pdv_periods")
    .select("kif_file_seq, kuf_file_seq")
    .eq("organization_id", org.id)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  const fileSeq =
    recordType === "kif"
      ? periodRow?.kif_file_seq ?? 1
      : periodRow?.kuf_file_seq ?? 1;

  // Automatski split na više datoteka (< 5 MB svaka).
  const buildOne = (subset: LedgerEntry[], seq: number) =>
    recordType === "kif"
      ? buildKifCsv({ org: orgInfo, period, entries: subset, fileSeq: seq })
      : buildKufCsv({ org: orgInfo, period, entries: subset, fileSeq: seq });

  const built = buildSplitCsv(entries, buildOne, fileSeq);

  // Zabilježi vrijeme exporta
  await supabase
    .from("pdv_periods")
    .update(
      recordType === "kif"
        ? { kif_exported_at: new Date().toISOString() }
        : { kuf_exported_at: new Date().toISOString() }
    )
    .eq("organization_id", org.id)
    .eq("year", year)
    .eq("month", month);

  return {
    validation,
    files: built.map((b) => ({ filename: b.filename, content: b.content })),
  };
}

/**
 * Generiše testni CSV s reprezentativnim uzorcima (za provjeru importa na UIO
 * test-portalu). Ne dira stvarne podatke; koristi fiktivni PDV broj.
 */
export async function generateTestExport(
  recordType: "kif" | "kuf"
): Promise<ExportResult> {
  const { org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "pdv");
  if (!feature.ok) return { error: feature.error };

  const { SAMPLE_VAT_NUMBER, sampleKifEntries, sampleKufEntries } = await import(
    "@/lib/pdv/export/test-data"
  );

  const period: TaxPeriod = { year: 2025, month: 6 };
  const orgInfo = { vatNumber: SAMPLE_VAT_NUMBER, name: org.name };
  const entries =
    recordType === "kif" ? sampleKifEntries() : sampleKufEntries();

  const built =
    recordType === "kif"
      ? buildKifCsv({ org: orgInfo, period, entries, fileSeq: 1 })
      : buildKufCsv({ org: orgInfo, period, entries, fileSeq: 1 });

  return {
    files: [{ filename: built.filename, content: built.content }],
  };
}

/** Samo validacija (za prikaz checkliste bez preuzimanja). */
export async function validateExport(
  recordType: "kif" | "kuf",
  year: number,
  month: number
): Promise<{ error?: string; validation?: ValidationResult }> {
  const { supabase, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "pdv");
  if (!feature.ok) return { error: feature.error };

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("name, vat_number")
    .eq("id", org.id)
    .single();

  const entries = await loadEntries(supabase, org.id, recordType, year, month);
  const validation = validateForExport({
    org: { vatNumber: normalizeDigits(orgRow?.vat_number), name: orgRow?.name ?? "" },
    period: { year, month },
    recordType,
    entries,
  });
  return { validation };
}
