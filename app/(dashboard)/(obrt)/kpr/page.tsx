import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/page-header";
import { formatKM, formatDate } from "@/lib/utils";
import { requireOrgFeature } from "@/lib/organization/server";
import { getActiveYear } from "@/lib/year";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function KprPage() {
  const { supabase, org } = await requireOrgFeature("kpr");
  const year = await getActiveYear();

  const { data: entries } = await supabase
    .from("kpr_entries")
    .select("*")
    .eq("organization_id", org.id)
    .eq("year", year)
    .order("entry_number", { ascending: true });

  const totals = (entries ?? []).reduce(
    (acc, e) => ({
      income:  acc.income  + (e.income_total  ?? e.credit ?? 0),
      expense: acc.expense + (e.expense_total ?? e.debit  ?? 0),
      incomeVat:  acc.incomeVat  + (e.income_vat  ?? 0),
      expenseVat: acc.expenseVat + (e.expense_vat ?? 0),
    }),
    { income: 0, expense: 0, incomeVat: 0, expenseVat: 0 }
  );

  return (
    <div>
      <PageHeader title={`KPR-1041 — ${year}`} description={org.name}>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={`/api/pdf/kpr?godina=${year}`} target="_blank" rel="noreferrer">
              Preuzmi PDF
            </a>
          </Button>
          <Button asChild>
            <Link href="/kpr/novi">+ Ručni unos</Link>
          </Button>
        </div>
      </PageHeader>

      {/* Kumulativni zbir */}
      {entries && entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="border rounded-md p-3">
            <div className="text-xs text-muted-foreground mb-1">Ukupni prihodi</div>
            <div className="font-mono font-semibold text-green-700">{formatKM(totals.income)}</div>
          </div>
          <div className="border rounded-md p-3">
            <div className="text-xs text-muted-foreground mb-1">Ukupni rashodi</div>
            <div className="font-mono font-semibold text-red-700">{formatKM(totals.expense)}</div>
          </div>
          <div className="border rounded-md p-3">
            <div className="text-xs text-muted-foreground mb-1">Neto (prihod − rashod)</div>
            <div className={`font-mono font-semibold ${totals.income - totals.expense >= 0 ? "text-green-700" : "text-red-700"}`}>
              {formatKM(totals.income - totals.expense)}
            </div>
          </div>
          {(totals.incomeVat > 0 || totals.expenseVat > 0) && (
            <div className="border rounded-md p-3">
              <div className="text-xs text-muted-foreground mb-1">PDV neto</div>
              <div className="font-mono font-semibold">
                {formatKM(totals.incomeVat - totals.expenseVat)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Izlazni: {formatKM(totals.incomeVat)} · Ulazni: {formatKM(totals.expenseVat)}
              </div>
            </div>
          )}
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
                <TableHead>Partner</TableHead>
                <TableHead>Opis</TableHead>
                <TableHead className="text-right">Prihodi (KM)</TableHead>
                <TableHead className="text-right">PDV izl.</TableHead>
                <TableHead className="text-right">Rashodi (KM)</TableHead>
                <TableHead className="text-right">PDV ul.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => {
                const income  = e.income_total  ?? e.credit ?? 0;
                const expense = e.expense_total ?? e.debit  ?? 0;
                const incVat  = e.income_vat  ?? 0;
                const expVat  = e.expense_vat ?? 0;
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-sm">{e.entry_number}</TableCell>
                    <TableCell>{formatDate(e.entry_date)}</TableCell>
                    <TableCell>{e.document_type}</TableCell>
                    <TableCell>{e.document_number ?? "—"}</TableCell>
                    <TableCell>{e.partner_name ?? "—"}</TableCell>
                    <TableCell>{e.description ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-green-700">
                      {income > 0 ? formatKM(income) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {incVat > 0 ? formatKM(incVat) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-700">
                      {expense > 0 ? formatKM(expense) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {expVat > 0 ? formatKM(expVat) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="font-bold border-t-2 bg-muted/30">
                <TableCell colSpan={6}>UKUPNO {year}</TableCell>
                <TableCell className="text-right font-mono text-green-700">{formatKM(totals.income)}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">{totals.incomeVat > 0 ? formatKM(totals.incomeVat) : "—"}</TableCell>
                <TableCell className="text-right font-mono text-red-700">{formatKM(totals.expense)}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">{totals.expenseVat > 0 ? formatKM(totals.expenseVat) : "—"}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            KPR se automatski popunjava iz potvrđenih bankovnih transakcija i gotovine.
          </p>
          <Button asChild>
            <Link href="/kpr/novi">Dodaj ručni unos</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
