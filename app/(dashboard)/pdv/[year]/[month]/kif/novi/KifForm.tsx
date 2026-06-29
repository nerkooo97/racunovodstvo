"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import FormSection from "@/components/shared/form-section";
import { addManualKifEntry } from "@/app/actions/pdv/kif";
import {
  KIF_DOCUMENT_TYPES,
  MVP_DOCUMENT_CODES,
  SALE_CATEGORIES,
  VAT_RATE,
} from "@/lib/pdv/constants";
import { round2 } from "@/lib/pdv/amounts";

export default function KifForm({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [docType, setDocType] = useState("01");
  const [docNumber, setDocNumber] = useState("");
  const [docDate, setDocDate] = useState(
    new Date(year, month - 1, 1).toISOString().slice(0, 10)
  );
  const [saleCategory, setSaleCategory] = useState("internal_use");
  const [partnerName, setPartnerName] = useState("");
  const [partnerAddress, setPartnerAddress] = useState("");
  const [partnerVatId, setPartnerVatId] = useState("");
  const [partnerJib, setPartnerJib] = useState("");

  const [base17, setBase17] = useState("");
  const [vat17, setVat17] = useState("");
  const [base0, setBase0] = useState("");
  const [notes, setNotes] = useState("");

  const total = useMemo(() => {
    return round2(
      (parseFloat(base17) || 0) + (parseFloat(vat17) || 0) + (parseFloat(base0) || 0)
    );
  }, [base17, vat17, base0]);

  function applyVat() {
    const b = parseFloat(base17) || 0;
    setVat17(round2(b * (VAT_RATE / 100)).toFixed(2));
  }

  function submit() {
    setError(null);
    if (!docNumber.trim()) {
      setError("Broj dokumenta je obavezan.");
      return;
    }
    if (!partnerName.trim()) {
      setError("Naziv je obavezan.");
      return;
    }
    startTransition(async () => {
      const res = await addManualKifEntry({
        uio_document_type: docType,
        document_number: docNumber,
        document_date: docDate,
        sale_category: saleCategory as
          | "domestic_b2b"
          | "domestic_b2c"
          | "export_goods"
          | "export_services"
          | "exempt"
          | "internal_use",
        partner_name: partnerName,
        partner_address: partnerAddress,
        partner_vat_id: partnerVatId,
        partner_jib: partnerJib,
        partner_category: partnerVatId ? "domestic_company" : "individual",
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

      <FormSection title="Dokument" compact>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Tip dokumenta</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIF_DOCUMENT_TYPES.filter((d) =>
                  MVP_DOCUMENT_CODES.includes(d.code)
                ).map((d) => (
                  <SelectItem key={d.code} value={d.code}>
                    {d.code} — {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Kategorija isporuke</Label>
            <Select value={saleCategory} onValueChange={setSaleCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Broj dokumenta</Label>
            <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Datum (porezni period)</Label>
            <Input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Partner / opis" compact>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Naziv (ili opis isporuke)</Label>
            <Input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Adresa</Label>
            <Input value={partnerAddress} onChange={(e) => setPartnerAddress(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>PDV broj (12 cifara)</Label>
            <Input value={partnerVatId} onChange={(e) => setPartnerVatId(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>JIB (13 cifara)</Label>
            <Input value={partnerJib} onChange={(e) => setPartnerJib(e.target.value)} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Iznosi" compact>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Osnovica (17%)</Label>
            <Input type="number" step="0.01" value={base17} onChange={(e) => setBase17(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center justify-between">
              PDV (17%)
              <button type="button" onClick={applyVat} className="text-xs text-primary hover:underline">
                17%
              </button>
            </Label>
            <Input type="number" step="0.01" value={vat17} onChange={(e) => setVat17(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Osnovica (0% / oslobođeno)</Label>
            <Input type="number" step="0.01" value={base0} onChange={(e) => setBase0(e.target.value)} />
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Ukupno: <span className="font-mono font-medium">{total.toFixed(2)} KM</span>
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
          {isPending ? "Spremam…" : "Spremi KIF stavku"}
        </Button>
      </div>
    </div>
  );
}
