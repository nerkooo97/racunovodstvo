import Link from "next/link";
import { notFound } from "next/navigation";
import { getPartnerCard } from "@/app/actions/accounting/partner-analytics";
import { YearSelect } from "../YearSelect";

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
  manual: "Ručni nalog",
  invoice_out: "Izlazna faktura",
  invoice_cn: "Knjižno odobrenje",
  purchase: "Ulazna faktura",
  jci: "JCI / Carina",
  salary: "Obračun plata",
  bank: "Bankovni izvod",
  retail: "Maloprodaja",
};

export default async function PartnerCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ partnerId: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { partnerId } = await params;
  const sp = await searchParams;
  const year = sp.year ? parseInt(sp.year, 10) : undefined;

  const { partner, lines, error } = await getPartnerCard(partnerId, year);

  if (error === "Partner nije pronađen.") notFound();
  if (!partner) notFound();

  const totalDebit = (lines ?? []).reduce((s, l) => s + l.debit, 0);
  const totalCredit = (lines ?? []).reduce((s, l) => s + l.credit, 0);
  const finalBalance = totalDebit - totalCredit;

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/saldakonti" className="hover:text-foreground transition-colors">
          Saldakonti
        </Link>
        <span>›</span>
        <span className="text-foreground font-medium">{partner.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{partner.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {partner.tax_id ? `JIB/PDV: ${partner.tax_id} · ` : ""}
            Analitička kartica{year ? ` za ${year}.` : " (sve godine)"}
          </p>
        </div>

        <YearSelect
          value={year?.toString() ?? ""}
          basePath={`/saldakonti/${partnerId}`}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Sažetak */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Ukupno duguje</p>
          <p className="text-xl font-semibold mt-1">{fmt(totalDebit)} KM</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Ukupno potražuje</p>
          <p className="text-xl font-semibold mt-1">{fmt(totalCredit)} KM</p>
        </div>
        <div className={`rounded-lg border bg-card p-4 ${
          finalBalance > 0
            ? "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20"
            : finalBalance < 0
              ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20"
              : ""
        }`}>
          <p className="text-sm text-muted-foreground">Krajnji saldo</p>
          <p className={`text-xl font-semibold mt-1 ${
            finalBalance > 0 ? "text-blue-700" : finalBalance < 0 ? "text-amber-700" : ""
          }`}>
            {finalBalance >= 0 ? fmt(finalBalance) : `(${fmt(Math.abs(finalBalance))})`} KM
            {finalBalance !== 0 && (
              <span className="text-sm ml-1 font-normal">
                {finalBalance > 0 ? "(duguje)" : "(potražuje)"}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Kartica */}
      <div className="rounded-lg border overflow-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-3 text-left font-medium">Rb.</th>
              <th className="px-3 py-3 text-left font-medium">Datum</th>
              <th className="px-3 py-3 text-left font-medium">Broj naloga</th>
              <th className="px-3 py-3 text-left font-medium">Tip</th>
              <th className="px-3 py-3 text-left font-medium">Konto</th>
              <th className="px-3 py-3 text-left font-medium max-w-xs">Opis</th>
              <th className="px-3 py-3 text-right font-medium">Duguje</th>
              <th className="px-3 py-3 text-right font-medium">Potražuje</th>
              <th className="px-3 py-3 text-right font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(!lines || lines.length === 0) && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  Nema knjiženja za ovog partnera{year ? ` u ${year}.` : "."}
                </td>
              </tr>
            )}
            {(lines ?? []).map((line, idx) => (
              <tr key={line.line_id} className="hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2.5 text-muted-foreground">{idx + 1}.</td>
                <td className="px-3 py-2.5">{fmtDate(line.entry_date)}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{line.entry_number}</td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                    {SOURCE_LABELS[line.source_type] ?? line.source_type}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-mono text-xs">
                  {line.account_code}
                  <span className="ml-1 text-muted-foreground font-sans">{line.account_name}</span>
                </td>
                <td className="px-3 py-2.5 max-w-xs truncate text-muted-foreground">
                  {line.line_description || line.journal_description || "—"}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {line.debit > 0 ? fmt(line.debit) : ""}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {line.credit > 0 ? fmt(line.credit) : ""}
                </td>
                <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${
                  line.running_balance > 0
                    ? "text-blue-700"
                    : line.running_balance < 0
                      ? "text-amber-700"
                      : "text-muted-foreground"
                }`}>
                  {line.running_balance >= 0
                    ? fmt(line.running_balance)
                    : `(${fmt(Math.abs(line.running_balance))})`}
                </td>
              </tr>
            ))}
          </tbody>
          {lines && lines.length > 0 && (
            <tfoot className="bg-muted/30 border-t font-semibold">
              <tr>
                <td colSpan={6} className="px-3 py-3">Ukupno</td>
                <td className="px-3 py-3 text-right tabular-nums">{fmt(totalDebit)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{fmt(totalCredit)}</td>
                <td className={`px-3 py-3 text-right tabular-nums ${
                  finalBalance > 0 ? "text-blue-700" : finalBalance < 0 ? "text-amber-700" : ""
                }`}>
                  {finalBalance >= 0 ? fmt(finalBalance) : `(${fmt(Math.abs(finalBalance))})`}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Link za IOS */}
      {lines && lines.length > 0 && (
        <div className="flex justify-end">
          <Link
            href={`/saldakonti/${partnerId}/ios${year ? `?year=${year}` : ""}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
          >
            Generiši IOS (Izvod otvorenih stavki) →
          </Link>
        </div>
      )}
    </div>
  );
}
