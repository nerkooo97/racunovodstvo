import PageHeader from "@/components/shared/page-header";
import { formatKM, formatDate } from "@/lib/utils";
import { requireOrgFeature } from "@/lib/organization/server";
import { listJournalEntries } from "@/app/actions/accounting/journal";
import ManualJournalForm from "./ManualJournalForm";
import JournalEntryActions from "./JournalEntryActions";

const SOURCE_LABEL: Record<string, string> = {
  manual: "Ručno",
  invoice_out: "Faktura",
  invoice_cn: "Knjižno odobr.",
  purchase: "Ulazni račun",
  jci: "Uvoz (JCI)",
  salary: "Plate",
  bank: "Banka",
  retail: "Maloprodaja",
};

export default async function DnevnikPage({
  searchParams,
}: {
  searchParams: Promise<{ godina?: string }>;
}) {
  await requireOrgFeature("general_ledger");

  const { godina } = await searchParams;
  const year = parseInt(godina ?? "", 10) || new Date().getFullYear();

  const res = await listJournalEntries(year);
  const entries = res.entries ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dnevnik knjiženja"
        description={`Nalozi za knjiženje · ${year}`}
      />

      {res.error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {res.error}
        </div>
      )}

      <ManualJournalForm />

      <div className="space-y-4">
        {entries.map((e) => {
          const debit = e.lines.reduce((s, l) => s + Number(l.debit), 0);
          return (
            <div key={e.id} className="rounded-xl border bg-card overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-mono font-medium">{e.entry_number}</span>
                  <span className="text-muted-foreground">{formatDate(e.entry_date)}</span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">
                    {SOURCE_LABEL[e.source_type] ?? e.source_type}
                  </span>
                  <span className="text-muted-foreground">{e.description}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">{formatKM(debit)}</span>
                  <JournalEntryActions id={e.id} canDelete={e.source_type === "manual"} />
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="px-4 py-1 text-left w-24">Konto</th>
                    <th className="px-2 py-1 text-left">Opis</th>
                    <th className="px-4 py-1 text-right w-28">Duguje</th>
                    <th className="px-4 py-1 text-right w-28">Potražuje</th>
                  </tr>
                </thead>
                <tbody>
                  {e.lines.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="px-4 py-1 font-mono">{l.account_code}</td>
                      <td className="px-2 py-1">{l.account_name || l.description}</td>
                      <td className="px-4 py-1 text-right font-mono">
                        {Number(l.debit) ? formatKM(Number(l.debit)) : ""}
                      </td>
                      <td className="px-4 py-1 text-right font-mono">
                        {Number(l.credit) ? formatKM(Number(l.credit)) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        {entries.length === 0 && (
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nema naloga za {year}. Dodajte ručni nalog ili proknjižite PDV period
            iz modula PDV.
          </p>
        )}
      </div>
    </div>
  );
}
