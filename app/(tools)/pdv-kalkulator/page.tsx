"use client";

import { useMemo, useState } from "react";
import { EUR_TO_BAM } from "@/lib/constants/tax-rates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Direction = "add" | "extract";
type Currency  = "BAM" | "EUR";

function fmt(n: number, currency: Currency): string {
  const bam = currency === "EUR" ? n * EUR_TO_BAM : n;
  const eur = currency === "EUR" ? n : n / EUR_TO_BAM;
  if (currency === "BAM") {
    return new Intl.NumberFormat("bs-BA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(bam) + " KM";
  }
  return (
    new Intl.NumberFormat("bs-BA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(eur) +
    " EUR  (" +
    new Intl.NumberFormat("bs-BA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(bam) +
    " KM)"
  );
}

export default function PdvKalkulatorPage({ hideHeader = false }: { hideHeader?: boolean }) {
  const [direction, setDirection] = useState<Direction>("add");
  const [currency, setCurrency]   = useState<Currency>("BAM");
  const [amount, setAmount]       = useState("");

  const result = useMemo(() => {
    const raw = parseFloat(amount.replace(",", "."));
    if (isNaN(raw) || raw <= 0) return null;
    // Sve računamo u BAM interno
    const val = currency === "EUR" ? raw * EUR_TO_BAM : raw;
    if (direction === "add") {
      const base  = val;
      const vat   = Math.round(base * 0.17 * 100) / 100;
      const total = Math.round((base + vat) * 100) / 100;
      return { base, vat, total };
    } else {
      const total = val;
      const base  = Math.round((total / 1.17) * 100) / 100;
      const vat   = Math.round((total - base) * 100) / 100;
      return { base, vat, total };
    }
  }, [amount, direction, currency]);

  return (
    <div className="max-w-md">
      {!hideHeader && (
        <>
          <h1 className="text-2xl font-bold mb-1">PDV kalkulator</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Izračun PDV-a prema BiH stopi od 17%.
          </p>
        </>
      )}

      <div className="flex flex-col gap-4 mb-8">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label>Smjer</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as Direction)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Dodaj PDV</SelectItem>
                <SelectItem value="extract">Izvuci PDV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Valuta</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BAM">KM (BAM)</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label>
            {direction === "add"
              ? `Iznos bez PDV-a (${currency})`
              : `Iznos s PDV-om (${currency})`}
          </Label>
          <Input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={currency === "EUR" ? "npr. 100.00" : "npr. 1000.00"}
            className="text-lg h-11"
          />
          {currency === "EUR" && (
            <span className="text-xs text-muted-foreground">
              1 EUR = {EUR_TO_BAM} KM (fiksni kurs Currency Board-a)
            </span>
          )}
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          <table className="w-full text-sm border rounded-md overflow-hidden">
            <tbody>
              {([
                ["Cijena bez PDV-a", result.base],
                ["PDV 17%",          result.vat],
                ["Cijena s PDV-om",  result.total],
              ] as [string, number][]).map(([label, value], i) => (
                <tr
                  key={label}
                  className={
                    label === "Cijena s PDV-om"
                      ? "font-bold border-t-2"
                      : i % 2 === 0
                      ? "bg-muted/30"
                      : ""
                  }
                >
                  <td className="px-3 py-2">{label}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(value, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-xs text-muted-foreground border rounded-md p-3 space-y-1">
            <p>PDV prag za obaveznu registraciju: <strong>50.000 KM</strong> godišnjeg prometa</p>
            <p>Rok predaje PDV prijave: do 10. u mjesecu za prethodni</p>
            <p>e-KUF / e-KIF rok: do 20. u mjesecu za prethodni</p>
          </div>
        </div>
      )}
    </div>
  );
}
