import Link from "next/link";
import { getPartnerBalances } from "@/app/actions/accounting/partner-analytics";
import { getActiveYear } from "@/lib/year";

function fmt(n: number) {
  return new Intl.NumberFormat("bs-BA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

const TYPE_LABELS: Record<string, string> = {
  customer: "Kupac",
  supplier: "Dobavljač",
  employee: "Zaposlenik",
  other: "Ostalo",
};

export default async function SaldakontiPage({
  searchParams,
}: {
  searchParams: Promise<{ tip?: string }>;
}) {
  const params = await searchParams;
  const year = await getActiveYear();
  const tip = params.tip ?? "all";

  const { data, error } = await getPartnerBalances(year);

  const filtered = (data ?? []).filter((p) => {
    if (tip === "all") return true;
    return p.partner_type === tip;
  });

  const totalDebit = filtered.reduce((s, p) => s + p.total_debit, 0);
  const totalCredit = filtered.reduce((s, p) => s + p.total_credit, 0);
  const totalBalance = filtered.reduce((s, p) => s + p.balance, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Saldakonti — analitičke kartice</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pregled stanja po partnerima iz glavne knjige (Član 18. ZRR FBiH) · {year}.
        </p>
      </div>

      {/* Filteri */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 rounded-lg border p-1">
          {["all", "customer", "supplier"].map((t) => (
            <Link
              key={t}
              href={`/saldakonti?tip=${t}`}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                tip === t
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {t === "all" ? "Svi" : t === "customer" ? "Kupci" : "Dobavljači"}
            </Link>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Zbirni kartice */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Ukupno duguje</p>
          <p className="text-xl font-semibold mt-1">{fmt(totalDebit)} KM</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Ukupno potražuje</p>
          <p className="text-xl font-semibold mt-1">{fmt(totalCredit)} KM</p>
        </div>
        <div className={`rounded-lg border bg-card p-4 ${totalBalance > 0 ? "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20" : totalBalance < 0 ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20" : ""}`}>
          <p className="text-sm text-muted-foreground">Saldo</p>
          <p className={`text-xl font-semibold mt-1 ${totalBalance > 0 ? "text-blue-700" : totalBalance < 0 ? "text-amber-700" : ""}`}>
            {fmt(Math.abs(totalBalance))} KM {totalBalance > 0 ? "(D)" : totalBalance < 0 ? "(P)" : ""}
          </p>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Partner</th>
              <th className="px-4 py-3 text-left font-medium">Tip</th>
              <th className="px-4 py-3 text-left font-medium">JIB/PDV</th>
              <th className="px-4 py-3 text-right font-medium">Duguje (KM)</th>
              <th className="px-4 py-3 text-right font-medium">Potražuje (KM)</th>
              <th className="px-4 py-3 text-right font-medium">Saldo (KM)</th>
              <th className="px-4 py-3 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Nema podataka. Proknjižite PDV stavke ili bankovne izvode.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.partner_id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">{p.partner_name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    p.partner_type === "customer"
                      ? "bg-blue-100 text-blue-700"
                      : p.partner_type === "supplier"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-600"
                  }`}>
                    {TYPE_LABELS[p.partner_type] ?? p.partner_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.partner_tax_id ?? "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(p.total_debit)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(p.total_credit)}</td>
                <td className={`px-4 py-3 text-right tabular-nums font-medium ${
                  p.balance > 0 ? "text-blue-700" : p.balance < 0 ? "text-amber-700" : "text-muted-foreground"
                }`}>
                  {p.balance >= 0 ? fmt(p.balance) : `(${fmt(Math.abs(p.balance))})`}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/saldakonti/${p.partner_id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Kartica →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="bg-muted/30 border-t font-semibold">
              <tr>
                <td className="px-4 py-3" colSpan={3}>Ukupno</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(totalDebit)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(totalCredit)}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${totalBalance > 0 ? "text-blue-700" : totalBalance < 0 ? "text-amber-700" : ""}`}>
                  {totalBalance >= 0 ? fmt(totalBalance) : `(${fmt(Math.abs(totalBalance))})`}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
