import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/page-header";
import { formatKM, formatDate } from "@/lib/utils";
import { requireOrgFeature } from "@/lib/organization/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteKpEntry } from "@/app/actions/kp";
import KpDeleteButton from "./KpDeleteButton";

export default async function KpPage({
  searchParams,
}: {
  searchParams: Promise<{ godina?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, org } = await requireOrgFeature("kp");

  const currentYear = new Date().getFullYear();
  const year = parseInt(sp.godina ?? "") || currentYear;

  const { data: entries } = await supabase
    .from("kp_entries")
    .select("*")
    .eq("organization_id", org.id)
    .eq("year", year)
    .order("entry_number", { ascending: true });

  const totals = (entries ?? []).reduce(
    (acc, e) => ({
      cash: acc.cash + (e.cash_amount ?? 0),
      noncash: acc.noncash + (e.noncash_amount ?? 0),
      total: acc.total + (e.total_amount ?? 0),
    }),
    { cash: 0, noncash: 0, total: 0 }
  );

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div>
      <PageHeader
        title={`KP-1042 — Knjiga prometa · ${year}`}
        description={`${org.name} · Dnevna evidencija naplaćenog prometa`}
      >
        <Button asChild>
          <Link href={`/kp/novi?godina=${year}`}>+ Novi unos</Link>
        </Button>
      </PageHeader>

      <div className="flex gap-2 mb-4">
        {years.map((y) => (
          <Link
            key={y}
            href={`/kp?godina=${y}`}
            className={`px-3 py-1 rounded-md border text-sm transition-colors ${
              y === year
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {y}
          </Link>
        ))}
      </div>

      {entries && entries.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="border rounded-md p-3">
            <div className="text-xs text-muted-foreground mb-1">Gotovina + čekovi</div>
            <div className="font-mono font-semibold">{formatKM(totals.cash)}</div>
          </div>
          <div className="border rounded-md p-3">
            <div className="text-xs text-muted-foreground mb-1">Bezgotovinsko</div>
            <div className="font-mono font-semibold">{formatKM(totals.noncash)}</div>
          </div>
          <div className="border rounded-md p-3">
            <div className="text-xs text-muted-foreground mb-1">Ukupni promet</div>
            <div className="font-mono font-semibold text-emerald-700">{formatKM(totals.total)}</div>
          </div>
        </div>
      )}

      {entries && entries.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">R.br.</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Vrsta dok.</TableHead>
                <TableHead>Broj dok.</TableHead>
                <TableHead className="text-right">Gotovina (kol.12)</TableHead>
                <TableHead className="text-right">Bezgot. (kol.13)</TableHead>
                <TableHead className="text-right">Ukupno (kol.14)</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-sm">{e.entry_number}</TableCell>
                  <TableCell>{formatDate(e.entry_date)}</TableCell>
                  <TableCell>{e.document_type ?? "—"}</TableCell>
                  <TableCell>{e.document_number ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {e.cash_amount > 0 ? formatKM(e.cash_amount) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {e.noncash_amount > 0 ? formatKM(e.noncash_amount) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    {formatKM(e.total_amount)}
                  </TableCell>
                  <TableCell>
                    <KpDeleteButton id={e.id} />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold border-t-2 bg-muted/30">
                <TableCell colSpan={4}>UKUPNO {year}</TableCell>
                <TableCell className="text-right font-mono">{formatKM(totals.cash)}</TableCell>
                <TableCell className="text-right font-mono">{formatKM(totals.noncash)}</TableCell>
                <TableCell className="text-right font-mono">{formatKM(totals.total)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            Knjiga prometa se popunjava ručno ili automatski iz bankovnih transakcija.
          </p>
          <Button asChild>
            <Link href={`/kp/novi?godina=${year}`}>Dodaj prvi unos</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
