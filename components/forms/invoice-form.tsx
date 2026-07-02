"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvoice } from "@/app/actions/invoices";
import { getTaxConfig } from "@/lib/constants/tax-config";
import { formatKM } from "@/lib/utils";
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



interface Partner {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  tax_id?: string | null;
}

interface AdvanceInvoice {
  id: string;
  invoice_number: string;
  total: number;
}

const SALE_CATEGORY_OPTIONS = [
  { value: "domestic_b2b", label: "Prodaja PDV obvezniku (BiH)" },
  { value: "domestic_b2c", label: "Prodaja neobvezniku / građaninu" },
  { value: "export_goods", label: "Izvoz robe (JCI)" },
  { value: "export_services", label: "Usluge stranom licu" },
  { value: "exempt", label: "Oslobođeno bez prava na odbitak" },
  { value: "internal_use", label: "Vlastita / vanposlovna potrošnja" },
] as const;

interface Seller {
  name: string;
  address: string;
  city: string;
  jib: string;
  vat_no: string;
  phone: string;
  email: string;
  account: string;
}

interface InvoiceItem {
  description: string;
  unit: string;
  quantity: string;
  unit_price: string;
  discount: string;
  vat_rate: string;
}

const makeEmptyItem = (vatRate: number): InvoiceItem => ({
  description: "",
  unit:        "kom",
  quantity:    "1",
  unit_price:  "0",
  discount:    "0",
  vat_rate:    String(vatRate),
});

function computeItemTotals(item: InvoiceItem) {
  const qty      = parseFloat(item.quantity)    || 0;
  const price    = parseFloat(item.unit_price)  || 0;
  const disc     = parseFloat(item.discount)    || 0;
  const vatRate  = parseFloat(item.vat_rate)    || 0;
  const subtotal = qty * price * (1 - disc / 100);
  const vat      = subtotal * (vatRate / 100);
  return { subtotal, vat, total: subtotal + vat };
}

