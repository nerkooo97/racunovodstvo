"use server";

import { requireActiveOrganization } from "@/lib/organization/server";
import { assertFeature } from "@/lib/organization/regime";
import { normalizeDigits } from "@/lib/pdv/partner-ids";
import { toLedgerEntry } from "@/lib/pdv/row";
import { aggregatePdvReturn } from "@/lib/pdv/pdv-sd/aggregate";
import type { PdvReturn, PdvReturnOrgInfo } from "@/lib/pdv/pdv-sd/types";

export interface PdvReturnResult {
  error?: string;
  ret?: PdvReturn;
  org?: PdvReturnOrgInfo;
}

/** Učitava i agregira PDV prijavu za dati period. */
export async function getPdvReturn(
  year: number,
  month: number
): Promise<PdvReturnResult> {
  const { supabase, org } = await requireActiveOrganization();
  const feature = assertFeature(org.type, "pdv");
  if (!feature.ok) return { error: feature.error };

  const [{ data: rawEntries }, { data: orgRow }] = await Promise.all([
    supabase
      .from("pdv_ledger_entries")
      .select("*")
      .eq("organization_id", org.id)
      .eq("period_year", year)
      .eq("period_month", month),
    supabase
      .from("organizations")
      .select("name, vat_number, address, tax_id")
      .eq("id", org.id)
      .single(),
  ]);

  const entries = (rawEntries ?? []).map((r) =>
    toLedgerEntry(r as Record<string, unknown>)
  );

  const ret = aggregatePdvReturn({
    period: { year, month },
    kif: entries.filter((e) => e.record_type === "kif"),
    kuf: entries.filter((e) => e.record_type === "kuf"),
  });

  return {
    ret,
    org: {
      name: orgRow?.name ?? org.name,
      vatNumber: normalizeDigits(orgRow?.vat_number),
      address: orgRow?.address ?? null,
      jib: orgRow?.tax_id ?? null,
    },
  };
}
