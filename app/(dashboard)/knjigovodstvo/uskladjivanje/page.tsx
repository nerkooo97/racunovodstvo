import PageHeader from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatKM } from "@/lib/utils";
import { requireOrgFeature } from "@/lib/organization/server";
import { monthName } from "@/lib/pdv/period";
import { getPdvGlReconciliation } from "@/app/actions/accounting/reports";

export default async function UskladjivanjePage({
  searchParams,
}: {
  searchParams: Promise<{ godina?: string; mjesec?: string }>;
}) {
  await requireOrgFeature("general_ledger");

  const now = new Date();
  const { godina, mjesec } = await searchParams;
  const year = parseInt(godina ?? "", 10) || now.getFullYear();
  const month = parseInt(mjesec ?? "", 10) || now.getMonth() + 1;

  const res = await getPdvGlReconciliation(year, month);
  const rows = res.rows ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usklađivanje PDV ↔ glavna knjiga"
        description={`${monthName(month)} ${year}`}
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
              <TableHead>Stavka</TableHead>
              <TableHead className="text-right w-32">PDV evidencija</TableHead>
              <TableHead className="text-right w-32">Glavna knjiga</TableHead>
              <TableHead className="text-right w-32">Razlika</TableHead>
              <TableHead className="w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.label}</TableCell>
                <TableCell className="text-right font-mono">{formatKM(r.pdv)}</TableCell>
                <TableCell className="text-right font-mono">{formatKM(r.gl)}</TableCell>
                <TableCell className="text-right font-mono">{formatKM(r.difference)}</TableCell>
                <TableCell>
                  {r.ok ? (
                    <Badge variant="outline" className="text-[10px] text-emerald-600">Usklađeno</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] text-destructive">Razlika</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        Ako postoji razlika, provjerite jeste li proknjižili PDV period u glavnu
        knjigu (dugme „Proknjiži u GK" na stranici perioda) i da su sve stavke
        ispravno klasifikovane.
      </p>
    </div>
  );
}