export default function InvoiceForm({
  partners,
  seller,
  advanceInvoices = [],
}: {
  partners: Partner[];
  seller?: Seller;
  advanceInvoices?: AdvanceInvoice[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType]           = useState("invoice");
  const [chargesVat, setChargesVat] = useState(true);
  const [currency, setCurrency]   = useState<"BAM" | "EUR">("BAM");
  const [saleCategory, setSaleCategory] = useState("domestic_b2b");
  const [advanceFor, setAdvanceFor] = useState("");
  const [partnerId, setPartnerId] = useState("");
  // Manual buyer fields (used when no partner selected)
  const [buyerName,    setBuyerName]    = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerCity,    setBuyerCity]    = useState("");
  const [buyerJib,     setBuyerJib]     = useState("");
  const [buyerVatNo,   setBuyerVatNo]   = useState("");
  const [buyerEmail,   setBuyerEmail]   = useState("");
  const [buyerPhone,   setBuyerPhone]   = useState("");
  const [issueDate, setIssueDate]   = useState(new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState("");
  // Default due date = issue date + 30 days
  const defaultDue = new Date(); defaultDue.setDate(defaultDue.getDate() + 30);
  const [dueDate, setDueDate]     = useState(defaultDue.toISOString().slice(0, 10));
  const [note, setNote]           = useState("");
  const [items, setItems]         = useState<InvoiceItem[]>(() => {
    const initialDate = new Date().toISOString().slice(0, 10);
    const initialVatRate = getTaxConfig(initialDate).vatRate * 100;
    return [makeEmptyItem(initialVatRate)];
  });

  function addItem() {
    const currentVatRate = getTaxConfig(issueDate).vatRate * 100;
    setItems((prev) => [...prev, makeEmptyItem(currentVatRate)]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof InvoiceItem, value: string) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  const totals = items.reduce(
    (acc, item) => {
      const t = computeItemTotals(item);
      return {
        subtotal: acc.subtotal + t.subtotal,
        vat:      acc.vat + t.vat,
        total:    acc.total + t.total,
      };
    },
    { subtotal: 0, vat: 0, total: 0 }
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("type", type);
    formData.set("partner_id", partnerId);
    formData.set("issue_date", issueDate);
    formData.set("delivery_date", deliveryDate);
    formData.set("due_date", dueDate);
    formData.set("currency", currency);
    formData.set("charges_vat", chargesVat ? "1" : "0");
    formData.set("sale_category", saleCategory);
    if (type === "invoice" && advanceFor) {
      formData.set("advance_for_invoice_id", advanceFor);
    }
    formData.set("note", note);
    // Seller snapshot
    if (seller) {
      formData.set("seller_name",    seller.name);
      formData.set("seller_address", seller.address);
      formData.set("seller_city",    seller.city);
      formData.set("seller_jib",     seller.jib);
      formData.set("seller_vat_no",  seller.vat_no);
      formData.set("seller_phone",   seller.phone);
      formData.set("seller_email",   seller.email);
      formData.set("seller_account", seller.account);
    }
    // Buyer snapshot (manual entry if no partner)
    if (!partnerId) {
      formData.set("buyer_name",    buyerName);
      formData.set("buyer_address", buyerAddress);
      formData.set("buyer_city",    buyerCity);
      formData.set("buyer_jib",     buyerJib);
      formData.set("buyer_vat_no",  buyerVatNo);
      formData.set("buyer_email",   buyerEmail);
      formData.set("buyer_phone",   buyerPhone);
    }

    const parsedItems = items.map((it, i) => ({
      description: it.description,
      unit:        it.unit,
      quantity:    parseFloat(it.quantity) || 1,
      unit_price:  parseFloat(it.unit_price) || 0,
      discount:    parseFloat(it.discount) || 0,
      vat_rate:    parseFloat(it.vat_rate) || 17,
      sort_order:  i,
    }));

    startTransition(async () => {
      const result = await createInvoice(formData, parsedItems);
      if (result.error) { setError(result.error); return; }
      router.push("/fakture");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <FormSection title="Podaci o dokumentu">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label>Vrsta dokumenta</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="invoice">Faktura</SelectItem>
              <SelectItem value="proforma">Predračun</SelectItem>
              <SelectItem value="advance">Avansna faktura</SelectItem>
              <SelectItem value="credit_note">Knjižno odobrenje</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Valuta</Label>
          <div className="flex gap-2">
            {(["BAM", "EUR"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`px-3 py-1 rounded-md border text-sm transition-colors ${
                  currency === c ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                }`}
              >
                {c === "BAM" ? "KM" : "EUR"} {c === "EUR" && <span className="text-xs">(×1.95583)</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="charges_vat"
            checked={chargesVat}
            onChange={(e) => setChargesVat(e.target.checked)}
          />
          <label htmlFor="charges_vat" className="text-sm">Obračunavam PDV</label>
        </div>
        <div />
        <div className="flex flex-col gap-1">
          <Label>Datum izdavanja</Label>
          <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Datum isporuke</Label>
          <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Rok dospijeća (plaćanje)</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Kategorija isporuke (PDV)</Label>
          <Select value={saleCategory} onValueChange={setSaleCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SALE_CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {type === "invoice" && advanceInvoices.length > 0 && (
          <div className="flex flex-col gap-1">
            <Label>Zatvara avansnu fakturu</Label>
            <Select value={advanceFor || "none"} onValueChange={(v) => setAdvanceFor(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Bez avansa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Bez avansa —</SelectItem>
                {advanceInvoices.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.invoice_number} ({formatKM(a.total)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      </FormSection>

      <FormSection title="Kupac">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <Label className="text-xs">Odaberi iz partnera</Label>
            <Select value={partnerId} onValueChange={setPartnerId}>
              <SelectTrigger><SelectValue placeholder="Odaberi partnera ili unesi ručno" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Ručni unos —</SelectItem>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!partnerId && (
            <>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Naziv / Ime i prezime</Label>
                <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Adresa</Label>
                <Input value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Grad</Label>
                <Input value={buyerCity} onChange={(e) => setBuyerCity(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">ID broj / JIB</Label>
                <Input value={buyerJib} onChange={(e) => setBuyerJib(e.target.value)} />
              </div>
              {chargesVat && (
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">PDV broj kupca (ako je PDV obveznik)</Label>
                  <Input value={buyerVatNo} onChange={(e) => setBuyerVatNo(e.target.value)} />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Telefon</Label>
                <Input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} />
              </div>
            </>
          )}
        </div>
      </FormSection>

      <FormSection title="Stavke">
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left">Opis</th>
                <th className="px-2 py-2 text-left w-16">JM</th>
                <th className="px-2 py-2 text-right w-20">Količina</th>
                <th className="px-2 py-2 text-right w-24">Cijena (KM)</th>
                <th className="px-2 py-2 text-right w-20">Rabat (%)</th>
                <th className="px-2 py-2 text-right w-20">PDV (%)</th>
                <th className="px-2 py-2 text-right w-24">Ukupno</th>
                <th className="px-2 py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const { total } = computeItemTotals(item);
                return (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-muted/10" : ""}>
                    <td className="px-2 py-1">
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        className="h-7 text-xs"
                        required
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        value={item.unit}
                        onChange={(e) => updateItem(idx, "unit", e.target.value)}
                        className="h-7 text-xs"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        className="h-7 text-xs text-right"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={item.unit_price}
                        onChange={(e) => updateItem(idx, "unit_price", e.target.value)}
                        className="h-7 text-xs text-right"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={item.discount}
                        onChange={(e) => updateItem(idx, "discount", e.target.value)}
                        className="h-7 text-xs text-right"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Select
                        value={item.vat_rate}
                        onValueChange={(v) => updateItem(idx, "vat_rate", v)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="17">17%</SelectItem>
                          <SelectItem value="0">0%</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1 text-right font-mono text-xs">
                      {formatKM(total)}
                    </td>
                    <td className="px-2 py-1">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-muted-foreground hover:text-destructive text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-2">
          + Dodaj stavku
        </Button>
      </FormSection>

      <FormSection title="Ukupno i napomena">
      <div className="flex justify-end">
        <table className="text-sm w-64">
          <tbody>
            <tr>
              <td className="py-0.5 text-muted-foreground">Osnova:</td>
              <td className="py-0.5 text-right font-mono">{formatKM(totals.subtotal)}</td>
            </tr>
            <tr>
              <td className="py-0.5 text-muted-foreground">PDV:</td>
              <td className="py-0.5 text-right font-mono">{formatKM(totals.vat)}</td>
            </tr>
            <tr className="font-bold border-t">
              <td className="py-1">Ukupno:</td>
              <td className="py-1 text-right font-mono">{formatKM(totals.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid gap-2">
        <Label>Napomena</Label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Opcionalna napomena na fakturi"
        />
      </div>
      </FormSection>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3 pb-8">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Čuvanje..." : "Kreiraj fakturu"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/fakture")}>
          Otkaži
        </Button>
      </div>
    </form>
  );
}
