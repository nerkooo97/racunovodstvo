import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/page-header";
import { formatKM, formatDate } from "@/lib/utils";
import { requireOrgFeature } from "@/lib/organization/server";
import { getActiveYear } from "@/lib/year";
import DepreciationPostButton from "./DepreciationPostButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FixedAssetDeleteButton from "./FixedAssetDeleteButton";

export default async function DugotrajnaImovinaPage() {
  const { supabase, org } = await requireOrgFeature("fixed_assets");
  const year = await getActiveYear();

  const { data: assets } = await supabase
    .from("fixed_assets")
    .select("*, fixed_asset_years(*)")
    .eq("organization_id", org.id)
    .order("acquisition_date", { ascending: true });

  const enriched = (assets ?? []).map((a) => {
    const yearRow = (a.fixed_asset_years ?? []).find(
      (y: { year: number }) => y.year === year
    );
    return { ...a, yearRow };
  });

  const totalAcquisition = enriched.reduce(
    (s, a) => s + (a.acquisition_cost ?? 0),
    0
  );
  const totalAmort = enriched.reduce(
    (s, a) => s + (a.yearRow?.annual_amount ?? 0),
    0
  );
  const totalBookValue = enriched.reduce(
    (s, a) => s + (a.yearRow?.book_value ?? a.acquisition_cost ?? 0),
    0
  );

  return (
    <div>
      <PageHeader
        title={`PLDI-1043 — Dugotrajna imovina · ${year}`}
        description={`${org.name} · Popis stalnih sredstava i obračun amortizacije`}
      >
        <div className="flex gap-2 items-center flex-wrap">
          {org.type === "doo" && <DepreciationPostButton year={year} />}
          <Button asChild variant="outline">
            <Link href="/pldi">Generiši PDF</Link>
          </Button>
          <Button asChild>
            <Link href="/dugotrajnaimovina/nova">+ Novo sredstvo</Link>
          </Button>
        </div>
      </PageHeader>

      {enriched.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="border rounded-md p-3">
            <div className="text-xs text-muted-foreground mb-1">Nabavna vrijednost</div>
            <div className="font-mono font-semibold">{formatKM(totalAcquisition)}</div>
          </div>
          <div className="border rounded-md p-3">
            <div className="text-xs text-muted-foreground mb-1">Amortizacija {year}</div>
            <div className="font-mono font-semibold">{formatKM(totalAmort)}</div>
          </div>
          <div className="border rounded-md p-3">
            <div className="text-xs text-muted-foreground mb-1">Knjig. vrijednost</div>
            <div className="font-mono font-semibold text-emerald-700">
              {formatKM(totalBookValue)}
            </div>
          </div>
        </div>
      )}

      {enriched.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naziv</TableHead>
                <TableHead>Vrsta</TableHead>
                <TableHead>Datum nabavke</TableHead>
                <TableHead className="text-right">Nabavna vr.</TableHead>
                <TableHead className="text-right">Stopa %</TableHead>
                <TableHead className="text-right">Amort. {year}</TableHead>
                <TableHead className="text-right">Knjig. vr. {year}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {enriched.map((a) => (
                <TableRow key={a.id} className={a.disposal_date ? "opacity-60" : undefined}>
                  <TableCell className="font-medium">
                    {a.name}
                    {a.disposal_date && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (otuđeno {formatDate(a.disposal_date)})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.asset_type}</TableCell>
                  <TableCell>{formatDate(a.acquisition_date)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatKM(a.acquisition_cost)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {a.depreciation_rate}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {a.yearRow ? formatKM(a.yearRow.annual_amount) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    {a.yearRow ? formatKM(a.yearRow.book_value) : formatKM(a.acquisition_cost)}
                  </TableCell>
                  <TableCell>
                    <FixedAssetDeleteButton id={a.id} />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold border-t-2 bg-muted/30">
                <TableCell colSpan={3}>UKUPNO</TableCell>
                <TableCell className="text-right font-mono">{formatKM(totalAcquisition)}</TableCell>
                <TableCell />
                <TableCell className="text-right font-mono">{formatKM(totalAmort)}</TableCell>
                <TableCell className="text-right font-mono">{formatKM(totalBookValue)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            Evidencija dugotrajne imovine je prazna. Dodajte prvo sredstvo.
          </p>
          <Button asChild>
            <Link href="/dugotrajnaimovina/nova">Dodaj sredstvo</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
