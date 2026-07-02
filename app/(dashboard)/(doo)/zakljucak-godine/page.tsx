import Link from "next/link";
import { requireOrgFeature } from "@/lib/organization/server";
import { getYearEndSummary } from "@/app/actions/accounting/year-end";
import { getInventoryStatus } from "@/app/actions/accounting/inventory";
import { getActiveYear } from "@/lib/year";
import YearEndActions from "./YearEndActions";

function fmt(n: number) {
  return new Intl.NumberFormat("bs-BA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default async function ZakljucakGodinePage() {
  const year = await getActiveYear();
  await requireOrgFeature("general_ledger");

  const [{ data, error }, inventoryRes] = await Promise.all([
    getYearEndSummary(year),
    getInventoryStatus(year),
  ]);

  // Korak razduženja zaliha prikazujemo samo ako konto 1300 ima promet
  const inv = inventoryRes.data;
  const showInventory = !!inv && (inv.bookBalance !== 0 || inv.alreadyAdjusted);

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Zaključak poslovne godine</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Godišnji zaključni nalozi po FBiH kontnom okviru (SN 81/21) · {year}.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Sažetak iz GK */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Prihodi (kl. 6)</p>
              <p className="text-xl font-semibold mt-1 text-emerald-700">{fmt(data.totalRevenue)} KM</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Rashodi (kl. 5)</p>
              <p className="text-xl font-semibold mt-1 text-amber-700">{fmt(data.totalExpenses)} KM</p>
            </div>
            <div className={`rounded-lg border p-4 ${data.accountingProfit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Računov. dobit</p>
              <p className={`text-xl font-semibold mt-1 ${data.accountingProfit >= 0 ? "text-emerald-700" : "text-destructive"}`}>
                {fmt(data.accountingProfit)} KM
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-amber-50 border-amber-200 p-4 text-sm text-amber-800 space-y-1">
            <p className="font-medium">Redoslijed koraka (zakonska obaveza):</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs">
              <li>Proknjiži amortizaciju stalnih sredstava (D 5400 / P 0290)</li>
              <li>Razduži zalihe po popisu — inventura (D 5010 / P 1300)</li>
              <li>Izračunaj porezni bilans i porez na dobit (10%)</li>
              <li>Zatvori godinu (5 automatskih naloga)</li>
              <li>Otvori novu godinu (prenos bilansnih konta)</li>
            </ol>
          </div>

          <YearEndActions
            year={year}
            accountingProfit={data.accountingProfit}
            alreadyClosed={data.alreadyClosed}
            inventoryBookBalance={showInventory ? inv!.bookBalance : null}
            inventoryAdjusted={inv?.alreadyAdjusted ?? false}
          />
        </>
      )}

      <div className="pt-4 border-t">
        <Link href="/knjigovodstvo/dnevnik" className="text-sm text-primary hover:underline">
          Pregledaj sve naloge u Dnevniku →
        </Link>
      </div>
    </div>
  );
}
