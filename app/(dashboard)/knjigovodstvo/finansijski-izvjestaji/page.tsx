import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { formatKM } from "@/lib/utils";
import { requireOrgFeature } from "@/lib/organization/server";
import { getTrialBalance } from "@/app/actions/accounting/reports";
import {
  buildBalanceSheet,
  buildIncomeStatement,
  type StatementRow,
} from "@/lib/accounting/statements";

function RowList({ rows }: { rows: StatementRow[] }) {
  return (
    <>
      {rows.map((r) => (
        <div key={r.code} className="flex justify-between px-4 py-1.5 text-sm border-b last:border-0">
          <span>
            <span className="font-mono text-muted-foreground mr-2">{r.code}</span>
            {r.name}
          </span>
          <span className="font-mono">{formatKM(r.amount)}</span>
        </div>
      ))}
      {rows.length === 0 && (
        <div className="px-4 py-3 text-sm text-muted-foreground">Nema podataka.</div>
      )}
    </>
  );
}

export default async function FinansijskiIzvjestajiPage({
  searchParams,
}: {
  searchParams: Promise<{ godina?: string }>;
}) {
  await requireOrgFeature("general_ledger");

  const { godina } = await searchParams;
  const year = parseInt(godina ?? "", 10) || new Date().getFullYear();

  const res = await getTrialBalance(year);
  const tb = res.rows ?? [];

  const income = buildIncomeStatement(tb);
  const balance = buildBalanceSheet(tb, income.result);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finansijski izvještaji"
        description={`Bilans uspjeha i bilans stanja · ${year}`}
      >
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <a
            href={`/api/pdf?type=finansijski-izvjestaji&year=${year}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="h-4 w-4" />
            Preuzmi PDF
          </a>
        </Button>
      </PageHeader>

      {res.error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {res.error}
        </div>
      )}

      {/* Bilans uspjeha */}
      <section className="rounded-xl border bg-card overflow-hidden">
        <div className="bg-muted/50 px-4 py-2 font-semibold border-b">Bilans uspjeha</div>
        <div className="px-4 py-2 text-xs font-medium text-muted-foreground">Prihodi</div>
        <RowList rows={income.revenueRows} />
        <div className="flex justify-between px-4 py-2 text-sm font-medium bg-muted/30">
          <span>Ukupni prihodi</span>
          <span className="font-mono">{formatKM(income.totalRevenue)}</span>
        </div>
        <div className="px-4 py-2 text-xs font-medium text-muted-foreground">Rashodi</div>
        <RowList rows={income.expenseRows} />
        <div className="flex justify-between px-4 py-2 text-sm font-medium bg-muted/30">
          <span>Ukupni rashodi</span>
          <span className="font-mono">{formatKM(income.totalExpenses)}</span>
        </div>
        <div className="flex justify-between px-4 py-3 font-semibold border-t">
          <span>{income.result >= 0 ? "Dobit (prije poreza)" : "Gubitak"}</span>
          <span className={`font-mono ${income.result >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {formatKM(income.result)}
          </span>
        </div>
      </section>

      {/* Bilans stanja */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 font-semibold border-b">Aktiva</div>
          <RowList rows={balance.assetRows} />
          <div className="flex justify-between px-4 py-3 font-semibold border-t">
            <span>Ukupna aktiva</span>
            <span className="font-mono">{formatKM(balance.totalAssets)}</span>
          </div>
        </div>
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 font-semibold border-b">Pasiva</div>
          <div className="px-4 py-2 text-xs font-medium text-muted-foreground">Obaveze</div>
          <RowList rows={balance.liabilityRows} />
          <div className="px-4 py-2 text-xs font-medium text-muted-foreground">Kapital</div>
          <RowList rows={balance.equityRows} />
          <div className="flex justify-between px-4 py-1.5 text-sm border-b">
            <span>Rezultat tekućeg perioda</span>
            <span className="font-mono">{formatKM(balance.result)}</span>
          </div>
          <div className="flex justify-between px-4 py-3 font-semibold border-t">
            <span>Ukupna pasiva</span>
            <span className="font-mono">
              {formatKM(balance.totalLiabilities + balance.totalEquity + balance.result)}
            </span>
          </div>
        </div>
      </section>

      {Math.abs(balance.difference) > 0.01 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm">
          Aktiva i pasiva se ne slažu (razlika {formatKM(balance.difference)}).
          Provjerite jesu li svi nalozi proknjiženi i u ravnoteži.
        </div>
      )}
    </div>
  );
}
