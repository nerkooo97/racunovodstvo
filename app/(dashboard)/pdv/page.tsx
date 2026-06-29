import Link from "next/link";
import PageHeader from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { formatKM } from "@/lib/utils";
import { requireOrgFeature } from "@/lib/organization/server";
import { monthName } from "@/lib/pdv/period";

interface PeriodSummary {
  year: number;
  month: number;
  status: "open" | "locked" | "submitted" | null;
  kifVat: number;
  kufVatDeductible: number;
  liability: number;
}

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  open: { label: "Otvoren", variant: "outline" },
  locked: { label: "Zaključan", variant: "secondary" },
  submitted: { label: "Predan", variant: "default" },
};

export default async function PdvPage() {
  const { supabase, org } = await requireOrgFeature("pdv");

  const now = new Date();
  const months: { year: number; month: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const oldest = months[months.length - 1];

  const [{ data: entries }, { data: periods }] = await Promise.all([
    supabase
      .from("pdv_ledger_entries")
      .select(
        "record_type, period_year, period_month, kif_vat_registered, kif_vat_unregistered, kuf_vat_deductible"
      )
      .eq("organization_id", org.id)
      .gte("period_year", oldest.year),
    supabase
      .from("pdv_periods")
      .select("year, month, status")
      .eq("organization_id", org.id)
      .gte("year", oldest.year),
  ]);

  const summaries: PeriodSummary[] = months.map(({ year, month }) => {
    const rows = (entries ?? []).filter(
      (e) => e.period_year === year && e.period_month === month
    );
    const kifVat = rows
      .filter((r) => r.record_type === "kif")
      .reduce((s, r) => s + (r.kif_vat_registered ?? 0) + (r.kif_vat_unregistered ?? 0), 0);
    const kufVatDeductible = rows
      .filter((r) => r.record_type === "kuf")
      .reduce((s, r) => s + (r.kuf_vat_deductible ?? 0), 0);
    const periodRow = (periods ?? []).find((p) => p.year === year && p.month === month);
    return {
      year,
      month,
      status: (periodRow?.status as PeriodSummary["status"]) ?? null,
      kifVat,
      kufVatDeductible,
      liability: kifVat - kufVatDeductible,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="PDV evidencije (e-KIF / e-KUF)"
        description={`${org.name} · obaveza dostave do 20. u mjesecu za prethodni period`}
      />

      {!org.is_vat_registered && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm">
          Organizacija nije označena kao PDV obveznik u profilu. e-KIF/e-KUF se
          dostavljaju samo ako ste u sistemu PDV-a.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map((s) => {
          const statusInfo = s.status ? STATUS_LABEL[s.status] : null;
          return (
            <Link
              key={`${s.year}-${s.month}`}
              href={`/pdv/${s.year}/${s.month}`}
              className="group rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">
                  {monthName(s.month)} {s.year}
                </span>
                {statusInfo ? (
                  <Badge variant={statusInfo.variant} className="text-[10px]">
                    {statusInfo.label}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Bez prometa
                  </Badge>
                )}
              </div>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Izlazni PDV</dt>
                  <dd className="font-mono">{formatKM(s.kifVat)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Odbitni ulazni</dt>
                  <dd className="font-mono">{formatKM(s.kufVatDeductible)}</dd>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <dt className="font-medium">Obaveza</dt>
                  <dd
                    className={`font-mono font-semibold ${
                      s.liability > 0 ? "text-destructive" : "text-emerald-600"
                    }`}
                  >
                    {formatKM(s.liability)}
                  </dd>
                </div>
              </dl>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
