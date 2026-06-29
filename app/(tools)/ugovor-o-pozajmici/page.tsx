"use client";

import { useState, useEffect } from "react";
import { formatKM } from "@/lib/utils";
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
import { useOrganization } from "@/contexts/organization-context";
import { Download, FileText } from "lucide-react";

interface RepaymentRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

function calcAnnuity(principal: number, annualRate: number, months: number): RepaymentRow[] {
  if (annualRate === 0) {
    const payment = principal / months;
    const rows: RepaymentRow[] = [];
    let balance = principal;
    for (let i = 1; i <= months; i++) {
      balance -= payment;
      rows.push({ month: i, payment, interest: 0, principal: payment, balance: Math.max(0, balance) });
    }
    return rows;
  }

  const r = annualRate / 100 / 12;
  const annuity = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const rows: RepaymentRow[] = [];
  let balance = principal;

  for (let i = 1; i <= months; i++) {
    const interest  = balance * r;
    const principalP = annuity - interest;
    balance -= principalP;
    rows.push({
      month:     i,
      payment:   Math.round(annuity * 100) / 100,
      interest:  Math.round(interest * 100) / 100,
      principal: Math.round(principalP * 100) / 100,
      balance:   Math.max(0, Math.round(balance * 100) / 100),
    });
  }
  return rows;
}

