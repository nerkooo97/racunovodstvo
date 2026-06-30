"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addFixedAsset } from "@/app/actions/fixed-assets";
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
import FormSection from "@/components/shared/form-section";

const ASSET_TYPES = [
  { label: "Računari i softver",    rate: 33.33, years: 3  },
  { label: "Putnička vozila",       rate: 20,    years: 5  },
  { label: "Oprema i mašine",       rate: 14.29, years: 7  },
  { label: "Namještaj",             rate: 10,    years: 10 },
  { label: "Poslovni objekti",      rate: 2.5,   years: 40 },
  { label: "Nematerijalna imovina", rate: 0,     years: 0  },
  { label: "Ostalo (ručno)",        rate: 0,     years: 0  },
];

export default function FixedAssetForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState(ASSET_TYPES[0].label);
  const [acquisitionDate, setAcquisitionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [docNumber, setDocNumber] = useState("");
  const [acquisitionCost, setAcquisitionCost] = useState("");
  const [rate, setRate] = useState(String(ASSET_TYPES[0].rate));
  const [years, setYears] = useState(String(ASSET_TYPES[0].years));
  const [notes, setNotes] = useState("");

  function onTypeChange(label: string) {
    setAssetType(label);
    const t = ASSET_TYPES.find((a) => a.label === label);
    if (t) {
      setRate(String(t.rate));
      setYears(String(t.years));
    }
  }

  function onYearsChange(v: string) {
    setYears(v);
    const y = parseFloat(v.replace(",", "."));
    if (y > 0) setRate(String(Math.round((100 / y) * 100) / 100));
  }

  const annualDepreciation =
    ((parseFloat(acquisitionCost) || 0) * (parseFloat(rate) || 0)) / 100;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const y = parseInt(years) || 0;
    const r = parseFloat(rate) || 0;

    if (!name.trim()) return setError("Naziv sredstva je obavezan.");
    if (!(parseFloat(acquisitionCost) > 0))
      return setError("Nabavna vrijednost mora biti veća od 0.");

    startTransition(async () => {
      const res = await addFixedAsset({
        name: name.trim(),
        asset_type: assetType,
        acquisition_date: acquisitionDate,
        document_number: docNumber || null,
        acquisition_cost: parseFloat(acquisitionCost),
        depreciation_rate: r,
        useful_life_years: y,
        disposal_date: null,
        disposal_value: null,
        notes: notes || null,
      });

      if (res.error) {
        setError(res.error);
      } else {
        router.push("/dugotrajnaimovina");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <FormSection title="Osnovno">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="name">Naziv sredstva *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="npr. Laptop Dell XPS 15"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="asset_type">Vrsta imovine</Label>
            <Select value={assetType} onValueChange={onTypeChange}>
              <SelectTrigger id="asset_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map((t) => (
                  <SelectItem key={t.label} value={t.label}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc_number">Broj dokumenta</Label>
            <Input
              id="doc_number"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="npr. F-2026-001"
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Nabavka">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acquisition_date">Datum nabavke *</Label>
            <Input
              id="acquisition_date"
              type="date"
              value={acquisitionDate}
              onChange={(e) => setAcquisitionDate(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acquisition_cost">Nabavna vrijednost (KM) *</Label>
            <Input
              id="acquisition_cost"
              type="number"
              min={0}
              step="0.01"
              value={acquisitionCost}
              onChange={(e) => setAcquisitionCost(e.target.value)}
              placeholder="0,00"
              required
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Amortizacija">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="useful_life">Vijek trajanja (god)</Label>
            <Input
              id="useful_life"
              type="number"
              min={1}
              value={years}
              onChange={(e) => onYearsChange(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="depr_rate">Stopa amortizacije (%)</Label>
            <Input
              id="depr_rate"
              type="number"
              min={0}
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Godišnja amortizacija</Label>
            <Input
              value={annualDepreciation.toFixed(2) + " KM"}
              readOnly
              className="bg-muted font-mono"
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Napomena">
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Opcionalna napomena"
        />
      </FormSection>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Čuvanje..." : "Dodaj sredstvo"}
        </Button>
        <Button asChild variant="outline">
          <Link href="/dugotrajnaimovina">Odustani</Link>
        </Button>
      </div>
    </form>
  );
}
