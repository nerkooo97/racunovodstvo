"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addKpEntry } from "@/app/actions/kp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FormSection from "@/components/shared/form-section";

const DOC_TYPES = [
  "faktura",
  "dnevni promet (kasa)",
  "gotovinski nalog",
  "bankovna doznaka",
  "ček",
  "ostalo",
];

interface Props {
  year: number;
}

export default function KpEntryForm({ year }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [docType, setDocType] = useState("dnevni promet (kasa)");
  const [docNumber, setDocNumber] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [noncashAmount, setNoncashAmount] = useState("");
  const [notes, setNotes] = useState("");

  const n = (v: string) => parseFloat(v.replace(",", ".")) || 0;
  const total = n(cashAmount) + n(noncashAmount);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await addKpEntry({
        year,
        entry_date: entryDate,
        document_number: docNumber || null,
        document_type: docType || null,
        cash_amount: n(cashAmount),
        noncash_amount: n(noncashAmount),
        notes: notes || null,
      });

      if (res.error) {
        setError(res.error);
      } else {
        router.push(`/kp?godina=${year}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <FormSection title="Dokument">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="entry_date">Datum naplate</Label>
            <Input
              id="entry_date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc_type">Vrsta dokumenta</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger id="doc_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc_number">Broj dokumenta</Label>
            <Input
              id="doc_number"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="npr. 2026-001"
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Iznosi (KM)">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cash_amount">
              Gotovina i čekovi
              <span className="text-xs text-muted-foreground ml-1">(kol. 12)</span>
            </Label>
            <Input
              id="cash_amount"
              type="number"
              min={0}
              step="0.01"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="noncash_amount">
              Bezgotovinsko od pravnih lica
              <span className="text-xs text-muted-foreground ml-1">(kol. 13)</span>
            </Label>
            <Input
              id="noncash_amount"
              type="number"
              min={0}
              step="0.01"
              value={noncashAmount}
              onChange={(e) => setNoncashAmount(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>
              Ukupno
              <span className="text-xs text-muted-foreground ml-1">(kol. 14)</span>
            </Label>
            <Input
              value={total.toFixed(2)}
              readOnly
              className="bg-muted font-mono"
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Napomena">
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Opcionalna napomena"
        />
      </FormSection>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Čuvanje..." : "Sačuvaj unos"}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/kp?godina=${year}`}>Odustani</Link>
        </Button>
      </div>
    </form>
  );
}
