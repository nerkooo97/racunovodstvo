"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import FormSection from "@/components/shared/form-section";
import { addRetailKifEntry } from "@/app/actions/pdv/kif";
import { round2 } from "@/lib/pdv/amounts";
import { getTaxConfig } from "@/lib/constants/tax-config";

export default function RetailKifForm({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [docNumber, setDocNumber] = useState(
    `Maloprodaja ${String(month).padStart(2, "0")}/${year}`
  );
  const [docDate, setDocDate] = useState(
    new Date(year, month, 0).toISOString().slice(0, 10) // zadnji dan u mjesecu
  );
  const [base17, setBase17] = useState("");
  const [vat17, setVat17] = useState("");
  const [base0, setBase0] = useState("");
  const [notes, setNotes] = useState("");

  const vatRate = useMemo(() => {
    return getTaxConfig(docDate || `${year}-${month}-01`).vatRate * 100;
  }, [docDate, year, month]);

  const total = useMemo(
    () =>
      round2(
        (parseFloat(base17) || 0) + (parseFloat(vat17) || 0) + (parseFloat(base0) || 0)
      ),
    [base17, vat17, base0]
  );

  function deriveFromGross() {
    // Ako korisnik zna bruto promet sa PDV-om, izvuci osnovicu i PDV.
    const gross = parseFloat(base17) || 0;
    if (gross <= 0) return;
    const base = round2(gross / (1 + vatRate / 100));
    setBase17(base.toFixed(2));
    setVat17(round2(gross - base).toFixed(2));
  }

  function submit() {
    setError(null);
    if (!docNumber.trim()) {
      setError("Oznaka prometa je obavezna.");
      return;
    }
    startTransition(async () => {
      const res = await addRetailKifEntry({
        document_number: docNumber,
        document_date: docDate,
        base_17: base17,
        vat_17: vat17,
        base_0: base0,
        notes,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push(`/pdv/${year}/${month}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <FormSection title="Promet" compact>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Oznaka prometa</Label>
            <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Datum (porezni period)</Label>
            <Input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Iznosi (B2C — neobveznici)" compact>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="flex items-center justify-between">
              Osnovica (17%)
              <button
                type="button"
                onClick={deriveFromGross}
                className="text-xs text-primary hover:underline"
                title="Tretiraj uneseni iznos kao bruto sa PDV-om i izvuci osnovicu"
              >
                iz bruto
              </button>
            </Label>
            <Input type="number" step="0.01" value={base17} onChange={(e) => setBase17(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>PDV (17%)</Label>
            <Input type="number" step="0.01" value={vat17} onChange={(e) => setVat17(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Osnovica (0% / oslobođeno)</Label>
            <Input type="number" step="0.01" value={base0} onChange={(e) => setBase0(e.target.value)} />
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Ukupan promet: <span className="font-mono font-medium">{total.toFixed(2)} KM</span>
        </p>
      </FormSection>

      <FormSection title="Napomena" compact>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Opcionalno" />
      </FormSection>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push(`/pdv/${year}/${month}`)} disabled={isPending}>
          Odustani
        </Button>
        <Button onClick={submit} disabled={isPending}>
          {isPending ? "Spremam…" : "Spremi zbirni promet"}
        </Button>
      </div>
    </div>
  );
}
