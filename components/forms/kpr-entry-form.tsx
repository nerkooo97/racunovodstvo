"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addKprEntry } from "@/app/actions/kpr";
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
  "predračun",
  "avansna faktura",
  "knjižno odobrenje",
  "izvod",
  "gotovinski nalog",
  "plaća",
  "doprinos",    
  "ostalo",
];

const MANUAL_PARTNER = "__manual__";

interface Partner {
  id: string;
  name: string;
  tax_id: string | null;
}

interface Props {
  year: number;
  partners: Partner[];
}

export default function KprEntryForm({ year, partners }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [docType, setDocType] = useState("faktura");
  const [docNumber, setDocNumber] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerTaxId, setPartnerTaxId] = useState("");
  const [description, setDescription] = useState("");

  const [incCash, setIncCash] = useState("");
  const [incBank, setIncBank] = useState("");
  const [incOther, setIncOther] = useState("");
  const [incVat, setIncVat] = useState("");

  const [expGoods, setExpGoods] = useState("");
  const [expSalaries, setExpSalaries] = useState("");
  const [expContribs, setExpContribs] = useState("");
  const [expOther, setExpOther] = useState("");
  const [expVat, setExpVat] = useState("");

  const n = (v: string) => parseFloat(v.replace(",", ".")) || 0;
  const incTotal = n(incCash) + n(incBank) + n(incOther);
  const expTotal = n(expGoods) + n(expSalaries) + n(expContribs) + n(expOther);

  const selectedPartner = partners.find((p) => p.id === partnerId);
  const isManualPartner = !partnerId || partnerId === MANUAL_PARTNER;

  function handlePartnerChange(id: string) {
    setPartnerId(id);
    if (id && id !== MANUAL_PARTNER) {
      const p = partners.find((x) => x.id === id);
      if (p) {
        setPartnerName(p.name);
        setPartnerTaxId(p.tax_id ?? "");
      }
    } else {
      setPartnerName("");
      setPartnerTaxId("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const resolvedName = isManualPartner
      ? partnerName.trim() || null
      : selectedPartner?.name ?? (partnerName.trim() || null);
    const resolvedTaxId = isManualPartner
      ? partnerTaxId.trim() || null
      : selectedPartner?.tax_id ?? (partnerTaxId.trim() || null);
    const resolvedPartnerId =
      !isManualPartner && partnerId ? partnerId : null;

    startTransition(async () => {
      const res = await addKprEntry({
        year,
        entry_date: entryDate,
        document_type: docType,
        document_number: docNumber || null,
        partner_id: resolvedPartnerId,
        partner_name: resolvedName,
        partner_tax_id: resolvedTaxId,
        description: description || null,
        income_cash: n(incCash),
        income_bank: n(incBank),
        income_other: n(incOther),
        income_total: incTotal,
        income_vat: n(incVat),
        expense_goods: n(expGoods),
        expense_salaries: n(expSalaries),
        expense_contribs: n(expContribs),
        expense_other: n(expOther),
        expense_total: expTotal,
        expense_vat: n(expVat),
        debit: expTotal,
        credit: incTotal,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push(`/kpr?godina=${year}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <FormSection title="Dokument">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label>Datum</Label>
            <Input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Vrsta dokumenta</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Broj dokumenta</Label>
            <Input
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="npr. 2026-001"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Partner</Label>
            <Select
              value={partnerId || MANUAL_PARTNER}
              onValueChange={handlePartnerChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Odaberi partnera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MANUAL_PARTNER}>— Ručni unos —</SelectItem>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.tax_id ? ` · JIB ${p.tax_id}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {partners.length === 0 ? (
              <p className="text-xs text-muted-foreground pt-1">
                Nema partnera.{" "}
                <Link href="/partneri/novi" className="underline">
                  Dodaj partnera
                </Link>
              </p>
            ) : null}
          </div>
          {isManualPartner ? (
            <>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Naziv partnera</Label>
                <Input
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="Ime ili naziv"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">JIB / Porezni broj</Label>
                <Input
                  value={partnerTaxId}
                  onChange={(e) => setPartnerTaxId(e.target.value)}
                  placeholder="Opciono"
                />
              </div>
            </>
          ) : selectedPartner ? (
            <div className="col-span-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="font-medium">{selectedPartner.name}</span>
              {selectedPartner.tax_id ? (
                <span className="text-muted-foreground"> · JIB {selectedPartner.tax_id}</span>
              ) : null}
            </div>
          ) : null}
          <div className="col-span-2 flex flex-col gap-1">
            <Label>Opis</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Prihodi (KM)">
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Gotovina</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={incCash}
              onChange={(e) => setIncCash(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Banka</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={incBank}
              onChange={(e) => setIncBank(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Ostalo</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={incOther}
              onChange={(e) => setIncOther(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">PDV (izlazni)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={incVat}
              onChange={(e) => setIncVat(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        {incTotal > 0 && (
          <div className="text-sm font-semibold text-green-700">
            Ukupno prihodi: {incTotal.toFixed(2)} KM
            {n(incVat) > 0 && <span className="font-normal text-muted-foreground ml-2">(PDV: {n(incVat).toFixed(2)} KM)</span>}
          </div>
        )}
      </FormSection>

      <FormSection title="Rashodi (KM)">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Nabavna vrijednost robe</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={expGoods}
              onChange={(e) => setExpGoods(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Bruto plaće</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={expSalaries}
              onChange={(e) => setExpSalaries(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Doprinosi</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={expContribs}
              onChange={(e) => setExpContribs(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Ostali rashodi</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={expOther}
              onChange={(e) => setExpOther(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">PDV (ulazni)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={expVat}
              onChange={(e) => setExpVat(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        {expTotal > 0 && (
          <div className="text-sm font-semibold text-red-700">
            Ukupno rashodi: {expTotal.toFixed(2)} KM
            {n(expVat) > 0 && <span className="font-normal text-muted-foreground ml-2">(PDV: {n(expVat).toFixed(2)} KM)</span>}
          </div>
        )}
      </FormSection>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3 pb-8">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Snimanje..." : "Dodaj u KPR"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/kpr?godina=${year}`)}
        >
          Otkaži
        </Button>
      </div>
    </form>
  );
}
