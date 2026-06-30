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
import ReceivedInvoiceDeleteButton from "./ReceivedInvoiceDeleteButton";

export default async function PrimljeneFakturePage({
  searchParams,
}: {
  searchParams: Promise<{ godina?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, org } = await requireOrgFeature("received_invoices");

  const currentYear = new Date().getFullYear();
  const year = parseInt(sp.godina ?? "") || currentYear;
  const status = sp.status ?? "sve";

  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const { data: invoices } = await supabase
    .from("received_invoices")
    .select("*")
    .eq("organization_id", org.id)
    .gte("invoice_date", from)
    .lte("invoice_date", to)
    .order("invoice_date", { ascending: false });

  const all = invoices ?? [];
  const filtered =
    status === "neplacene"
      ? all.filter((i) => (i.paid_amount ?? 0) < i.amount)
      : status === "placene"
      ? all.filter((i) => (i.paid_amount ?? 0) >= i.amount)
      : all;

  const totalAmount = filtered.reduce((s, i) => s + i.amount, 0);
  const totalPaid = filtered.reduce((s, i) => s + (i.paid_amount ?? 0), 0);
  const totalUnpaid = totalAmount - totalPaid;

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div>
      <PageHeader
        title={`Primljene fakture · ${year}`}
        description={`${org.name} · Evidencija ulaznih računa`}
      >
        <Button asChild>
          <Link href="/primljene-fakture/nova">+ Nova faktura</Link>
        </Button>
      </PageHeader>

      <div className="flex gap-2 mb-4 flex-wrap">
        {years.map((y) => (
          <Link
            key={y}
            href={`/primljene-fakture?godina=${y}`}
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

      <div className="flex gap-2 mb-4">
        {(["sve", "neplacene", "placene"] as const).map((s) => (
          <Link
            key={s}
            href={`/primljene-fakture?godina=${year}&status=${s}`}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              status === s
                ? "bg-secondary text-secondary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {s === "sve" ? "Sve" : s === "neplacene" ? "Neplaćene" : "Plaćene"}
          </Link>
        ))}
      </div>

      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="border rounded-md p-3">
            <div className="text-xs text-muted-foreground mb-1">Ukupno fakturisano</div>
            <div className="font-mono font-semibold">{formatKM(totalAmount)}</div>
          </div>
          <div className="border rounded-md p-3">
            <div className="text-xs text-muted-foreground mb-1">Plaćeno</div>
            <div className="font-mono font-semibold text-emerald-700">{formatKM(totalPaid)}</div>
          </div>
          <div className="border rounded-md p-3">
            <div className="text-xs text-muted-foreground mb-1">Neplaćeno</div>
            <div className={`font-mono font-semibold ${totalUnpaid > 0 ? "text-destructive" : ""}`}>
              {formatKM(totalUnpaid)}
            </div>
          </div>
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dobavljač</TableHead>
                <TableHead>Broj fakture</TableHead>
                <TableHead>Datum fakture</TableHead>
                <TableHead>Datum prijema</TableHead>
                <TableHead className="text-right">Iznos (KM)</TableHead>
                <TableHead>Datum plaćanja</TableHead>
                <TableHead className="text-right">Plaćeno (KM)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => {
                const isPaid = (inv.paid_amount ?? 0) >= inv.amount;
                return (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div className="font-medium">{inv.partner_name}</div>
                      {inv.partner_tax_id && (
                        <div className="text-xs text-muted-foreground">{inv.partner_tax_id}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {inv.invoice_number ?? "—"}
                    </TableCell>
                    <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                    <TableCell>
                      {inv.received_date ? formatDate(inv.received_date) : "—"}
                    </TableCell>
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
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isPaid ? "Plaćeno" : "Neplaćeno"}
                        </span>
                        {inv.gl_entry_id && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                            GK ✓
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ReceivedInvoiceDeleteButton id={inv.id} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            Nema primljenih faktura za izabrani period.
          </p>
          <Button asChild>
            <Link href="/primljene-fakture/nova">Dodaj fakturu</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
