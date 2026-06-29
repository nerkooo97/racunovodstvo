"use client";

import { useMemo } from "react";
import { useState } from "react";
import { calculateFromGross, calculateFromNet } from "@/lib/calculations/salary";
import { formatKM } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Direction = "gross" | "net";
type OrgType   = "obrt" | "doo";

export default function PreracunPlatePage({ hideHeader = false }: { hideHeader?: boolean }) {
  const [direction, setDirection] = useState<Direction>("gross");
  const [amount, setAmount]       = useState("");
  const [orgType, setOrgType]     = useState<OrgType>("obrt");
  const [taxCoeff, setTaxCoeff]   = useState("1.0");

  const result = useMemo(() => {
    const val   = parseFloat(amount.replace(",", "."));
    const coeff = parseFloat(taxCoeff.replace(",", ".")) || 1.0;
    if (isNaN(val) || val <= 0) return null;
    return direction === "gross"
      ? calculateFromGross(val, coeff, orgType)
      : calculateFromNet(val, coeff, orgType);
  }, [amount, direction, orgType, taxCoeff]);

  const coeff = parseFloat(taxCoeff.replace(",", ".")) || 1.0;
  const currentDeduction = Math.round(300 * coeff * 100) / 100;

  return (
    <div className="max-w-2xl">
      {!hideHeader && (
        <>
          <h1 className="text-2xl font-bold mb-1">Preračun plate</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Besplatni kalkulator za preračun bruto/neto plate u FBiH.
          </p>
        </>
      )}

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <Label>Smjer računanja</Label>
          <Select value={direction} onValueChange={(v) => setDirection(v as Direction)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gross">Bruto → Neto</SelectItem>
              <SelectItem value="net">Neto → Bruto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Tip organizacije</Label>
          <Select value={orgType} onValueChange={(v) => setOrgType(v as OrgType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="obrt">Obrt</SelectItem>
              <SelectItem value="doo">D.O.O.</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>{direction === "gross" ? "Bruto iznos (KM)" : "Neto iznos (KM)"}</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="npr. 2000.00"
            className="text-lg h-11"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Porezni koeficijent</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={taxCoeff}
            onChange={(e) => setTaxCoeff(e.target.value)}
            placeholder="1.0"
          />
          <span className="text-xs text-muted-foreground">
            Koeficijent {coeff.toFixed(1)} = {formatKM(currentDeduction)} odbitka
          </span>
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          {/* Neto prominentno */}
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between">
            <span className="font-semibold text-sm">
              {direction === "gross" ? "Neto plaća" : "Bruto plaća"}
            </span>
            <span className="text-2xl font-bold font-mono">
              {formatKM(direction === "gross" ? result.net_salary : result.gross_salary)}
            </span>
          </div>

          {/* Obračun radnika */}
          <section>
            <h2 className="font-semibold text-sm mb-2 text-muted-foreground uppercase tracking-wider">
              Doprinosi iz plate (na teret radnika)
            </h2>
            <table className="w-full text-sm border rounded-md overflow-hidden">
              <tbody>
                {([
                  ["Bruto plaća",                           result.gross_salary,               ""],
                  ["PIO / MIO",                             result.pension_contribution,        "17%"],
                  ["Zdravstveno osiguranje",                result.health_contribution,         "12,5%"],
                  ["Osiguranje od nezaposlenosti",          result.unemployment_contribution,   "1,5%"],
                  ["Ukupno doprinosi IZ",                   result.total_contributions_from,    "31%"],
                ] as [string, number, string][]).map(([label, value, rate], i) => (
                  <tr key={label} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                    <td className="px-3 py-1.5">{label}</td>
                    <td className="px-3 py-1.5 text-muted-foreground text-xs text-center w-16">{rate}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{formatKM(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="font-semibold text-sm mb-2 text-muted-foreground uppercase tracking-wider">
              Porez na dohodak
            </h2>
            <table className="w-full text-sm border rounded-md overflow-hidden">
              <tbody>
                {([
                  ["Porezna osnovica",    result.tax_base,          ""],
                  ["Lični odbitak",       result.personal_deduction, ""],
                  ["Oporeziva osnovica",  result.taxable_base,       ""],
                  ["Porez na dohodak",   result.income_tax,          "10%"],
                  ["Neto plaća",         result.net_salary,          ""],
                ] as [string, number, string][]).map(([label, value, rate], i) => (
                  <tr
                    key={label}
                    className={
                      label === "Neto plaća"
                        ? "font-bold border-t"
                        : i % 2 === 0
                        ? "bg-muted/30"
                        : ""
                    }
                  >
                    <td className="px-3 py-1.5">{label}</td>
                    <td className="px-3 py-1.5 text-muted-foreground text-xs text-center w-16">{rate}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{formatKM(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Doprinosi poslodavca */}
          <section>
            <h2 className="font-semibold text-sm mb-2 text-muted-foreground uppercase tracking-wider">
              Doprinosi na platu (na teret poslodavca)
            </h2>
            <table className="w-full text-sm border rounded-md overflow-hidden">
              <tbody>
                {([
                  ["PIO / MIO na bruto",              result.pension_contribution_on,       "6%"],
                  ["Zdravstveno na bruto",             result.health_contribution_on,        "4%"],
                  ["Nezaposlenost na bruto",           result.unemployment_contribution_on,  "0,5%"],
                  ["Opća vodna naknada (od neto)",     result.water_contribution,            "0,5%"],
                  ["Zaštita od nesreća (od neto)",     result.disaster_contribution,         "0,5%"],
                  ...(orgType === "doo"
                    ? [["Fond za profesionalnu rehab.", result.disability_fund, "0,5%"] as [string, number, string]]
                    : []),
                  ["Ukupni trošak poslodavca",         result.total_employer_cost,           ""],
                ] as [string, number, string][]).map(([label, value, rate], i) => (
                  <tr
                    key={label}
                    className={
                      label === "Ukupni trošak poslodavca"
                        ? "font-bold border-t-2"
                        : i % 2 === 0
                        ? "bg-muted/30"
                        : ""
                    }
                  >
                    <td className="px-3 py-1.5">{label}</td>
                    <td className="px-3 py-1.5 text-muted-foreground text-xs text-center w-16">{rate}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{formatKM(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {!result && amount && (
        <p className="text-sm text-muted-foreground">Unesite validan iznos za prikaz obračuna.</p>
      )}
    </div>
  );
}
