"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization } from "@/contexts/organization-context";
import { Download, FileText } from "lucide-react";

const ASSET_TYPES = [
  { label: "Računari i softver",    rate: 33.33, years: 3  },
  { label: "Putnička vozila",       rate: 20,    years: 5  },
  { label: "Oprema i mašine",       rate: 14.29, years: 7  },
  { label: "Namještaj",             rate: 10,    years: 10 },
  { label: "Poslovni objekti",      rate: 2.5,   years: 40 },
  { label: "Nematerijalna imovina", rate: 0,     years: 0  },
  { label: "Ostalo (ručno)",        rate: 0,     years: 0  },
];

interface AssetRow {
  id: number;
  name: string;
  acquisition_date: string;
  doc_number: string;
  acquisition_value: string;
  kv_start: string;
  years: string;
  rate: string;
  sale_date: string;
  written_off: boolean;
}

let nextId = 1;

function newRow(): AssetRow {
  return {
    id: nextId++,
    name: "",
    acquisition_date: "",
    doc_number: "",
    acquisition_value: "",
    kv_start: "",
    years: "5",
    rate: "20",
    sale_date: "",
    written_off: false,
  };
}

function amortizacija(kvStart: number, rate: number): number {
  return Math.round(kvStart * (rate / 100) * 100) / 100;
}

function kvEnd(kvStart: number, rate: number): number {
  return Math.max(0, Math.round((kvStart - amortizacija(kvStart, rate)) * 100) / 100);
}

