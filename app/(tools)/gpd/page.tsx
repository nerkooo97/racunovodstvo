"use client";

import { useMemo, useState } from "react";
import { formatKM } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText } from "lucide-react";

const PERSONAL_DEDUCTION_ANNUAL = 3600; // 300 × 12

function n(v: string) { return parseFloat(v.replace(",", ".")) || 0; }

function NumRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-sm">{formatKM(value)}</span>
    </div>
  );
}

function NumInput({ label, value, onChange, className = "" }: {
  label: string; value: string; onChange: (v: string) => void; className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0,00"
        className="font-mono text-right"
      />
    </div>
  );
}

export default function GpdPage() {
  // Dio 1 — Porezni obveznik
  const [jmb, setJmb]       = useState("");
  const [name, setName]     = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity]     = useState("");
  const [contactChanged, setContactChanged] = useState(false);
  const [yearPrefix] = useState("20");
  const [yearSuffix, setYearSuffix] = useState(
    String(new Date().getFullYear() - 1).slice(-2)
  );
  const [phone, setPhone]   = useState("");
  const [email, setEmail]   = useState("");

  // Dio 2 — Prijava prihoda
  const [r8, setR8]   = useState(""); // nesamostalna djelatnost (plate)
  const [r9, setR9]   = useState(""); // samostalna djelatnost (SPR R28)
  const [r10, setR10] = useState(""); // poljoprivreda
  const [r11, setR11] = useState(""); // iznajmljivanje imovine
  const [r12, setR12] = useState(""); // vremenski ograničeno ustupanje prava
  const [r13, setR13] = useState(""); // druge samostalne djelatnosti (AUG/ASD)
  const [r14, setR14] = useState(""); // poslovni gubitak iz ranijih godina (odbitna)

  // Dio 3 — Lični odbici
  const [taxCoeff, setTaxCoeff] = useState("1.0");
  const [r19, setR19] = useState(""); // zdravstvene usluge i lijekovi
  const [r20, setR20] = useState(""); // kamata na stambeni kredit

  // Dio 4 — Obračun porezne obaveze
  const [r27, setR27] = useState(""); // umanjenje poreza
  const [r28, setR28] = useState(""); // porez po odbitku (već plaćen)
  const [r29, setR29] = useState(""); // uplaćene akontacije
  const [r30, setR30] = useState(""); // plaćeni porez u inostranstvu
  const [paymentChoice, setPaymentChoice] = useState<"a" | "b">("a");

  const [submitted, setSubmitted] = useState(false);

  const calc = useMemo(() => {
    const coeff = parseFloat(taxCoeff) || 1.0;
    const r18_personal = PERSONAL_DEDUCTION_ANNUAL * coeff;
    const r21 = r18_personal + n(r19) + n(r20);

    const incomes = n(r8) + n(r9) + n(r10) + n(r11) + n(r12) + n(r13);
    const r15_total = incomes - n(r14); // poslovni gubitak je odbitna stavka
    const r16_gubitak = Math.max(0, -r15_total);
    const r17_dobit   = Math.max(0, r15_total);

    const r22_gubitak = r16_gubitak;
    const r23_dohodak = r17_dobit;
    const r24_odbici  = r21;
    const r25_osnovica = Math.max(0, r23_dohodak - r22_gubitak - r24_odbici);
    const r26_obaveza  = Math.round(r25_osnovica * 0.10 * 100) / 100;
    const r31_razlika  = r26_obaveza - n(r27) - n(r28) - n(r29) - n(r30);

    return { r18_personal, r21, r15_total, r16_gubitak, r17_dobit,
             r22_gubitak, r23_dohodak, r24_odbici, r25_osnovica,
             r26_obaveza, r31_razlika };
  }, [taxCoeff, r8, r9, r10, r11, r12, r13, r14, r19, r20, r27, r28, r29, r30]);

  const yearFull = yearPrefix + yearSuffix;

  async function generatePdfAction(action: "download" | "preview") {
    const payload = {
      jmb,
      fullName: name,
      address,
      city,
      contactChanged,
      year: yearFull,
      phone,
      email,
      
      r8,
      r9,
      r10,
      r11,
      r12,
      r13,
      r14,
      
      taxCoeff,
      r19,
      r20,
      
      r27,
      r28,
      r29,
      r30,
      
      paymentChoice,
    };

    try {
      const res = await fetch("/api/pdf/gpd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }

      const blob = await res.blob();
      const fileUrl = URL.createObjectURL(blob);

      if (action === "download") {
        const a = document.createElement("a");
        a.href = fileUrl;
        a.download = `gpd-1051-${yearFull}.pdf`;
        a.click();
      } else {
        window.open(fileUrl, "_blank", "noopener,noreferrer");
      }
    } catch (e: any) {
      console.error(e);
      alert(`Greška prilikom generisanja PDF-a: ${e.message}`);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">GPD-1051</h1>
      <p className="text-muted-foreground text-sm mb-1">
        Godišnja prijava poreza na dohodak fizičkih lica.
      </p>
      <p className="text-xs text-muted-foreground mb-6">
        Rok predaje: <strong>31. marta</strong> tekuće godine za prethodnu godinu.
        Prilaže se: SPR-1053, ZO3, GIP-1022, PLDI-1043.
      </p>

      <div className="space-y-6">
        {/* Dio 1 */}
        <section className="border rounded-md p-4">
          <h2 className="font-semibold text-sm mb-3">Dio 1 — Podaci o poreznom obvezniku</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">1) JMB</Label>
              <Input value={jmb} onChange={(e) => setJmb(e.target.value)} maxLength={13} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">2) Prezime i ime</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">3) Adresa</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Grad</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <Checkbox
                id="contact-changed"
                checked={contactChanged}
                onCheckedChange={(v) => setContactChanged(v === true)}
              />
              <label htmlFor="contact-changed" className="text-xs">
                4) Kontakt podaci izmijenili od prošle godine
              </label>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">5) Porezni period (godina)</Label>
              <div className="flex gap-1 items-center">
                <span className="text-sm font-mono px-2 py-1.5 border rounded-md bg-muted/30">{yearPrefix}</span>
                <Input
                  value={yearSuffix}
                  onChange={(e) => setYearSuffix(e.target.value.slice(-2))}
                  className="w-16 font-mono"
                  maxLength={2}
                  placeholder="25"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">6) Telefon</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">7) E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Dio 2 — Prijava prihoda */}
        <section className="border rounded-md p-4">
          <h2 className="font-semibold text-sm mb-3">Dio 2 — Prijava prihoda</h2>
          <div className="grid grid-cols-2 gap-3">
            <NumInput label="R8 — Dohodak od nesamostalne djelatnosti (plate, GIP-1022)" value={r8} onChange={setR8} className="col-span-2" />
            <NumInput label="R9 — Dohodak od samostalne djelatnosti (SPR-1053 R28)" value={r9} onChange={setR9} className="col-span-2" />
            <NumInput label="R10 — Dohodak od poljoprivrede i šumarstva" value={r10} onChange={setR10} />
            <NumInput label="R11 — Dohodak od iznajmljivanja imovine (PRIM-1054)" value={r11} onChange={setR11} />
            <NumInput label="R12 — Dohodak od vremenski ogrаničenog ustupanja prava" value={r12} onChange={setR12} />
            <NumInput label="R13 — Dohodak od drugih samostalnih djelatnosti (AUG/ASD)" value={r13} onChange={setR13} />
            <NumInput label="R14 — Poslovni gubitak iz ranijih godina (odbitna stavka)" value={r14} onChange={setR14} />
          </div>
          <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-3">
            <NumRow label="R15 Ukupno" value={calc.r15_total} />
            <NumRow label="R16 Ukupni gubitak" value={calc.r16_gubitak} />
            <NumRow label="R17 Ukupna dobit" value={calc.r17_dobit} />
          </div>
        </section>

        {/* Dio 3 — Lični odbici */}
        <section className="border rounded-md p-4">
          <h2 className="font-semibold text-sm mb-3">Dio 3 — Lični odbici</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Porezni koeficijent (lični odbitak)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={taxCoeff}
                onChange={(e) => setTaxCoeff(e.target.value)}
                placeholder="1.0"
              />
              <span className="text-xs text-muted-foreground">
                R18 — Lični odbitak: {formatKM(calc.r18_personal)} (300 × 12 × {taxCoeff})
              </span>
            </div>
            <NumInput label="R19 — Troškovi zdravstvenih usluga i lijekova" value={r19} onChange={setR19} />
            <NumInput label="R20 — Kamata na stambeni kredit" value={r20} onChange={setR20} />
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold">R21 — Ukupni odbici</Label>
              <div className="border rounded-md px-3 py-2 font-mono text-right bg-muted/30">
                {formatKM(calc.r21)}
              </div>
            </div>
          </div>
        </section>

        {/* Dio 4 — Obračun porezne obaveze */}
        <section className="border rounded-md p-4">
          <h2 className="font-semibold text-sm mb-3">Dio 4 — Obračun porezne obaveze</h2>
          <div className="space-y-1 mb-3">
            <NumRow label="R22 — Ukupni gubitak za godinu" value={calc.r22_gubitak} />
            <NumRow label="R23 — Ukupan dohodak za godinu" value={calc.r23_dohodak} />
            <NumRow label="R24 — Ukupni odbici (R21)" value={calc.r24_odbici} />
            <div className="flex items-center justify-between border-b py-1.5 font-semibold">
              <span className="text-sm">R25 — Porezna osnovica (R23 − R22 − R24)</span>
              <span className="font-mono text-sm">{formatKM(calc.r25_osnovica)}</span>
            </div>
            <div className="flex items-center justify-between border-b py-1.5 font-semibold">
              <span className="text-sm">R26 — Porezna obaveza (R25 × 10%)</span>
              <span className="font-mono text-sm">{formatKM(calc.r26_obaveza)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumInput label="R27 — Umanjenje poreza (čl. 35 st. 3 i čl. 47)" value={r27} onChange={setR27} />
            <NumInput label="R28 — Porez po odbitku (plaćen kroz godinu)" value={r28} onChange={setR28} />
            <NumInput label="R29 — Uplaćene akontacije poreza" value={r29} onChange={setR29} />
            <NumInput label="R30 — Plaćeni porez u inostranstvu" value={r30} onChange={setR30} />
          </div>
          <div className={`mt-4 pt-4 border-t flex items-center justify-between rounded-md p-3 ${
            calc.r31_razlika > 0 ? "bg-destructive/10" : "bg-green-50"
          }`}>
            <span className="font-semibold text-sm">
              R31 — Razlika (R26 − R27 − R28 − R29 − R30)
            </span>
            <span className={`font-mono font-bold text-lg ${calc.r31_razlika > 0 ? "text-destructive" : "text-green-700"}`}>
              {formatKM(calc.r31_razlika)}
            </span>
          </div>
          {calc.r31_razlika < 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">R32 — Preplata: odabir opcije</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={paymentChoice === "a"} onChange={() => setPaymentChoice("a")} />
                  a) Prenijeti kao akontaciju za narednu godinu
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={paymentChoice === "b"} onChange={() => setPaymentChoice("b")} />
                  b) Zahtjev za povrat
                </label>
              </div>
            </div>
          )}
        </section>

        <div className="flex gap-2 flex-wrap pt-2">
          <Button type="button" onClick={() => setSubmitted(true)}>
            Prikaži pregled
          </Button>
          <Button
            type="button"
            className="gap-1.5"
            onClick={() => generatePdfAction("download")}
          >
            <Download className="h-4 w-4" />
            Preuzmi PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            onClick={() => generatePdfAction("preview")}
          >
            <FileText className="h-4 w-4" />
            Pregled / štampaj
          </Button>
        </div>

        {submitted && (
          <div className="border-2 rounded-md p-6 print:shadow-none text-sm">
            <div className="text-center mb-4">
              <p className="text-xs text-muted-foreground">Obrazac</p>
              <h2 className="font-bold text-lg">GPD-1051</h2>
              <p className="text-xs">Godišnja prijava poreza na dohodak za {yearFull}. godinu</p>
            </div>
            <div className="space-y-0.5">
              {([
                ["JMB", jmb], ["Prezime i ime", name], ["Adresa", address + ", " + city],
                ["Telefon", phone], ["Email", email],
                ["R8 Nesamostalna", n(r8)], ["R9 Samostalna (SPR R28)", n(r9)],
                ["R10 Poljoprivreda", n(r10)], ["R11 Iznajmljivanje", n(r11)],
                ["R12 Ustupanje prava", n(r12)], ["R13 Druge samostalne", n(r13)],
                ["R14 Gubitak ranijih god.", n(r14)],
                ["R15 Ukupno", calc.r15_total], ["R16 Ukupni gubitak", calc.r16_gubitak],
                ["R17 Ukupna dobit", calc.r17_dobit],
                ["R18 Lični odbitak", calc.r18_personal], ["R19 Zdravstvo/lijekovi", n(r19)],
                ["R20 Kamata stambeni", n(r20)], ["R21 Ukupni odbici", calc.r21],
                ["R22 Gubitak", calc.r22_gubitak], ["R23 Dohodak", calc.r23_dohodak],
                ["R24 Odbici", calc.r24_odbici], ["R25 Osnovica", calc.r25_osnovica],
                ["R26 Porezna obaveza", calc.r26_obaveza],
                ["R27 Umanjenje", n(r27)], ["R28 Porez po odbitku", n(r28)],
                ["R29 Akontacije", n(r29)], ["R30 Inostranstvo", n(r30)],
                ["R31 RAZLIKA", calc.r31_razlika],
              ] as [string, string | number][]).map(([l, v]) => (
                <div key={l} className="flex justify-between border-b py-0.5">
                  <span className="text-muted-foreground text-xs">{l}</span>
                  <span className="font-mono text-xs">
                    {typeof v === "number" ? formatKM(v) : (v || "—")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
