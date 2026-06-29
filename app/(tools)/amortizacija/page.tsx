"use client";

import { useState } from "react";
import { DEPRECIATION_RATES } from "@/lib/constants/tax-rates";
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

type AssetType = keyof typeof DEPRECIATION_RATES;

const ASSET_LABELS: Record<AssetType, string> = {
  computers_software: "Računari i softver (33,33% / 3 god.)",
  vehicles:           "Vozila (20% / 5 god.)",
  equipment:          "Oprema i strojevi (14,29% / 7 god.)",
  furniture:          "Namještaj (10% / 10 god.)",
  buildings_fast:     "Zgrade — brza amortizacija (4% / 25 god.)",
  buildings_slow:     "Zgrade — spora amortizacija (2,5% / 40 god.)",
};

interface YearRow {
  year: number;
  annualAmount: number;
  accumulated: number;
  bookValue: number;
}

export default function AmortizacijaPage() {
  const [assetType, setAssetType] = useState<AssetType>("computers_software");
  const [cost, setCost]           = useState("");
  const [startYear, setStartYear] = useState(String(new Date().getFullYear()));
  const [rows, setRows]           = useState<YearRow[]>([]);

  function calculate() {
    const val  = parseFloat(cost.replace(",", "."));
    const year = parseInt(startYear) || new Date().getFullYear();
    if (isNaN(val) || val <= 0) return;

    const { rate, years } = DEPRECIATION_RATES[assetType];
    const annual = val * rate;
    const result: YearRow[] = [];
    let accumulated = 0;

    for (let i = 0; i < years; i++) {
      const isLast    = i === years - 1;
      const amount    = isLast ? val - accumulated : annual;
      accumulated    += amount;
      result.push({
        year: year + i,
        annualAmount: amount,
        accumulated,
        bookValue: val - accumulated,
      });
    }
    setRows(result);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Kalkulator amortizacije</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Linearna amortizacija prema stopama iz FBiH poreznih propisa (PLDI-1043).
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="col-span-2 flex flex-col gap-1">
          <Label>Vrsta sredstva</Label>
          <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(DEPRECIATION_RATES) as AssetType[]).map((k) => (
                <SelectItem key={k} value={k}>{ASSET_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Nabavna vrijednost (KM)</Label>
          <Input
            type="text"
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="npr. 5000.00"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Godina početka</Label>
          <Input
            type="number"
            value={startYear}
            onChange={(e) => setStartYear(e.target.value)}
          />
        </div>
      </div>

      <Button onClick={calculate} className="mb-6">Izračunaj</Button>

      {rows.length > 0 && (
        <table className="w-full text-sm border rounded-md overflow-hidden">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left">Godina</th>
              <th className="px-3 py-2 text-right">Godišnja amort.</th>
              <th className="px-3 py-2 text-right">Akumulirana</th>
              <th className="px-3 py-2 text-right">Sadašnja vrijednost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.year} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                <td className="px-3 py-1.5">{row.year}.</td>
                <td className="px-3 py-1.5 text-right font-mono">{formatKM(row.annualAmount)}</td>
                <td className="px-3 py-1.5 text-right font-mono">{formatKM(row.accumulated)}</td>
                <td className="px-3 py-1.5 text-right font-mono">{formatKM(row.bookValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
