import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { requireOrgFeature } from "@/lib/organization/server";
import { monthName } from "@/lib/pdv/period";
import { normalizeDigits } from "@/lib/pdv/partner-ids";
import { toLedgerEntry } from "@/lib/pdv/row";
import { aggregatePdvReturn } from "@/lib/pdv/pdv-sd/aggregate";
import PdvSdPanel from "./PdvSdPanel";

export default async function PdvSdPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year: yearStr, month: monthStr } = await params;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    notFound();
  }

  const { supabase, org } = await requireOrgFeature("pdv");

  const [{ data: rawEntries }, { data: orgRow }] = await Promise.all([
    supabase
      .from("pdv_ledger_entries")
      .select("*")
      .eq("organization_id", org.id)
      .eq("period_year", year)
      .eq("period_month", month),
    supabase
      .from("organizations")
      .select("vat_number")
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

  const vatRegistered = normalizeDigits(orgRow?.vat_number).length === 12;

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      <PageHeader
        title="PDV prijava"
        description={`${org.name} · ${monthName(month)} ${year}`}
      >
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/pdv/${year}/${month}`}>
            <ArrowLeft className="h-4 w-4" />
            Nazad
          </Link>
        </Button>
      </PageHeader>

      <PdvSdPanel
        ret={ret}
        year={year}
        month={month}
        vatRegistered={vatRegistered}
      />
    </div>
  );
}
