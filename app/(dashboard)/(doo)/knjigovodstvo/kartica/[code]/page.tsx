import Link from "next/link";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatKM, formatDate } from "@/lib/utils";
import { requireOrgFeature } from "@/lib/organization/server";
import { getAccountCard } from "@/app/actions/accounting/reports";
import { getActiveYear } from "@/lib/year";

export default async function KarticaKontaPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requireOrgFeature("general_ledger");

  const { code } = await params;
  const year = await getActiveYear();

  const res = await getAccountCard(code, year);
  const rows = res.rows ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Kartica konta ${code}`}
        description={`${res.name ?? ""} · ${year}`}
      >
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/knjigovodstvo/bruto-bilans">
            <ArrowLeft className="h-4 w-4" />
            Bruto bilans
          </Link>
        </Button>
      </PageHeader>

      {res.error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {res.error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Nalog</TableHead>
              <TableHead className="w-28">Datum</TableHead>
              <TableHead>Opis</TableHead>
              <TableHead className="text-right w-28">Duguje</TableHead>
              <TableHead className="text-right w-28">Potražuje</TableHead>
              <TableHead className="text-right w-28">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-sm">{r.entry_number}</TableCell>
                <TableCell className="text-sm">{formatDate(r.entry_date)}</TableCell>
                <TableCell className="text-sm">{r.description}</TableCell>
                <TableCell className="text-right font-mono">{r.debit ? formatKM(r.debit) : ""}</TableCell>
                <TableCell className="text-right font-mono">{r.credit ? formatKM(r.credit) : ""}</TableCell>
                <TableCell className="text-right font-mono">{formatKM(r.balance)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nema prometa na ovom kontu za {year}.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
