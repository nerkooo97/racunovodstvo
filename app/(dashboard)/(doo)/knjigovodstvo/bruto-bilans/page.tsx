import Link from "next/link";
import PageHeader from "@/components/shared/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatKM } from "@/lib/utils";
import { requireOrgFeature } from "@/lib/organization/server";
import { getTrialBalance } from "@/app/actions/accounting/reports";
import { getActiveYear } from "@/lib/year";

export default async function BrutoBilansPage({
  searchParams,
}: {
  searchParams: Promise<{ mjesec?: string }>;
}) {
  await requireOrgFeature("general_ledger");
  const year = await getActiveYear();
  const { mjesec } = await searchParams;
  const month = mjesec ? parseInt(mjesec, 10) : undefined;

  const res = await getTrialBalance(year, month);
  const rows = res.rows ?? [];

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bruto bilans"
        description={`Promet i saldo po kontu · ${year}${month ? `, do ${month}. mjeseca` : ""}`}
      />

      {res.error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {res.error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Konto</TableHead>
              <TableHead>Naziv</TableHead>
              <TableHead className="text-right w-32">Duguje</TableHead>
              <TableHead className="text-right w-32">Potražuje</TableHead>
              <TableHead className="text-right w-32">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.code}>
                <TableCell className="font-mono">
                  <Link
                    href={`/knjigovodstvo/kartica/${r.code}`}
                    className="text-primary hover:underline"
                  >
                    {r.code}
                  </Link>
                </TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell className="text-right font-mono">{formatKM(r.debit)}</TableCell>
                <TableCell className="text-right font-mono">{formatKM(r.credit)}</TableCell>
                <TableCell className="text-right font-mono">{formatKM(r.balance)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nema proknjiženih naloga za odabrani period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-semibold">Ukupno</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatKM(totalDebit)}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatKM(totalCredit)}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatKM(totalDebit - totalCredit)}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
