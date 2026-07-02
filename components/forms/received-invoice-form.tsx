"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addReceivedInvoice } from "@/app/actions/received-invoices";
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
import type { OrgType } from "@/lib/organization/regime";

interface Partner {
  id: string;
  name: string;
  tax_id: string | null;
}

interface Props {
  partners: Partner[];
  orgType: OrgType;
  isVatRegistered: boolean;
}

export default function ReceivedInvoiceForm({ partners, orgType, isVatRegistered }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isDoo = orgType === "doo";

  // Zajednička polja
  const [partnerId, setPartnerId] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerTaxId, setPartnerTaxId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [receivedDate, setReceivedDate] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");

  // Obrt: ukupan iznos
  const [amount, setAmount] = useState("");

  // DOO: razrez
  const [amountBase, setAmountBase] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [expenseType, setExpenseType] = useState<"goods" | "services" | "inventory">("goods");
  const [isForeign, setIsForeign] = useState(false);

  // Automatski izračun ukupnog iznosa za DOO
  const dooTotal = (parseFloat(amountBase.replace(",", ".")) || 0) +
                   (parseFloat(vatAmount.replace(",", ".")) || 0);

  function onPartnerSelect(id: string) {
    setPartnerId(id);
    if (id === "__manual__") {
      setPartnerName("");
      setPartnerTaxId("");
      return;
    }
    const p = partners.find((p) => p.id === id);
    if (p) {
      setPartnerName(p.name);
      setPartnerTaxId(p.tax_id ?? "");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const resolvedPartnerId = partnerId && partnerId !== "__manual__" ? partnerId : null;

    if (!partnerName.trim()) return setError("Naziv dobavljača je obavezan.");

    if (isDoo) {
      const base = parseFloat(amountBase.replace(",", ".")) || 0;
      const vat = parseFloat(vatAmount.replace(",", ".")) || 0;
      if (base <= 0) return setError("Osnovica mora biti veća od 0.");

      startTransition(async () => {
        const res = await addReceivedInvoice({
          partner_id: resolvedPartnerId,
          partner_name: partnerName.trim(),
          partner_tax_id: partnerTaxId || null,
          invoice_number: invoiceNumber || null,
          invoice_date: invoiceDate,
          received_date: receivedDate || null,
          amount: base + vat,
          payment_date: paymentDate || null,
          paid_amount: parseFloat(paidAmount.replace(",", ".")) || 0,
          notes: notes || null,
          amount_base: base,
          vat_amount: vat,
          expense_type: expenseType,
          is_foreign: isForeign,
        });

        if (res.error) setError(res.error);
        else router.push("/primljene-fakture");
      });
    } else {
      const amountVal = parseFloat(amount.replace(",", ".")) || 0;
      if (amountVal <= 0) return setError("Iznos mora biti veći od 0.");

      startTransition(async () => {
        const res = await addReceivedInvoice({
          partner_id: resolvedPartnerId,
          partner_name: partnerName.trim(),
          partner_tax_id: partnerTaxId || null,
          invoice_number: invoiceNumber || null,
          invoice_date: invoiceDate,
          received_date: receivedDate || null,
          amount: amountVal,
          payment_date: paymentDate || null,
          paid_amount: parseFloat(paidAmount.replace(",", ".")) || 0,
          notes: notes || null,
        });

        if (res.error) setError(res.error);
        else router.push("/primljene-fakture");
      });
    }
  }

  const isManual = !partnerId || partnerId === "__manual__";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* DOO info banner */}
      {isDoo && (
        <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-sm text-blue-800 dark:text-blue-300">
          Faktura će automatski biti proknjižena u Glavnu knjigu (D troškovi / P dobavljači).
        </div>
      )}

      <FormSection title="Dobavljač">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {partners.length > 0 && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Izaberi partnera</Label>
              <Select value={partnerId} onValueChange={onPartnerSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="— ili unesi ručno —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__manual__">— Ručni unos —</SelectItem>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{p.tax_id ? ` · ${p.tax_id}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partner_name">Naziv dobavljača *</Label>
            <Input
              id="partner_name"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="Ime / naziv firme"
              readOnly={!isManual}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partner_tax_id">JIB / PDV broj</Label>
            <Input
              id="partner_tax_id"
              value={partnerTaxId}
              onChange={(e) => setPartnerTaxId(e.target.value)}
              placeholder="4201234567890"
              readOnly={!isManual}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Faktura">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoice_number">Broj fakture</Label>
            <Input
              id="invoice_number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="npr. 2026-001"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoice_date">Datum fakture *</Label>
            <Input
              id="invoice_date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="received_date">Datum prijema</Label>
            <Input
              id="received_date"
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
            />
          </div>

          {/* ── Obrt: jedan iznos ── */}
          {!isDoo && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Iznos (KM) *</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
          )}

          {/* ── DOO: osnovica + PDV + vrsta + strani ── */}
          {isDoo && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amount_base">Osnovica (bez PDV) *</Label>
                <Input
                  id="amount_base"
                  type="number"
                  min={0}
                  step="0.01"
                  value={amountBase}
                  onChange={(e) => setAmountBase(e.target.value)}
                  placeholder="0,00"
                  required
                />
              </div>
              {isVatRegistered && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="vat_amount">PDV iznos (KM)</Label>
                  <Input
                    id="vat_amount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={vatAmount}
                    onChange={(e) => setVatAmount(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label>Ukupan iznos (KM)</Label>
                <div className="h-10 px-3 flex items-center rounded-md border bg-muted font-mono text-sm">
                  {dooTotal.toFixed(2)}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Vrsta troška</Label>
                <Select
                  value={expenseType}
                  onValueChange={(v) => setExpenseType(v as "goods" | "services" | "inventory")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inventory">Roba za dalju prodaju — zalihe (konto 1300)</SelectItem>
                    <SelectItem value="goods">Materijal / odmah utrošeno (konto 5000)</SelectItem>
                    <SelectItem value="services">Usluge (konto 5300)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  id="is_foreign"
                  type="checkbox"
                  checked={isForeign}
                  onChange={(e) => setIsForeign(e.target.checked)}
                  className="h-4 w-4 rounded border"
                />
                <Label htmlFor="is_foreign">Strani dobavljač (konto 4330)</Label>
              </div>
            </>
          )}
        </div>
      </FormSection>

      <FormSection title="Plaćanje">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment_date">Datum plaćanja</Label>
            <Input
              id="payment_date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paid_amount">Plaćeni iznos (KM)</Label>
            <Input
              id="paid_amount"
              type="number"
              min={0}
              step="0.01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="0,00"
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
          {isPending
            ? "Čuvanje..."
            : isDoo
              ? "Sačuvaj i proknjiži u GK"
              : "Sačuvaj fakturu"}
        </Button>
        <Button asChild variant="outline">
          <Link href="/primljene-fakture">Odustani</Link>
        </Button>
      </div>
    </form>
  );
}
