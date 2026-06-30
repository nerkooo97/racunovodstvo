import Link from "next/link";
import { notFound } from "next/navigation";
import { getPartnerOpenItems } from "@/app/actions/accounting/partner-analytics";
import { requireActiveOrganization } from "@/lib/organization/server";
import { PrintButton } from "./PrintButton";

function fmt(n: number) {
  return new Intl.NumberFormat("bs-BA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

const SOURCE_LABELS: Record<string, string> = {
  manual: "Nalog",
  invoice_out: "Faktura",
  invoice_cn: "Odobrenje",
  purchase: "Ul. faktura",
  jci: "JCI",
  salary: "Plate",
  bank: "Banka",
  retail: "Maloprodaja",
};

export default async function IosPage({
  params,
  searchParams,
}: {
  params: Promise<{ partnerId: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { partnerId } = await params;
  const sp = await searchParams;
  const year = sp.year ? parseInt(sp.year, 10) : undefined;

  const asOfDate = year
    ? `${year}-12-31`
    : new Date().toISOString().slice(0, 10);

  const { partner, items, error } = await getPartnerOpenItems(partnerId, asOfDate);

  if (error === "Partner nije pronađen.") notFound();
  if (!partner) notFound();

  const { org } = await requireActiveOrganization();

  const totalDebit = (items ?? []).reduce((s, i) => s + i.debit, 0);
  const totalCredit = (items ?? []).reduce((s, i) => s + i.credit, 0);
  const totalBalance = totalDebit - totalCredit;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/saldakonti" className="hover:text-foreground transition-colors">
          Saldakonti
        </Link>
        <span>›</span>
        <Link href={`/saldakonti/${partnerId}`} className="hover:text-foreground transition-colors">
          {partner.name}
        </Link>
        <span>›</span>
        <span className="text-foreground font-medium">IOS</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Izvod otvorenih stavki (IOS)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Presječni datum: {fmtDate(asOfDate)} · Član 23. ZRR FBiH · Rok odgovora: 8 dana
          </p>
        </div>
        <PrintButton />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* IOS Dokument */}
      <div className="rounded-lg border bg-card p-6 space-y-6 print:border-0 print:p-0">
        {/* Zaglavlje */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Vjerovnik (naša firma)</p>
            <p className="font-semibold">{org.name}</p>
            <p className="text-sm text-muted-foreground">PIB/JIB: {org.tax_id ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Dužnik / Poverilac</p>
            <p className="font-semibold">{partner.name}</p>
            <p className="text-sm text-muted-foreground">JIB/PDV: {partner.tax_id ?? "—"}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h2 className="text-lg font-semibold mb-1">
            Izvod otvorenih stavki na dan {fmtDate(asOfDate)}
          </h2>
          <p className="text-sm text-muted-foreground">
            Datum izrade: {fmtDate(today)} · Neizmirene obaveze/potraživanja zaključno s presječnim datumom
          </p>
        </div>

        {/* Tabela otvorenih stavki */}
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Rb.</th>
                <th className="px-3 py-2 text-left font-medium">Datum</th>
                <th className="px-3 py-2 text-left font-medium">Tip</th>
                <th className="px-3 py-2 text-left font-medium max-w-xs">Opis</th>
                <th className="px-3 py-2 text-right font-medium">Duguje (KM)</th>
                <th className="px-3 py-2 text-right font-medium">Potražuje (KM)</th>
                <th className="px-3 py-2 text-right font-medium">Saldo (KM)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(!items || items.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    Nema otvorenih stavki na presječni datum.
                  </td>
                </tr>
              )}
              {(items ?? []).map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/20">
                  <td className="px-3 py-2 text-muted-foreground">{idx + 1}.</td>
                  <td className="px-3 py-2">{fmtDate(item.entry_date)}</td>
                  <td className="px-3 py-2">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      {SOURCE_LABELS[item.source_type] ?? item.source_type}
                    </span>
                  </td>
                  <td className="px-3 py-2 max-w-xs truncate text-muted-foreground">
                    {item.description || "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {item.debit > 0 ? fmt(item.debit) : ""}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {item.credit > 0 ? fmt(item.credit) : ""}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums font-medium ${
                    item.balance > 0 ? "text-blue-700" : "text-amber-700"
                  }`}>
                    {item.balance >= 0 ? fmt(item.balance) : `(${fmt(Math.abs(item.balance))})`}
                  </td>
                </tr>
              ))}
            </tbody>
            {items && items.length > 0 && (
              <tfoot className="bg-muted/30 border-t font-semibold">
                <tr>
                  <td colSpan={4} className="px-3 py-3">UKUPNO</td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmt(totalDebit)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmt(totalCredit)}</td>
                  <td className={`px-3 py-3 text-right tabular-nums ${
                    totalBalance > 0 ? "text-blue-700" : totalBalance < 0 ? "text-amber-700" : ""
                  }`}>
                    {totalBalance >= 0 ? fmt(totalBalance) : `(${fmt(Math.abs(totalBalance))})`}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Potpisi */}
        {items && items.length > 0 && (
          <div className="grid grid-cols-2 gap-8 pt-6 border-t">
            <div className="space-y-12">
              <p className="text-sm font-medium">Potvrđujem ispravnost navedenih podataka:</p>
              <div className="border-t border-gray-400 pt-2">
                <p className="text-xs text-muted-foreground">Datum i potpis ovlaštene osobe — {org.name}</p>
              </div>
            </div>
            <div className="space-y-12">
              <p className="text-sm text-muted-foreground">
                Molimo potvrdite ili priložite prigovor u roku od <strong>8 dana</strong> od prijema ovog izvoda.
              </p>
              <div className="border-t border-gray-400 pt-2">
                <p className="text-xs text-muted-foreground">Datum i potpis ovlaštene osobe — {partner.name}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
