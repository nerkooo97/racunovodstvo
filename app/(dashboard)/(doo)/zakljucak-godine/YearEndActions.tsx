"use client";

import { useState, useTransition } from "react";
import { closeYear, openYear } from "@/app/actions/accounting/year-end";
import { postDepreciationToGl } from "@/app/actions/fixed-assets";
import { postInventoryAdjustment } from "@/app/actions/accounting/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTaxConfig } from "@/lib/constants/tax-config";

interface Props {
  year: number;
  accountingProfit: number;
  alreadyClosed: boolean;
  /** Knjigovodstveno stanje zaliha robe (konto 1300) — null ako nema prometa */
  inventoryBookBalance: number | null;
  inventoryAdjusted: boolean;
}

export default function YearEndActions({
  year,
  accountingProfit,
  alreadyClosed,
  inventoryBookBalance,
  inventoryAdjusted,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [closingStock, setClosingStock] = useState("0");

  // Korekcije za porezni bilans (PB-800-A)
  const [nonDeductible, setNonDeductible] = useState("0");
  const [nonTaxableIncome, setNonTaxableIncome] = useState("0");
  const [lossCarryforward, setLossCarryforward] = useState("0");
  // Investiciona olakšica (čl. 36-37 ZPD FBiH) Umanjuje POREZ (30% odnosno 50%),
  // ne poreznu osnovicu
  const [taxReliefPercent, setTaxReliefPercent] = useState("0");

  const nd = parseFloat(nonDeductible) || 0;
  const nti = parseFloat(nonTaxableIncome) || 0;
  const lc = parseFloat(lossCarryforward) || 0;
  const relief = Math.min(100, Math.max(0, parseFloat(taxReliefPercent) || 0));

  const cfg = getTaxConfig(`${year}-12-31`);
  const taxRate = cfg.corporateTaxRate;

  const taxableProfit = Math.max(0, accountingProfit + nd - nti - lc);
  const taxBeforeRelief = Math.round(taxableProfit * taxRate * 100) / 100;
  const corporateTax = Math.round(taxBeforeRelief * (1 - relief / 100) * 100) / 100;
  const netProfit = accountingProfit - corporateTax;

  function run(fn: () => Promise<{ error?: string; success?: boolean; skipped?: boolean; posted?: number }>, label: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setMsg({ type: "err", text: res.error });
      else if ("skipped" in res && res.skipped) setMsg({ type: "ok", text: `${label} — već izvršeno.` });
      else if ("posted" in res) setMsg({ type: "ok", text: `${label} — proknjiženo ${res.posted} sredstava.` });
      else setMsg({ type: "ok", text: `${label} — uspješno.` });
    });
  }

  return (
    <div className="space-y-8">
      {msg && (
        <div className={`rounded-md px-4 py-3 text-sm border ${msg.type === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-destructive/50 bg-destructive/10 text-destructive"}`}>
          {msg.text}
        </div>
      )}

      {/* Korak 1 — Amortizacija */}
      <div className="rounded-lg border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Korak 1 — Obračun amortizacije</h3>
            <p className="text-sm text-muted-foreground mt-0.5">D 5400 Amortizacija / P 0290 Ispravka vrijednosti</p>
          </div>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => run(() => postDepreciationToGl(year), "Amortizacija")}
          >
            Proknjiži amortizaciju
          </Button>
        </div>
      </div>

      {/* Korak 2 — Razduženje zaliha (samo ako konto 1300 ima promet) */}
      {inventoryBookBalance !== null && (
        <div className="rounded-lg border p-5 space-y-3">
          <div>
            <h3 className="font-semibold">Korak 2 — Razduženje zaliha po popisu (inventura)</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              D 5010 Nabavna vrijednost prodate robe / P 1300 Zalihe robe ·
              Knjigovodstveno stanje 1300: <span className="font-mono font-medium">{inventoryBookBalance.toFixed(2)} KM</span>
            </p>
          </div>
          {inventoryAdjusted ? (
            <div className="rounded-md px-3 py-2 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800">
              Razduženje zaliha za {year}. je proknjiženo.
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Stanje zaliha po popisu na 31.12. (KM)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={closingStock}
                  onChange={(e) => setClosingStock(e.target.value)}
                  className="h-8 font-mono text-sm w-48"
                />
              </div>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  run(
                    () => postInventoryAdjustment(year, parseFloat(closingStock) || 0),
                    "Razduženje zaliha"
                  )
                }
              >
                Proknjiži razduženje
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Korak 3 — Porezni bilans */}
      <div className="rounded-lg border p-5 space-y-4">
        <h3 className="font-semibold">Korak 3 — Porezni bilans (PB-800-A) · stopa 10%</h3>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div className="col-span-2 flex justify-between border-b pb-2">
            <span className="text-muted-foreground">Računovodstvena dobit/gubitak</span>
            <span className={`font-mono font-semibold ${accountingProfit >= 0 ? "text-emerald-700" : "text-destructive"}`}>
              {accountingProfit.toFixed(2)} KM
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">+ Porezno nepriznati rashodi (npr. 70% reprezentacije, kazne)</Label>
            <Input type="number" min={0} step="0.01" value={nonDeductible} onChange={e => setNonDeductible(e.target.value)} className="h-8 font-mono text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">- Neoporezivi prihodi (dividende iz oporez. dobiti)</Label>
            <Input type="number" min={0} step="0.01" value={nonTaxableIncome} onChange={e => setNonTaxableIncome(e.target.value)} className="h-8 font-mono text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">- Preneseni porezni gubici (max 5 god.)</Label>
            <Input type="number" min={0} step="0.01" value={lossCarryforward} onChange={e => setLossCarryforward(e.target.value)} className="h-8 font-mono text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">
              Umanjenje poreza — investiciona olakšica % (čl. 36-37: 30% ili 50% poreza)
            </Label>
            <Input type="number" min={0} max={100} step="1" value={taxReliefPercent} onChange={e => setTaxReliefPercent(e.target.value)} className="h-8 font-mono text-sm" />
          </div>

          <div className="col-span-2 border-t pt-2 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Porezna osnovica</span>
              <span className="font-mono font-semibold">{taxableProfit.toFixed(2)} KM</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Porez prije olakšice (10%)</span>
              <span className="font-mono">{taxBeforeRelief.toFixed(2)} KM</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Porez na dobit (nakon olakšice)</span>
              <span className="font-mono font-semibold text-amber-700">{corporateTax.toFixed(2)} KM</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t pt-1.5">
              <span>Neto dobit</span>
              <span className={`font-mono ${netProfit >= 0 ? "text-emerald-700" : "text-destructive"}`}>
                {netProfit.toFixed(2)} KM
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Korak 4 — Zaključak */}
      <div className="rounded-lg border p-5 space-y-3">
        <div>
          <h3 className="font-semibold">Korak 4 — Zaključak poslovne godine</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kreira 5 naloga: kl. 6 → 7120 · kl. 5 → 7100 · utvrđivanje rezultata · porez (7210/4820) · prenos na kapital (3410/3510)
          </p>
        </div>
        {alreadyClosed ? (
          <div className="rounded-md px-3 py-2 text-sm bg-amber-50 border border-amber-200 text-amber-800">
            Godina {year}. je već zaključena.
          </div>
        ) : (
          <Button
            disabled={isPending || accountingProfit === 0}
            onClick={() => run(() => closeYear(year, corporateTax), "Zaključak")}
          >
            Zatvori {year}. godinu
          </Button>
        )}
      </div>

      {/* Korak 5 — Otvaranje */}
      <div className="rounded-lg border p-5 space-y-3">
        <div>
          <h3 className="font-semibold">Korak 5 — Otvaranje {year + 1}. godine</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Prenosi saldo bilansnih konta (kl. 0-4) u novu godinu putem konta 7000
          </p>
        </div>
        <Button
          variant="outline"
          disabled={isPending || !alreadyClosed}
          onClick={() => run(() => openYear(year), `Otvaranje ${year + 1}.`)}
        >
          Otvori {year + 1}. godinu
        </Button>
        {!alreadyClosed && (
          <p className="text-xs text-muted-foreground">Dostupno nakon zaključka {year}.</p>
        )}
      </div>
    </div>
  );
}
