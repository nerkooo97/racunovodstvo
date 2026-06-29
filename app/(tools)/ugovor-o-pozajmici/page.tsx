"use client";

import { useState } from "react";
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
  const [submitted, setSubmitted] = useState(false);
  const [schedule, setSchedule] = useState<RepaymentRow[]>([]);
  const [loanType, setLoanType] = useState<"kratkorocno" | "dugorocno">("kratkorocno");
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

  function set(field: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleGenerate() {
    const principal = parseFloat(fields.amount) || 0;
    const rate      = parseFloat(fields.interest_rate) || 0;
    const months    = parseInt(fields.term_months) || 12;
    if (principal > 0) {
      setSchedule(calcAnnuity(principal, rate, months));
    }
    setSubmitted(true);
  }

  const totalInterest = schedule.reduce((s, r) => s + r.interest, 0);

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

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="col-span-2">
          <h2 className="font-semibold text-sm mb-2">Zajmodavac</h2>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Naziv / Ime i prezime</Label>
          <Input value={fields.lender_name} onChange={set("lender_name")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Adresa</Label>
          <Input value={fields.lender_address} onChange={set("lender_address")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>LK / ID broj</Label>
          <Input value={fields.lender_jib} onChange={set("lender_jib")} />
        </div>

        <div className="col-span-2 pt-2">
          <h2 className="font-semibold text-sm mb-2">Zajmoprimac</h2>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Naziv / Ime i prezime</Label>
          <Input value={fields.borrower_name} onChange={set("borrower_name")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Adresa</Label>
          <Input value={fields.borrower_address} onChange={set("borrower_address")} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>LK / ID broj</Label>
          <Input value={fields.borrower_jib} onChange={set("borrower_jib")} />
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

      <Button onClick={handleGenerate} className="mb-6">Generiši ugovor i plan otplate</Button>

      {submitted && (
        <div className="space-y-6">
          {/* Ugovor tekst */}
          <div className="border rounded-md p-6 text-sm space-y-3 bg-white">
            <div className="text-center">
              <h2 className="font-bold text-base uppercase">UGOVOR O POZAJMICI</h2>
            </div>
            <p>
              Zaključen između: <strong>{fields.lender_name}</strong>
              {fields.lender_jib && `, JIB/JMBG: ${fields.lender_jib}`} (zajmodavac),
            </p>
            <p>
              i <strong>{fields.borrower_name}</strong>
              {fields.borrower_jib && `, JIB/JMBG: ${fields.borrower_jib}`} (zajmoprimac).
            </p>
            <p>
              Zajmodavac daje zajmoprimcu pozajmicu u iznosu od{" "}
              <strong>{formatKM(parseFloat(fields.amount) || 0)}</strong>
              {parseFloat(fields.interest_rate) > 0
                ? ` uz godišnju kamatnu stopu od ${fields.interest_rate}%`
                : " bez naknade (beskamatna pozajmica)"}.
            </p>
            {fields.purpose && <p><strong>Namjena:</strong> {fields.purpose}</p>}
            <p>
              Rok otplate: <strong>{fields.term_months} rata</strong>, počev od {fields.start_date}.
            </p>
            {totalInterest > 0 && (
              <p>Ukupna kamata: {formatKM(totalInterest)}</p>
            )}
            <div className="mt-6 grid grid-cols-2 gap-8 pt-6 border-t">
              <div>
                <p className="text-muted-foreground text-xs mb-8">Zajmodavac:</p>
                <p className="border-t border-foreground/30 pt-1">{fields.lender_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-8">Zajmoprimac:</p>
                <p className="border-t border-foreground/30 pt-1">{fields.borrower_name}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-right">{fields.place}, {fields.sign_date}</p>
          </div>

          {/* Plan otplate */}
          {schedule.length > 0 && (
            <div>
              <h2 className="font-semibold mb-2">Plan otplate</h2>
              <table className="w-full text-sm border rounded-md overflow-hidden">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Rata</th>
                    <th className="px-3 py-2 text-right">Rata (KM)</th>
                    <th className="px-3 py-2 text-right">Kamata (KM)</th>
                    <th className="px-3 py-2 text-right">Glavnica (KM)</th>
                    <th className="px-3 py-2 text-right">Ostatak (KM)</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row, i) => (
                    <tr key={row.month} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                      <td className="px-3 py-1.5">{row.month}.</td>
                      <td className="px-3 py-1.5 text-right font-mono">{formatKM(row.payment)}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{formatKM(row.interest)}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{formatKM(row.principal)}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{formatKM(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>Štampaj</Button>
          </div>
        </div>
      )}
    </div>
  );
}
