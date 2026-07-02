"use client";

import { useMemo, useState } from "react";
import { EUR_TO_BAM, HEALTH_SPLIT } from "@/lib/constants/tax-rates";
import { formatKM } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateAms } from "@/lib/calculations/ams";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ExpenseType = "standard" | "author" | "none";
type Currency    = "BAM" | "EUR";

const MONTHS = [
  "Januar","Februar","Mart","April","Maj","Juni",
  "Juli","August","Septembar","Oktobar","Novembar","Decembar",
];

export default function AmsPage() {
  // Dio 1 — primalac
  const [fullName, setFullName]   = useState("");
  const [jmbg, setJmbg]           = useState("");
  const [address, setAddress]     = useState("");
  const [city, setCity]           = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [month, setMonth]         = useState<string>("");
  const [year, setYear]           = useState(String(new Date().getFullYear()));

  // Dio 2 — isplatilac
  const [payerName, setPayerName] = useState("");
  const [payerAddress, setPayerAddress] = useState("");
  const [payerCity, setPayerCity] = useState("");
  const [payerCountry, setPayerCountry] = useState("");

  // Dio 3 — iznos i obračun
  const [currency, setCurrency]   = useState<Currency>("BAM");
  const [amount, setAmount]       = useState("");
  const [expenseType, setExpenseType] = useState<ExpenseType>("standard");
  const [foreignCredit, setForeignCredit] = useState("");

  const result = useMemo(() => {
    const raw = parseFloat(amount.replace(",", "."));
    if (isNaN(raw) || raw <= 0) return null;

    // Fallback date string
    const dateArg = paymentDate || `${year}-${String(month || 1).padStart(2, "0")}-01`;
    const iznos_bam = currency === "EUR" ? Math.round(raw * EUR_TO_BAM * 100) / 100 : raw;
    
    // Call centralized calculation
    const calc = calculateAms(iznos_bam, expenseType, dateArg);

    const r2 = (n: number) => Math.round(n * 100) / 100;
    const kredit = Math.max(0, parseFloat(foreignCredit.replace(",", ".")) || 0);
    const porez_za_uplatu = Math.max(0, r2(calc.incomeTax - kredit));
    const zdravstvo_kanton = r2(calc.healthContribution * HEALTH_SPLIT.cantonal_rate);
    const zdravstvo_fbih   = r2(calc.healthContribution * HEALTH_SPLIT.federal_rate);
    const neto = r2(iznos_bam - calc.healthContribution - porez_za_uplatu);

    return {
      iznos_bam,
      rashodi: calc.expenseAmount,
      osnovica: calc.taxableBase,
      zdravstvo: calc.healthContribution,
      por_osn: r2(calc.taxableBase - calc.healthContribution),
      porez: calc.incomeTax,
      kredit,
      porez_za_uplatu,
      zdravstvo_kanton,
      zdravstvo_fbih,
      neto,
      expRate: calc.expenseRate,
    };
  }, [amount, currency, expenseType, foreignCredit, paymentDate, year, month]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">AMS-1035</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Akontacija poreza po odbitku na prihode iz inostranstva (freelance, honorari, konsultacije).
        Rok predaje: <strong>5 dana od dana primitka dohotka</strong>.
      </p>

      <div className="space-y-6">
        {/* Dio 1 — Primalac */}
        <section>
          <h2 className="font-semibold text-sm mb-3 uppercase tracking-wider text-muted-foreground">
            Dio 1 — Podaci o primaocu
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label>Ime i prezime</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>JMBG</Label>
              <Input value={jmbg} onChange={(e) => setJmbg(e.target.value)} maxLength={13} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Adresa</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Grad</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Datum isplate</Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label>Mjesec</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Godina</Label>
                <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        {/* Dio 2 — Isplatilac */}
        <section>
          <h2 className="font-semibold text-sm mb-3 uppercase tracking-wider text-muted-foreground">
            Dio 2 — Podaci o isplatiocu (firma iz inostranstva)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1">
              <Label>Naziv isplatioca</Label>
              <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Adresa</Label>
              <Input value={payerAddress} onChange={(e) => setPayerAddress(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Grad</Label>
              <Input value={payerCity} onChange={(e) => setPayerCity(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Država</Label>
              <Input value={payerCountry} onChange={(e) => setPayerCountry(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Dio 3 — Iznos i obračun */}
        <section>
          <h2 className="font-semibold text-sm mb-3 uppercase tracking-wider text-muted-foreground">
            Dio 3 — Iznos i obračun
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label>Valuta unosa</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAM">KM (BAM)</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Iznos dohotka ({currency})</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="npr. 1000.00"
              />
              {currency === "EUR" && result && (
                <span className="text-xs text-muted-foreground">
                  = {formatKM(result.iznos_bam)} po kursu {EUR_TO_BAM}
                </span>
              )}
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <Label>Vrsta prihoda</Label>
              <Select value={expenseType} onValueChange={(v) => setExpenseType(v as ExpenseType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standardna naknada (20% troškovi)</SelectItem>
                  <SelectItem value="author">Autorsko djelo (30% troškovi)</SelectItem>
                  <SelectItem value="none">Komisija / nadzorni odbor (0% troškovi)</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                Pravo na uznavanje rashoda u iznosu od 20% (30% ukoliko se radi o autorskim naknadama)
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Porezni kredit plaćen u inostranstvu (KM)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={foreignCredit}
                onChange={(e) => setForeignCredit(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        </section>

        {/* Obračun real-time */}
        {result && (
          <section>
            <h2 className="font-semibold text-sm mb-3 uppercase tracking-wider text-muted-foreground">
              Obračun
            </h2>
            <table className="w-full text-sm border rounded-md overflow-hidden">
              <tbody>
                {([
                  [`Iznos dohotka (BAM)`,                                   result.iznos_bam],
                  [`Normirani rashodi (${(result.expRate * 100).toFixed(0)}%)`, result.rashodi],
                  [`Osnovica`,                                               result.osnovica],
                  [`Zdravstveni doprinos (4%)`,                             result.zdravstvo],
                  [`  – kanton (89,8%)`,                                    result.zdravstvo_kanton],
                  [`  – FBiH (10,2%) — rač. ${HEALTH_SPLIT.federal_account}`, result.zdravstvo_fbih],
                  [`Porezna osnovica`,                                       result.por_osn],
                  [`Porez na dohodak (10%)`,                                result.porez],
                  ...(result.kredit > 0
                    ? [[`Porezni kredit (plaćen u inostranstvu)`, -result.kredit] as [string, number]]
                    : []),
                  [`Porez za uplatu`,                                       result.porez_za_uplatu],
                  [`Neto isplata`,                                          result.neto],
                ] as [string, number][]).map(([label, value], i) => (
                  <tr
                    key={label}
                    className={
                      label === "Neto isplata"
                        ? "font-bold border-t-2"
                        : label.startsWith("  –")
                        ? "text-muted-foreground text-xs bg-muted/10"
                        : i % 2 === 0
                        ? "bg-muted/30"
                        : ""
                    }
                  >
                    <td className="px-3 py-1.5">{label}</td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {value < 0 ? `- ${formatKM(Math.abs(value))}` : formatKM(value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 text-xs text-muted-foreground border rounded-md p-3 space-y-1">
              <p className="font-semibold">3 uplatnice za plaćanje:</p>
              <p>1. Zdravstveno — kanton (89,8%): {formatKM(result.zdravstvo_kanton)} — žiro račun kantona</p>
              <p>2. Zdravstveno — FBiH (10,2%): {formatKM(result.zdravstvo_fbih)} — rač. {HEALTH_SPLIT.federal_account} · ZZO FBiH</p>
              <p>3. Porez na dohodak: {formatKM(result.porez_za_uplatu)} — kantonalni budžet</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
