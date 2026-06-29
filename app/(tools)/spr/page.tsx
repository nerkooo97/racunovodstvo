"use client";

import { useMemo, useState } from "react";
import { formatKM } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const YEARS = Array.from({ length: 8 }, (_, i) => String(2019 + i));

interface Field {
  label: string;
  placeholder?: string;
}

export default function SprPage() {
  // Dio 1 — Porezni obveznik
  const [jmb, setJmb]         = useState("");
  const [name, setName]       = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity]       = useState("");

  // Dio 2 — Registrovana djelatnost
  const [jib, setJib]                 = useState("");
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear() - 1));
  const [contactChanged, setContactChanged] = useState(false);
  const [businessName, setBusinessName]   = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [activityCode, setActivityCode]   = useState("");
  const [activityName, setActivityName]   = useState("");

  // Dio 3 — Prihodi (R11–R15 ručno, R16 auto)
  const [r11, setR11] = useState(""); // gotovina
  const [r12, setR12] = useState(""); // banka
  const [r13, setR13] = useState(""); // stvari i usluge
  const [r14, setR14] = useState(""); // izuzimanja ekonomskih dobara
  const [r15, setR15] = useState(""); // izuzimanja usluga

  // Dio 4 — Rashodi (R17–R23 ručno, R24 auto)
  const [r17, setR17] = useState(""); // nabavna vrijednost
  const [r18, setR18] = useState(""); // bruto plaće
  const [r19, setR19] = useState(""); // plaćeni doprinosi
  const [r20, setR20] = useState(""); // ostali rashodi
  const [r21, setR21] = useState(""); // vrijednost uloženih dobara
  const [r22, setR22] = useState(""); // amortizacija (PLDI-1043)
  const [r23, setR23] = useState(""); // rasknjižena stalna sredstva

  // Dio 5
  const [r27, setR27] = useState(""); // rashodi koje nije moguće odbiti

  const [submitted, setSubmitted] = useState(false);

  const n = (v: string) => parseFloat(v.replace(",", ".")) || 0;

  const calc = useMemo(() => {
    const r16 = n(r11) + n(r12) + n(r13) + n(r14) + n(r15);
    const r24 = n(r17) + n(r18) + n(r19) + n(r20) + n(r21) + n(r22) + n(r23);
    const r25 = r16;
    const r26 = r24;
    const r28 = r25 - r26 + n(r27);
    const r29 = Math.max(0, (r28 * 0.10) / 12);
    return { r16, r24, r25, r26, r28, r29 };
  }, [r11,r12,r13,r14,r15,r17,r18,r19,r20,r21,r22,r23,r27]);

  function NumInput({ value, onChange, label, className = "" }: { value: string; onChange: (v: string) => void; label: string; className?: string }) {
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

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">SPR-1053</h1>
      <p className="text-muted-foreground text-sm mb-1">
        Specifikacija prihoda i rashoda samostalne djelatnosti — prilaže se uz GPD-1051.
      </p>
      <p className="text-xs text-muted-foreground mb-6">
        Rok predaje: <strong>31. marta</strong> tekuće godine za prethodnu godinu.
      </p>

      <div className="space-y-6">
        {/* Dio 1 */}
        <section className="border rounded-md p-4">
          <h2 className="font-semibold text-sm mb-3">Dio 1 — Podaci o poreznom obvezniku</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">1) JMB vlasnika (JMBG, ne JIB firme)</Label>
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
          </div>
        </section>

        {/* Dio 2 */}
        <section className="border rounded-md p-4">
          <h2 className="font-semibold text-sm mb-3">Dio 2 — Podaci o registrovanoj djelatnosti</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">4) JIB/JMB djelatnosti</Label>
              <Input value={jib} onChange={(e) => setJib(e.target.value)} maxLength={13} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Porezna godina</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <Checkbox
                id="contact-changed"
                checked={contactChanged}
                onCheckedChange={(v) => setContactChanged(v === true)}
              />
              <label htmlFor="contact-changed" className="text-xs">
                7) Kontakt podaci su se izmijenili od prošle godine
              </label>
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <Label className="text-xs">8) Naziv registrovane djelatnosti</Label>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">9) Adresa poslovne djelatnosti</Label>
              <Input value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">10) Šifra djelatnosti</Label>
                <Input value={activityCode} onChange={(e) => setActivityCode(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Naziv</Label>
                <Input value={activityName} onChange={(e) => setActivityName(e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        {/* Dio 3 — Prihodi */}
        <section className="border rounded-md p-4">
          <h2 className="font-semibold text-sm mb-3">Dio 3 — Prihodi</h2>
          <div className="grid grid-cols-2 gap-3">
            <NumInput label="R11 — U gotovini" value={r11} onChange={setR11} />
            <NumInput label="R12 — Preko bankovnog računa" value={r12} onChange={setR12} />
            <NumInput label="R13 — U stvarima i uslugama" value={r13} onChange={setR13} />
            <NumInput label="R14 — Izuzimanja ekonomskih dobara" value={r14} onChange={setR14} />
            <NumInput label="R15 — Izuzimanja usluga" value={r15} onChange={setR15} />
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold">R16 — Prihodi ukupno (auto)</Label>
              <div className="border rounded-md px-3 py-2 font-mono text-right bg-muted/30">
                {formatKM(calc.r16)}
              </div>
            </div>
          </div>
        </section>

        {/* Dio 4 — Rashodi */}
        <section className="border rounded-md p-4">
          <h2 className="font-semibold text-sm mb-3">Dio 4 — Rashodi</h2>
          <div className="grid grid-cols-2 gap-3">
            <NumInput label="R17 — Nabavna vrijednost robe/materijala" value={r17} onChange={setR17} />
            <NumInput label="R18 — Bruto plaće zaposlenika" value={r18} onChange={setR18} />
            <NumInput label="R19 — Plaćeni doprinosi poslodavca" value={r19} onChange={setR19} />
            <NumInput label="R20 — Ostali rashodi" value={r20} onChange={setR20} />
            <NumInput label="R21 — Vrijednost uloženih ekonomskih dobara" value={r21} onChange={setR21} />
            <NumInput label="R22 — Amortizacija (iz PLDI-1043)" value={r22} onChange={setR22} />
            <NumInput label="R23 — KV rasknjiženih stalnih sredstava" value={r23} onChange={setR23} />
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-semibold">R24 — Rashodi ukupno (auto)</Label>
              <div className="border rounded-md px-3 py-2 font-mono text-right bg-muted/30">
                {formatKM(calc.r24)}
              </div>
            </div>
          </div>
        </section>

        {/* Dio 5 — Utvrđivanje dohotka */}
        <section className="border rounded-md p-4">
          <h2 className="font-semibold text-sm mb-3">Dio 5 — Utvrđivanje dohotka</h2>
          <div className="space-y-2">
            {([
              ["R25 — Prihodi (= R16)", calc.r25],
              ["R26 — Rashodi (= R24)", calc.r26],
            ] as [string, number][]).map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b py-1.5">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="font-mono text-sm">{formatKM(value)}</span>
              </div>
            ))}

            <NumInput
              label="R27 — Rashodi koje nije moguće odbiti (čl. 15)"
              value={r27}
              onChange={setR27}
              className="mt-2"
            />

            <div className="mt-3 pt-3 border-t space-y-2">
              {([
                ["R28 — Dohodak (R25 − R26 + R27)", calc.r28],
                ["R29 — Mjesečna akontacija ((R28 × 10%) / 12)", calc.r29],
              ] as [string, number][]).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="font-mono font-bold text-sm">{formatKM(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="flex gap-3">
          <Button type="button" onClick={() => setSubmitted(true)}>
            Prikaži pregled
          </Button>
          {submitted && (
            <Button type="button" variant="outline" onClick={() => window.print()}>
              Štampaj / PDF
            </Button>
          )}
        </div>

        {submitted && (
          <div className="border-2 rounded-md p-6 print:shadow-none text-sm space-y-1">
            <div className="text-center mb-4">
              <p className="text-xs text-muted-foreground">Obrazac</p>
              <h2 className="font-bold text-lg">SPR-1053</h2>
              <p className="text-xs">Specifikacija prihoda i rashoda za {selectedYear}. godinu</p>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1">
              {[
                ["JMB vlasnika", jmb],
                ["Prezime i ime", name],
                ["Adresa", address],
                ["Grad", city],
                ["JIB djelatnosti", jib],
                ["Naziv djelatnosti", businessName],
                ["Šifra djelatnosti", activityCode],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between border-b py-0.5">
                  <span className="text-muted-foreground text-xs">{l}</span>
                  <span className="font-mono text-xs">{v || "—"}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1">
              {([
                ["R11 Gotovina", n(r11)],
                ["R12 Banka", n(r12)],
                ["R13 Stvari/usluge", n(r13)],
                ["R14 Izuzimanja ekonomskih dobara", n(r14)],
                ["R15 Izuzimanja usluga", n(r15)],
                ["R16 PRIHODI UKUPNO", calc.r16],
                ["R17 Nabavna vrijednost", n(r17)],
                ["R18 Bruto plaće", n(r18)],
                ["R19 Doprinosi poslodavca", n(r19)],
                ["R20 Ostali rashodi", n(r20)],
                ["R21 Uložena dobra", n(r21)],
                ["R22 Amortizacija (PLDI)", n(r22)],
                ["R23 Rasknjižena stalna sredstva", n(r23)],
                ["R24 RASHODI UKUPNO", calc.r24],
                ["R25 Prihodi", calc.r25],
                ["R26 Rashodi", calc.r26],
                ["R27 Neodbitni rashodi", n(r27)],
                ["R28 DOHODAK", calc.r28],
                ["R29 Mjes. akontacija", calc.r29],
              ] as [string, number][]).map(([l, v]) => (
                <div key={l} className="flex justify-between border-b py-0.5">
                  <span className="text-muted-foreground text-xs">{l}</span>
                  <span className="font-mono text-xs">{formatKM(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
