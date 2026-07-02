"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FormSection from "@/components/shared/form-section";
import { addPurchaseInvoice, uploadPurchaseAttachment } from "@/app/actions/pdv/kuf";
import {
  KUF_DOCUMENT_TYPES,
  MVP_DOCUMENT_CODES,
  NON_DEDUCTIBLE_REASONS,
} from "@/lib/pdv/constants";
import { getTaxConfig } from "@/lib/constants/tax-config";
import { round2 } from "@/lib/pdv/amounts";

interface Partner {
  id: string;
  name: string;
  tax_id: string | null;
  vat_number: string | null;
  address: string | null;
  city: string | null;
  partner_category: string | null;
}

const MANUAL = "__manual__";

export default function KufForm({
  year,
  month,
  partners,
}: {
  year: number;
  month: number;
  partners: Partner[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [docType, setDocType] = useState("01");
  const [partnerId, setPartnerId] = useState(MANUAL);

  const [supplierName, setSupplierName] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [supplierVatId, setSupplierVatId] = useState("");
  const [supplierJib, setSupplierJib] = useState("");
  const [isVatObligor, setIsVatObligor] = useState(true);
  const [category, setCategory] = useState<
    "domestic_company" | "foreign" | "individual" | "uio_customs"
  >("domestic_company");

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date(year, month - 1, 1).toISOString().slice(0, 10)
  );
  const [receiptDate, setReceiptDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [baseAmount, setBaseAmount] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [flatFee, setFlatFee] = useState("");

  const [isDeductible, setIsDeductible] = useState(true);
  const [deductiblePercent, setDeductiblePercent] = useState("100");
  const [ndReason, setNdReason] = useState("representation");

  const [jciNumber, setJciNumber] = useState("");
  const [jciDate, setJciDate] = useState("");
  const [notes, setNotes] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  const isImport = docType === "04";

  const vatRate = useMemo(() => {
    return getTaxConfig(invoiceDate || `${year}-${month}-01`).vatRate * 100;
  }, [invoiceDate, year, month]);

  const withVat = useMemo(() => {
    const b = parseFloat(baseAmount) || 0;
    const v = parseFloat(vatAmount) || 0;
    return round2(b + v);
  }, [baseAmount, vatAmount]);

  function applyVatFromBase() {
    const b = parseFloat(baseAmount) || 0;
    setVatAmount(round2(b * (vatRate / 100)).toFixed(2));
  }

  function onSelectPartner(value: string) {
    setPartnerId(value);
    if (value === MANUAL) return;
    const p = partners.find((x) => x.id === value);
    if (!p) return;
    setSupplierName(p.name);
    setSupplierAddress([p.address, p.city].filter(Boolean).join(", "));
    setSupplierVatId(p.vat_number ?? "");
    setSupplierJib(p.tax_id ?? "");
    setIsVatObligor(!!p.vat_number);
    if (p.partner_category) {
      setCategory(p.partner_category as typeof category);
    }
  }

  function submit() {
    setError(null);
    if (!supplierName.trim()) {
      setError("Naziv dobavljača je obavezan.");
      return;
    }
    if (!invoiceNumber.trim() && !isImport) {
      setError("Broj fakture je obavezan.");
      return;
    }
    if (isImport && !jciNumber.trim()) {
      setError("Za uvoz (JCI) obavezan je broj carinske deklaracije.");
      return;
    }

    startTransition(async () => {
      let attachmentUrl: string | undefined;
      if (attachment) {
        const fd = new FormData();
        fd.set("file", attachment);
        const up = await uploadPurchaseAttachment(fd);
        if (up.error) {
          setError(up.error);
          return;
        }
        attachmentUrl = up.path;
      }

      const res = await addPurchaseInvoice({
        uio_document_type: docType,
        partner_id: partnerId !== MANUAL ? partnerId : "",
        supplier_name: supplierName,
        supplier_address: supplierAddress,
        supplier_vat_id: supplierVatId,
        supplier_jib: supplierJib,
        supplier_is_vat_obligor: isImport ? true : isVatObligor,
        partner_category: isImport ? "uio_customs" : category,
        supplier_invoice_number: isImport ? jciNumber : invoiceNumber,
        supplier_invoice_date: invoiceDate,
        receipt_date: receiptDate,
        amount_without_vat: baseAmount,
        amount_with_vat: String(withVat),
        amount_flat_fee: flatFee,
        vat_input_total: vatAmount,
        is_deductible: isDeductible,
        deductible_percent: isDeductible ? deductiblePercent : "0",
        non_deductible_reason: !isDeductible ? ndReason : undefined,
        jci_number: isImport ? jciNumber : undefined,
        jci_date: isImport ? jciDate : undefined,
        attachment_url: attachmentUrl,
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
                {KUF_DOCUMENT_TYPES.filter((d) =>
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
            <Label>Datum prijema (porezni period)</Label>
            <Input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Dobavljač" compact>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Iz šifrarnika</Label>
            <Select value={partnerId} onValueChange={onSelectPartner}>
              <SelectTrigger>
                <SelectValue placeholder="Odaberi partnera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MANUAL}>Ručni unos</SelectItem>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Naziv dobavljača</Label>
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sjedište (adresa)</Label>
              <Input
                value={supplierAddress}
                onChange={(e) => setSupplierAddress(e.target.value)}
              />
            </div>
          </div>

          {!isImport && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>PDV broj (12 cifara)</Label>
                  <Input
                    value={supplierVatId}
                    onChange={(e) => setSupplierVatId(e.target.value)}
                    placeholder="npr. 200000000009"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>JIB (13 cifara)</Label>
                  <Input
                    value={supplierJib}
                    onChange={(e) => setSupplierJib(e.target.value)}
                    placeholder="npr. 4200000000009"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="vat_obligor"
                  checked={isVatObligor}
                  onCheckedChange={(c) => setIsVatObligor(c === true)}
                />
                <Label htmlFor="vat_obligor" className="font-normal">
                  Dobavljač je PDV obveznik
                </Label>
              </div>
              <div className="space-y-1.5">
                <Label>Kategorija partnera</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as typeof category)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domestic_company">Domaća firma</SelectItem>
                    <SelectItem value="foreign">Strani partner</SelectItem>
                    <SelectItem value="individual">Fizičko lice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      </FormSection>

      {isImport ? (
        <FormSection title="Carinska deklaracija (JCI)" compact>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Broj JCI</Label>
              <Input value={jciNumber} onChange={(e) => setJciNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Datum JCI</Label>
              <Input type="date" value={jciDate} onChange={(e) => setJciDate(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Kod uvoza dobavljač je UIO (carina). PDV i JIB se popunjavaju nulama
            automatski; osnovica i PDV se prepisuju sa carinskog računa.
          </p>
        </FormSection>
      ) : (
        <FormSection title="Faktura" compact>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Broj fakture dobavljača</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Datum fakture</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
          </div>
        </FormSection>
      )}

      <FormSection title="Iznosi" compact>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Osnovica (bez PDV)</Label>
            <Input
              type="number"
              step="0.01"
              value={baseAmount}
              onChange={(e) => setBaseAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center justify-between">
              Ulazni PDV
              <button
                type="button"
                onClick={applyVatFromBase}
                className="text-xs text-primary hover:underline"
              >
                17%
              </button>
            </Label>
            <Input
              type="number"
              step="0.01"
              value={vatAmount}
              onChange={(e) => setVatAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ukupno (sa PDV)</Label>
            <Input value={withVat.toFixed(2)} readOnly className="bg-muted/50" />
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <Label>Paušalna naknada (poljoprivredni otkup)</Label>
          <Input
            type="number"
            step="0.01"
            value={flatFee}
            onChange={(e) => setFlatFee(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </FormSection>

      <FormSection title="Pravo na odbitak pretporeza" compact>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="deductible"
              checked={isDeductible}
              onCheckedChange={(c) => setIsDeductible(c === true)}
            />
            <Label htmlFor="deductible" className="font-normal">
              PDV se može odbiti
            </Label>
          </div>

          {isDeductible ? (
            <div className="space-y-1.5 max-w-xs">
              <Label>Procenat odbitka (srazmjerni odbitak)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={deductiblePercent}
                onChange={(e) => setDeductiblePercent(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                100% za potpuni odbitak. Manje za mješovitu upotrebu.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-w-sm">
              <Label>Razlog (PDV nije odbitan)</Label>
              <Select value={ndReason} onValueChange={setNdReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NON_DEDUCTIBLE_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Reprezentacija i putnička vozila po Zakonu o PDV-u nisu odbitni.
              </p>
            </div>
          )}
        </div>
      </FormSection>

      <FormSection title="Sken originalne fakture / JCI" compact>
        <div className="space-y-1.5">
          <Input
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">
            Opcionalno. PDF ili slika, do 10 MB. Čuva se uz ulazni račun.
          </p>
        </div>
      </FormSection>

      <FormSection title="Napomena" compact>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Opcionalno"
        />
      </FormSection>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/pdv/${year}/${month}`)}
          disabled={isPending}
        >
          Odustani
        </Button>
        <Button onClick={submit} disabled={isPending}>
          {isPending ? "Spremam…" : "Spremi ulazni račun"}
        </Button>
      </div>
    </div>
  );
}
