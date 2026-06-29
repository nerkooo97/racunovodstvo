"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importStatement, createTransaction } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/shared/page-header";
import FormSection from "@/components/shared/form-section";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const BANKS = [
  "UniCredit Bank",
  "Raiffeisen Bank",
  "Sparkasse Bank",
  "KIB (Komercijalna investiciona banka)",
  "BBI (Bosna Bank International)",
  "MF Bank (Moja finansijska banka)",
  "Ziraat Bank",
  "Ručni unos",
];

interface TxRow {
  transaction_date: string;
  amount: string;
  direction: "credit" | "debit";
  counterparty_name: string;
  description: string;
  reference_number: string;
}

const EMPTY_TX: TxRow = {
  transaction_date: new Date().toISOString().slice(0, 10),
  amount: "",
  direction: "credit",
  counterparty_name: "",
  description: "",
  reference_number: "",
};

export default function UveziIzvodPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [bank, setBank]               = useState(BANKS[0]);
  const [accountNumber, setAccount]   = useState("");
  const [periodFrom, setPeriodFrom]   = useState("");
  const [periodTo, setPeriodTo]       = useState("");
  const [opening, setOpening]         = useState("0");
  const [closing, setClosing]         = useState("0");
  const [rows, setRows]               = useState<TxRow[]>([{ ...EMPTY_TX }]);

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_TX }]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, field: keyof TxRow, value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("bank", bank);
    formData.set("account_number", accountNumber);
    formData.set("period_from", periodFrom);
    formData.set("period_to", periodTo);
    formData.set("opening_balance", opening);
    formData.set("closing_balance", closing);

    startTransition(async () => {
      const stmtResult = await importStatement(formData);
      if (stmtResult.error) { setError(stmtResult.error); return; }

      const txRows = rows
        .filter((r) => r.amount && parseFloat(r.amount) > 0)
        .map((r) => ({
          transaction_date:    r.transaction_date,
          amount:              parseFloat(r.amount),
          direction:           r.direction,
          counterparty_name:   r.counterparty_name || undefined,
          description:         r.description || undefined,
          reference_number:    r.reference_number || undefined,
        }));

      if (txRows.length > 0) {
        const txResult = await createTransaction(stmtResult.statementId!, txRows);
        if (txResult.error) { setError(txResult.error); return; }
      }

      router.push("/bankovni-izvod");
    });
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <PageHeader title="Uvezi bankovni izvod" description="Ručno unesite transakcije iz bankovnog izvoda.">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/bankovni-izvod">
            <ArrowLeft className="h-4 w-4" />
            Nazad na izvode
          </Link>
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <FormSection title="Podaci izvoda">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <Label>Banka</Label>
            <Select value={bank} onValueChange={setBank}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Broj računa</Label>
            <Input value={accountNumber} onChange={(e) => setAccount(e.target.value)} />
          </div>
          <div />
          <div className="flex flex-col gap-1">
            <Label>Period od</Label>
            <Input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Period do</Label>
            <Input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Početno stanje (KM)</Label>
            <Input type="text" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Završno stanje (KM)</Label>
            <Input type="text" inputMode="decimal" value={closing} onChange={(e) => setClosing(e.target.value)} />
          </div>
        </div>
        </FormSection>

        <FormSection title="Transakcije">
          <div className="border rounded-md overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 py-2 text-left w-32">Datum</th>
                  <th className="px-2 py-2 text-left w-24">Vrsta</th>
                  <th className="px-2 py-2 text-right w-24">Iznos (KM)</th>
                  <th className="px-2 py-2 text-left">Partner / naziv</th>
                  <th className="px-2 py-2 text-left">Opis</th>
                  <th className="px-2 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-muted/10" : ""}>
                    <td className="px-2 py-1">
                      <Input
                        type="date"
                        value={row.transaction_date}
                        onChange={(e) => updateRow(idx, "transaction_date", e.target.value)}
                        className="h-7 text-xs"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Select
                        value={row.direction}
                        onValueChange={(v) => updateRow(idx, "direction", v)}
                      >
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit">Uplata</SelectItem>
                          <SelectItem value="debit">Isplata</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={row.amount}
                        onChange={(e) => updateRow(idx, "amount", e.target.value)}
                        className="h-7 text-xs text-right"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        value={row.counterparty_name}
                        onChange={(e) => updateRow(idx, "counterparty_name", e.target.value)}
                        className="h-7 text-xs"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        value={row.description}
                        onChange={(e) => updateRow(idx, "description", e.target.value)}
                        className="h-7 text-xs"
                      />
                    </td>
                    <td className="px-2 py-1">
                      {rows.length > 1 && (
                        <button type="button" onClick={() => removeRow(idx)}
                          className="text-muted-foreground hover:text-destructive text-xs">✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addRow} className="mt-2">
            + Dodaj transakciju
          </Button>
        </FormSection>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pb-8">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Uvoz..." : "Uvezi izvod"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/bankovni-izvod")}>
            Otkaži
          </Button>
        </div>
      </form>
    </div>
  );
}
