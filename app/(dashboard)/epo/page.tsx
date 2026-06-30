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

type TabType = "potrazivanja" | "obaveze";

export default async function EpoPage({
  searchParams,
}: {
  searchParams: Promise<{ godina?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, org } = await requireOrgFeature("received_invoices");

  const currentYear = new Date().getFullYear();
  const year = parseInt(sp.godina ?? "") || currentYear;
  const tab: TabType =
    sp.tab === "obaveze" ? "obaveze" : "potrazivanja";

  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const [{ data: issuedInvoices }, { data: receivedInvoices }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("id, invoice_number, issue_date, payment_date, paid_amount, total, partners(name)")
        .eq("organization_id", org.id)
        .gte("issue_date", from)
        .lte("issue_date", to)
        .order("issue_date", { ascending: false }),
      supabase
        .from("received_invoices")
        .select("*")
        .eq("organization_id", org.id)
        .gte("invoice_date", from)
        .lte("invoice_date", to)
        .order("invoice_date", { ascending: false }),
    ]);

  const issued = issuedInvoices ?? [];
  const received = receivedInvoices ?? [];

  const totalReceivables = issued.reduce(
    (s: number, i: any) => s + (i.total ?? 0),
    0
  );
  const totalReceivablesPaid = issued.reduce(
    (s: number, i: any) => s + (i.paid_amount ?? 0),
    0
  );
  const totalPayables = received.reduce((s, i) => s + i.amount, 0);
  const totalPayablesPaid = received.reduce(
    (s, i) => s + (i.paid_amount ?? 0),
    0
  );

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div>
      <PageHeader
        title={`EPO-1044 — Evidencija potraživanja i obaveza · ${year}`}
        description={`${org.name} · Pravilnik čl. 51`}
      >
        <Button asChild>
          <Link href="/primljene-fakture/nova">+ Nova primljena faktura</Link>
        </Button>
      </PageHeader>

      <div className="flex gap-2 mb-4 flex-wrap">
        {years.map((y) => (
          <Link
            key={y}
            href={`/epo?godina=${y}&tab=${tab}`}
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border rounded-md p-4">
          <div className="text-xs text-muted-foreground mb-1">
            Potraživanja (izdate fakture)
          </div>
          <div className="font-mono text-lg font-bold">{formatKM(totalReceivables)}</div>
          <div className="mt-1 text-xs">
            <span className="text-emerald-700">
              Naplaćeno: {formatKM(totalReceivablesPaid)}
            </span>
            {" · "}
            <span className={totalReceivables - totalReceivablesPaid > 0 ? "text-amber-700" : ""}>
              Dospjelo: {formatKM(totalReceivables - totalReceivablesPaid)}
            </span>
          </div>
        </div>
        <div className="border rounded-md p-4">
          <div className="text-xs text-muted-foreground mb-1">
            Obaveze (primljene fakture)
          </div>
          <div className="font-mono text-lg font-bold">{formatKM(totalPayables)}</div>
          <div className="mt-1 text-xs">
            <span className="text-emerald-700">
              Plaćeno: {formatKM(totalPayablesPaid)}
            </span>
            {" · "}
            <span className={totalPayables - totalPayablesPaid > 0 ? "text-destructive" : ""}>
              Neplaćeno: {formatKM(totalPayables - totalPayablesPaid)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b">
        <Link
          href={`/epo?godina=${year}&tab=potrazivanja`}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "potrazivanja"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Potraživanja ({issued.length})
        </Link>
        <Link
          href={`/epo?godina=${year}&tab=obaveze`}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "obaveze"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Obaveze ({received.length})
        </Link>
      </div>

      {tab === "potrazivanja" ? (
        issued.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kupac</TableHead>
                  <TableHead>Broj fakture</TableHead>
                  <TableHead>Datum fakture</TableHead>
                  <TableHead className="text-right">Iznos (KM)</TableHead>
                  <TableHead>Datum naplate</TableHead>
                  <TableHead className="text-right">Naplaćeno (KM)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issued.map((inv: any) => {
                  const amount = inv.total ?? 0;
                  const paid = inv.paid_amount ?? 0;
                  const isPaid = paid >= amount;
                  const partnerName =
                    inv.partners?.name ?? "—";
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{partnerName}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {inv.invoice_number ?? "—"}
                      </TableCell>
                      <TableCell>{formatDate(inv.issue_date)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatKM(amount)}
                      </TableCell>
                      <TableCell>
                        {inv.payment_date ? formatDate(inv.payment_date) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {paid > 0 ? formatKM(paid) : "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isPaid ? "Naplaćeno" : "Otvoreno"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            Nema izdatih faktura za {year}. godinu.
          </div>
        )
      ) : received.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dobavljač</TableHead>
                <TableHead>Broj fakture</TableHead>
                <TableHead>Datum fakture</TableHead>
                <TableHead className="text-right">Iznos (KM)</TableHead>
                <TableHead>Datum plaćanja</TableHead>
                <TableHead className="text-right">Plaćeno (KM)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {received.map((inv) => {
                const isPaid = (inv.paid_amount ?? 0) >= inv.amount;
                return (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div className="font-medium">{inv.partner_name}</div>
                      {inv.partner_tax_id && (
                        <div className="text-xs text-muted-foreground">
                          {inv.partner_tax_id}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {inv.invoice_number ?? "—"}
                    </TableCell>
                    <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {formatKM(inv.amount)}
                    </TableCell>
                    <TableCell>
                      {inv.payment_date ? formatDate(inv.payment_date) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {inv.paid_amount > 0 ? formatKM(inv.paid_amount) : "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          isPaid
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {isPaid ? "Plaćeno" : "Neplaćeno"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nema primljenih faktura za {year}. godinu.{" "}
          <Link href="/primljene-fakture/nova" className="underline underline-offset-2">
            Dodaj prvu.
          </Link>
        </div>
      )}
    </div>
  );
}