export default function PldiPage() {
  let org: any = null;
  try {
    const ctx = useOrganization();
    org = ctx.organization;
  } catch (e) {
    // Gracefully handle case where it's accessed outside the dashboard
  }

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [jmb, setJmb] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [jib, setJib] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [activityCode, setActivityCode] = useState("");
  const [activityName, setActivityName] = useState("");
  const [manualPeriod, setManualPeriod] = useState(false);
  const [rows, setRows] = useState<AssetRow[]>([newRow()]);

  useEffect(() => {
    if (org) {
      setJib(org.tax_id || "");
      setBusinessName(org.name || "");
      setBusinessAddress(org.address || org.city || "");
    }
  }, [org]);

  function updateRow(id: number, field: keyof AssetRow, value: string | boolean) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        if (field === "years" && typeof value === "string") {
          const y = parseFloat(value);
          if (y > 0) updated.rate = String(Math.round((100 / y) * 100) / 100);
        }
        if (field === "acquisition_value" && !r.kv_start) {
          updated.kv_start = value as string;
        }
        return updated;
      })
    );
  }

  function applyAssetType(id: number, typeLabel: string) {
    const t = ASSET_TYPES.find((a) => a.label === typeLabel);
    if (!t) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, years: String(t.years), rate: String(t.rate) }
          : r
      )
    );
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  function removeRow(id: number) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const totalKvStart = rows.reduce((s, r) => s + (parseFloat(r.kv_start) || 0), 0);
  const totalAmort   = rows.reduce((s, r) => s + amortizacija(parseFloat(r.kv_start) || 0, parseFloat(r.rate) || 0), 0);
  const totalKvEnd   = rows.reduce((s, r) => s + kvEnd(parseFloat(r.kv_start) || 0, parseFloat(r.rate) || 0), 0);

  async function generatePdfAction(action: "download" | "preview") {
    const payload = {
      year,
      jmb,
      fullName,
      address,
      jib,
      businessName,
      businessAddress,
      activityCode,
      activityName,
      manualPeriod,
      rows: rows.map(r => ({
        name: r.name,
        acquisition_date: r.acquisition_date,
        doc_number: r.doc_number,
        acquisition_value: parseFloat(r.acquisition_value) || 0,
        kv_start: parseFloat(r.kv_start) || 0,
        years: parseFloat(r.years) || 0,
        rate: parseFloat(r.rate) || 0,
        sale_date: r.sale_date || undefined,
        written_off: r.written_off,
      }))
    };

    try {
      const res = await fetch("/api/pdf/pldi", {
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
        a.download = `pldi-1043-${year}.pdf`;
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
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-1">PLDI-1043</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Popisna lista dugotrajne imovine i obračun amortizacije (linearna metoda, FBiH)
      </p>

      {/* Zaglavlje */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-8">
        <div className="col-span-2">
          <h2 className="font-semibold text-sm mb-2">Porezni obveznik</h2>
        </div>

        <div className="flex flex-col gap-1">
          <Label>JMB</Label>
          <Input value={jmb} onChange={(e) => setJmb(e.target.value)} maxLength={13} placeholder="13 cifara" />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Prezime i ime</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <Label>Adresa stanovanja</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="col-span-2 mt-2">
          <h2 className="font-semibold text-sm mb-2">Registrovana djelatnost</h2>
        </div>

        <div className="flex flex-col gap-1">
          <Label>JIB</Label>
          <Input value={jib} onChange={(e) => setJib(e.target.value)} maxLength={13} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Porezna godina</Label>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-28"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Naziv djelatnosti</Label>
          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Adresa djelatnosti</Label>
          <Input value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Šifra djelatnosti</Label>
          <Input value={activityCode} onChange={(e) => setActivityCode(e.target.value)} className="w-28" />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Naziv djelatnosti (vrsta)</Label>
          <Input value={activityName} onChange={(e) => setActivityName(e.target.value)} />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <Checkbox
            id="manual-period"
            checked={manualPeriod}
            onCheckedChange={(v) => setManualPeriod(v === true)}
          />
          <label htmlFor="manual-period" className="text-sm">Ručno unesi period amortizacije</label>
        </div>
      </div>

      {/* Tabela */}
      <div className="mb-4 overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-2 py-2 text-left w-6">RB</th>
              <th className="px-2 py-2 text-left w-36">Naziv sredstva</th>
              <th className="px-2 py-2 text-left w-32">Vrsta</th>
              <th className="px-2 py-2 text-left w-28">Datum nabavke</th>
              <th className="px-2 py-2 text-left w-24">Br. dokumenta</th>
              <th className="px-2 py-2 text-right w-24">Nabavna vrijed.</th>
              <th className="px-2 py-2 text-right w-24">KV početak</th>
              <th className="px-2 py-2 text-right w-16">Vijek (g)</th>
              <th className="px-2 py-2 text-right w-16">Stopa %</th>
              <th className="px-2 py-2 text-right w-24">Amortizacija</th>
              <th className="px-2 py-2 text-right w-24">KV kraj</th>
              <th className="px-2 py-2 text-left w-28">Datum prodaje</th>
              <th className="px-2 py-2 text-center w-12">Otpis</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const kvS = parseFloat(row.kv_start) || 0;
              const rate = parseFloat(row.rate) || 0;
              const amort = amortizacija(kvS, rate);
              const kve = kvEnd(kvS, rate);
              const inactive = row.written_off || !!row.sale_date;

              return (
                <tr key={row.id} className={inactive ? "opacity-50 bg-muted/20" : "hover:bg-muted/20"}>
                  <td className="px-2 py-1 text-muted-foreground">{idx + 1}</td>
                  <td className="px-2 py-1">
                    <Input
                      value={row.name}
                      onChange={(e) => updateRow(row.id, "name", e.target.value)}
                      className="h-7 text-xs px-1"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Select onValueChange={(v) => applyAssetType(row.id, v)}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Vrsta" />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_TYPES.map((t) => (
                          <SelectItem key={t.label} value={t.label}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="date"
                      value={row.acquisition_date}
                      onChange={(e) => updateRow(row.id, "acquisition_date", e.target.value)}
                      className="h-7 text-xs px-1"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      value={row.doc_number}
                      onChange={(e) => updateRow(row.id, "doc_number", e.target.value)}
                      className="h-7 text-xs px-1"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.acquisition_value}
                      onChange={(e) => updateRow(row.id, "acquisition_value", e.target.value)}
                      className="h-7 text-xs px-1 text-right"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.kv_start}
                      onChange={(e) => updateRow(row.id, "kv_start", e.target.value)}
                      className="h-7 text-xs px-1 text-right"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      min={1}
                      value={row.years}
                      onChange={(e) => updateRow(row.id, "years", e.target.value)}
                      className="h-7 text-xs px-1 text-right w-16"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.rate}
                      onChange={(e) => updateRow(row.id, "rate", e.target.value)}
                      className="h-7 text-xs px-1 text-right w-16"
                    />
                  </td>
                  <td className="px-2 py-1 text-right font-mono">
                    {inactive ? "—" : amort.toFixed(2)}
                  </td>
                  <td className="px-2 py-1 text-right font-mono">
                    {inactive ? "—" : kve.toFixed(2)}
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="date"
                      value={row.sale_date}
                      onChange={(e) => updateRow(row.id, "sale_date", e.target.value)}
                      className="h-7 text-xs px-1"
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <Checkbox
                      checked={row.written_off}
                      onCheckedChange={(v) => updateRow(row.id, "written_off", v === true)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="text-muted-foreground hover:text-destructive text-xs"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t bg-muted/30">
            <tr>
              <td colSpan={6} className="px-2 py-2 text-xs font-semibold">Ukupno</td>
              <td className="px-2 py-2 text-right font-mono text-xs font-bold">{totalKvStart.toFixed(2)}</td>
              <td colSpan={2} />
              <td className="px-2 py-2 text-right font-mono text-xs font-bold">{totalAmort.toFixed(2)}</td>
              <td className="px-2 py-2 text-right font-mono text-xs font-bold">{totalKvEnd.toFixed(2)}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex gap-2 flex-wrap pt-2">
        <Button type="button" variant="outline" onClick={addRow}>
          + Dodaj sredstvo
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

      <div className="mt-6 p-4 border rounded-md bg-muted/30 text-xs text-muted-foreground">
        <p className="font-semibold mb-1">Stope amortizacije (porezno priznate, FBiH)</p>
        <ul className="space-y-0.5">
          <li>Računari i softver: 33,33% (3 god)</li>
          <li>Putnička vozila: 20% (5 god)</li>
          <li>Oprema i mašine: 14,29% (7 god)</li>
          <li>Namještaj: 10% (10 god)</li>
          <li>Poslovni objekti: 2,5%–4% (25–40 god)</li>
        </ul>
      </div>
    </div>
  );
}