export default function UgovorOPozajmiciPage() {
  // Active organization integration
  let org: any = null;
  try {
    const ctx = useOrganization();
    org = ctx.organization;
  } catch (e) {
    // Gracefully handle case where it's accessed outside the dashboard
  }

  const [loanType, setLoanType] = useState<"kratkorocno" | "dugorocno">("kratkorocno");
  const [firmRole, setFirmRole] = useState<"lender" | "borrower">("lender");
  const [fields, setFields] = useState({
    lender_name:    "",
    lender_address: "",
    lender_jib:     "",
    borrower_name:  "",
    borrower_address: "",
    borrower_jib:   "",
    amount:         "",
    interest_rate:  "0",
    term_months:    "12",
    start_date:     new Date().toISOString().slice(0, 10),
    purpose:        "",
    bank_account:   "",
    bank_name:      "",
    note:           "",
    court:          "",
    copies:         "2",
    place:          "Sarajevo",
    sign_date:      new Date().toISOString().slice(0, 10),
    currency:       "BAM",
  });

  useEffect(() => {
    if (org) {
      if (firmRole === "lender") {
        setFields((prev) => ({
          ...prev,
          lender_name: org.name || "",
          lender_address: org.address || org.city || "",
          lender_jib: org.tax_id || "",
          // Clear borrower if it matches org data
          borrower_name: prev.borrower_name === org.name ? "" : prev.borrower_name,
          borrower_address: prev.borrower_address === (org.address || org.city) ? "" : prev.borrower_address,
          borrower_jib: prev.borrower_jib === org.tax_id ? "" : prev.borrower_jib,
        }));
      } else {
        setFields((prev) => ({
          ...prev,
          borrower_name: org.name || "",
          borrower_address: org.address || org.city || "",
          borrower_jib: org.tax_id || "",
          // Clear lender if it matches org data
          lender_name: prev.lender_name === org.name ? "" : prev.lender_name,
          lender_address: prev.lender_address === (org.address || org.city) ? "" : prev.lender_address,
          lender_jib: prev.lender_jib === org.tax_id ? "" : prev.lender_jib,
        }));
      }
    }
  }, [org, firmRole]);

  function set(field: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((prev) => ({ ...prev, [field]: e.target.value }));
  }


  function buildQuery(): string {
    const params = new URLSearchParams({
      lender_name: fields.lender_name,
      lender_address: fields.lender_address,
      lender_jib: fields.lender_jib,
      borrower_name: fields.borrower_name,
      borrower_address: fields.borrower_address,
      borrower_jib: fields.borrower_jib,
      amount: fields.amount,
      currency: fields.currency,
      interest_rate: fields.interest_rate,
      term_months: fields.term_months,
      start_date: fields.start_date,
      purpose: fields.purpose,
      bank_account: fields.bank_account,
      bank_name: fields.bank_name,
      note: fields.note,
      court: fields.court,
      copies: fields.copies,
      place: fields.place,
      sign_date: fields.sign_date,
      _t: String(Date.now()),
    });
    return params.toString();
  }

  function validateForm() {
    const principal = parseFloat(fields.amount) || 0;
    if (!fields.amount || isNaN(principal) || principal <= 0) {
      alert("Molimo unesite ispravan iznos pozajmice.");
      return false;
    }
    if (!fields.lender_name.trim()) {
      alert("Molimo unesite ime/naziv zajmodavca.");
      return false;
    }
    if (!fields.borrower_name.trim()) {
      alert("Molimo unesite ime/naziv zajmoprimca.");
      return false;
    }
    return true;
  }

  function downloadPdf() {
    if (!validateForm()) return;
    const url = `/api/pdf?type=ugovor-o-pozajmici&${buildQuery()}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `ugovor-o-pozajmici-${fields.borrower_name.trim().replace(/\s+/g, "-") || "dokument"}.pdf`;
    a.click();
  }

  function openPdfPreview() {
    if (!validateForm()) return;
    window.open(`/api/pdf?type=ugovor-o-pozajmici&${buildQuery()}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Ugovor o pozajmici</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Generator ugovora o pozajmici s planom otplate (anuitetna metoda).
      </p>

      {/* Vrsta */}
      <div className="flex gap-2 mb-4">
        {(["kratkorocno", "dugorocno"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setLoanType(t)}
            className={`px-3 py-1 rounded-md border text-sm transition-colors ${
              loanType === t ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
            }`}
          >
            {t === "kratkorocno" ? "Kratkoročno" : "Dugoročno"}
          </button>
        ))}
      </div>

      {org && (
        <div className="flex flex-col gap-1.5 mb-6 border-b pb-4">
          <Label className="text-xs text-muted-foreground">Uloga organizacije "{org.name}" u ugovoru:</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFirmRole("lender")}
              className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                firmRole === "lender" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
              }`}
            >
              Firma daje pozajmicu (Zajmodavac)
            </button>
            <button
              type="button"
              onClick={() => setFirmRole("borrower")}
              className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                firmRole === "borrower" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
              }`}
            >
              Firma prima pozajmicu (Zajmoprimac)
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="col-span-2">
          <h2 className="font-semibold text-sm mb-2">Zajmodavac</h2>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Naziv / Ime i prezime</Label>
          <Input value={fields.lender_name} onChange={set("lender_name")} disabled={!!org && firmRole === "lender"} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Adresa</Label>
          <Input value={fields.lender_address} onChange={set("lender_address")} disabled={!!org && firmRole === "lender"} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>LK / ID broj</Label>
          <Input value={fields.lender_jib} onChange={set("lender_jib")} disabled={!!org && firmRole === "lender"} />
        </div>

        <div className="col-span-2 pt-2">
          <h2 className="font-semibold text-sm mb-2">Zajmoprimac</h2>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Naziv / Ime i prezime</Label>
          <Input value={fields.borrower_name} onChange={set("borrower_name")} disabled={!!org && firmRole === "borrower"} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Adresa</Label>
          <Input value={fields.borrower_address} onChange={set("borrower_address")} disabled={!!org && firmRole === "borrower"} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>LK / ID broj</Label>
          <Input value={fields.borrower_jib} onChange={set("borrower_jib")} disabled={!!org && firmRole === "borrower"} />
        </div>

        <div className="col-span-2 pt-2">
          <h2 className="font-semibold text-sm mb-2">Uvjeti pozajmice</h2>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Iznos pozajmice</Label>
          <Input type="text" inputMode="decimal" value={fields.amount} onChange={set("amount")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Valuta</Label>
          <Select value={fields.currency}
            onValueChange={(v) => setFields((p) => ({ ...p, currency: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BAM">BAM (KM)</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Godišnja kamatna stopa (%)</Label>
          <Input type="text" inputMode="decimal" value={fields.interest_rate} onChange={set("interest_rate")} />
          <span className="text-xs text-muted-foreground">0 = beskamatna pozajmica</span>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Rok otplate (mjeseci)</Label>
          <Input type="number" min={1} value={fields.term_months} onChange={set("term_months")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Datum prve rate</Label>
          <Input type="date" value={fields.start_date} onChange={set("start_date")} />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <Label>Namjena pozajmice (Član 2)</Label>
          <Input value={fields.purpose} onChange={set("purpose")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Žiro račun za uplatu (Član 3)</Label>
          <Input value={fields.bank_account} onChange={set("bank_account")} placeholder="xxxx-xxxxxxxxxx-xx" />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Banka</Label>
          <Input value={fields.bank_name} onChange={set("bank_name")} />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <Label>Napomena (Član 5)</Label>
          <Input value={fields.note} onChange={set("note")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Nadležni sud (u slučaju spora)</Label>
          <Input value={fields.court} onChange={set("court")} placeholder="Općinski sud u Sarajevu" />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Broj primjeraka (Član 6)</Label>
          <Select value={fields.copies} onValueChange={(v) => setFields((p) => ({ ...p, copies: v }))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Mjesto potpisivanja</Label>
          <Input value={fields.place} onChange={set("place")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Datum potpisivanja</Label>
          <Input type="date" value={fields.sign_date} onChange={set("sign_date")} />
        </div>
      </div>

      {/* Porezni tretman */}
      <div className="border border-amber-200 rounded-md p-3 bg-amber-50 text-xs text-amber-900 mb-4">
        <strong>Porezni tretman:</strong> Pozajmica sama po sebi nije oporeziva.
        Kamata za fizičko lice → porez na dohodak od kapitala 10% → prijava kroz GPD-1051.
        Kamata za pravno lice → ulazi u prihode od kapitala. Pozajmice između vlasnika i firme →
        PU može primijeniti tržišnu kamatnu stopu.
      </div>

      <div className="flex flex-wrap gap-2 pt-4">
        <Button
          type="button"
          className="gap-1.5"
          onClick={downloadPdf}
        >
          <Download className="h-4 w-4" />
          Preuzmi PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          className="gap-1.5"
          onClick={openPdfPreview}
        >
          <FileText className="h-4 w-4" />
          Pregled / štampaj
        </Button>
      </div>
    </div>
  );
}
