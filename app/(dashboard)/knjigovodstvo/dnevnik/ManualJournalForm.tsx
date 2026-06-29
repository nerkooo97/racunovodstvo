"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createJournalEntry } from "@/app/actions/accounting/journal";
import { round2 } from "@/lib/pdv/amounts";

interface Line {
  account_code: string;
  description: string;
  debit: string;
  credit: string;
}

const EMPTY: Line = { account_code: "", description: "", debit: "", credit: "" };

export default function ManualJournalForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY }, { ...EMPTY }]);

  const totals = useMemo(() => {
    const d = round2(lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0));
    const c = round2(lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0));
    return { d, c, balanced: d === c && d > 0 };
  }, [lines]);

  function update(i: number, field: keyof Line, value: string) {
    setLines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function submit() {
    setError(null);
    if (!totals.balanced) {
      setError("Nalog mora biti u ravnoteži (duguje = potražuje) i veći od nule.");
      return;
    }
    startTransition(async () => {
      const res = await createJournalEntry({
        entry_date: date,
        description,
        lines: lines
          .filter((l) => l.account_code.trim())
          .map((l) => ({
            account_code: l.account_code.trim(),
            description: l.description,
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
          })),
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setLines([{ ...EMPTY }, { ...EMPTY }]);
      setDescription("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Novi nalog
      </Button>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Datum</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Opis</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              <th className="px-2 py-1 text-left w-28">Konto</th>
              <th className="px-2 py-1 text-left">Opis</th>
              <th className="px-2 py-1 text-right w-28">Duguje</th>
              <th className="px-2 py-1 text-right w-28">Potražuje</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td className="px-2 py-1">
                  <Input
                    value={l.account_code}
                    onChange={(e) => update(i, "account_code", e.target.value)}
                    className="h-7 text-xs font-mono"
                    placeholder="2000"
                  />
                </td>
                <td className="px-2 py-1">
                  <Input
                    value={l.description}
                    onChange={(e) => update(i, "description", e.target.value)}
                    className="h-7 text-xs"
                  />
                </td>
                <td className="px-2 py-1">
                  <Input
                    inputMode="decimal"
                    value={l.debit}
                    onChange={(e) => update(i, "debit", e.target.value)}
                    className="h-7 text-xs text-right"
                  />
                </td>
                <td className="px-2 py-1">
                  <Input
                    inputMode="decimal"
                    value={l.credit}
                    onChange={(e) => update(i, "credit", e.target.value)}
                    className="h-7 text-xs text-right"
                  />
                </td>
                <td className="px-2 py-1">
                  {lines.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((_, x) => x !== i))}
                      className="text-muted-foreground hover:text-destructive text-xs"
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-medium">
              <td className="px-2 py-1 text-xs text-muted-foreground" colSpan={2}>
                {totals.balanced ? "U ravnoteži" : "Nije u ravnoteži"}
              </td>
              <td className="px-2 py-1 text-right font-mono">{totals.d.toFixed(2)}</td>
              <td className="px-2 py-1 text-right font-mono">{totals.c.toFixed(2)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={() => setLines((prev) => [...prev, { ...EMPTY }])}>
          + Dodaj stavku
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
            Odustani
          </Button>
          <Button size="sm" onClick={submit} disabled={isPending || !totals.balanced}>
            {isPending ? "Spremam…" : "Spremi nalog"}
          </Button>
        </div>
      </div>
    </div>
  );
}
