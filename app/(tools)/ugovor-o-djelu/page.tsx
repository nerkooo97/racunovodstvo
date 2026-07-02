"use client";

import { useState, useMemo, useEffect } from "react";
import { useOrganization } from "@/contexts/organization-context";
import {
  calculateUodFromBruto,
  calculateUodFromNeto,
  type UodExpenseType,
} from "@/lib/calculations/ugovor-o-djelu";
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
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

const CANTONS = [
  { code: "01", name: "Unsko-sanski kanton" },
  { code: "02", name: "Posavski kanton" },
  { code: "03", name: "Tuzlanski kanton" },
  { code: "04", name: "Zeničko-dobojski kanton" },
  { code: "05", name: "Bosansko-podrinjski kanton" },
  { code: "06", name: "Srednjobosanski kanton" },
  { code: "07", name: "Hercegovačko-neretvanski kanton" },
  { code: "08", name: "Zapadnohercegovački kanton" },
  { code: "09", name: "Sarajevski kanton" },
  { code: "10", name: "Kanton 10" },
];

const EXPENSE_OPTIONS: { value: UodExpenseType; label: string }[] = [
  { value: "standard", label: "Standardna naknada (20% troškovi)" },
  { value: "author",   label: "Autorsko djelo (30% troškovi)" },
  { value: "none",     label: "Komisija / nadzorni odbor (0% troškovi)" },
];

export default function UgovorODjeluPage() {
  // Active organization integration
  let org: any = null;
  try {
    const ctx = useOrganization();
    org = ctx.organization;
  } catch (e) {
    // Gracefully handle case where it's accessed outside the dashboard
  }

  const [direction,    setDirection]    = useState<"neto" | "bruto">("neto");
  const [expenseType,  setExpenseType]  = useState<UodExpenseType>("standard");
  const [amount,       setAmount]       = useState("");

  // Ugovorne strane
  const [naruciocNaziv, setNaruciocNaziv] = useState("");
  const [naruciocAdresa,setNaruciocAdresa]= useState("");
  const [naruciocJib,   setNaruciocJib]   = useState("");
  const [izvrsName,     setIzvrsName]     = useState("");
  const [izvrsAdresa,   setIzvrsAdresa]   = useState("");
  const [izvrsJmbg,     setIzvrsJmbg]     = useState("");
  const [izvrsZiro,     setIzvrsZiro]     = useState("");
  const [opis,          setOpis]          = useState("");
  const [datumZakl,     setDatumZakl]     = useState("");
  const [rokIzvrs,      setRokIzvrs]      = useState("");
  const [brojUgovora,   setBrojUgovora]   = useState("");
  const [mjesto,        setMjesto]        = useState("");
  const [sud,           setSud]           = useState("");
  const [kanton,        setKanton]        = useState("09");

  useEffect(() => {
    if (org) {
      setNaruciocNaziv(org.name || "");
      setNaruciocAdresa(org.address || org.city || "");
      setNaruciocJib(org.tax_id || "");
    }
  }, [org]);

  const val = parseFloat(amount.replace(",", "."));
  const isValid = !isNaN(val) && val > 0;

  const result = useMemo(() => {
    if (!isValid) return null;
    const dateArg = datumZakl || new Date();
    return direction === "neto"
      ? calculateUodFromNeto(val, expenseType, dateArg)
      : calculateUodFromBruto(val, expenseType, dateArg);
  }, [val, direction, expenseType, isValid, datumZakl]);

  const uplatnice = result
    ? [
        { naziv: "Zdravstveno osiguranje — Kanton",           sifra: "712116", iznos: result.healthKanton },
        { naziv: "Zdravstveno osiguranje — FZO FBiH",         sifra: "712116", iznos: result.healthFbih, racun: "102-050-00000640-18" },
        { naziv: "Porez na dohodak — Kantonalni budžet",      sifra: "716116", iznos: result.incomeTax },
        { naziv: "PIO/MIO — Budžet FBiH",                    sifra: "712126", iznos: result.pensionOn, racun: "102-050-00001066-98" },
        { naziv: "Zaštita od prirodnih nepogoda — Kanton",    sifra: "722582", iznos: result.disaster },
        { naziv: "Opća vodna naknada — Kanton",               sifra: "722582", iznos: result.water },
      ]
    : [];
  function buildQuery(): string {
    const params = new URLSearchParams({
      naruciocNaziv,
      naruciocAdresa,
      naruciocJib,
      izvrsName,
      izvrsAdresa,
      izvrsJmbg,
      izvrsZiro,
      opis,
      datumZakl,
      rokIzvrs,
      brojUgovora,
      mjesto,
      sud,
      kanton,
      direction,
      expenseType,
      amount,
      _t: String(Date.now()),
    });
    return params.toString();
  }

  function validateForm() {
    if (!amount || isNaN(parseFloat(amount.replace(",", "."))) || parseFloat(amount.replace(",", ".")) <= 0) {
      alert("Molimo unesite ispravan iznos naknade.");
      return false;
    }
    if (!izvrsName.trim()) {
      alert("Molimo unesite ime i prezime izvršioca posla.");
      return false;
    }
    return true;
  }

  function downloadPdf() {
    if (!validateForm()) return;
    const url = `/api/pdf?type=ugovor-o-djelu&${buildQuery()}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `ugovor-o-djelu-${izvrsName.trim().replace(/\s+/g, "-") || "dokument"}.pdf`;
    a.click();
  }

  function openPdfPreview() {
    if (!validateForm()) return;
    window.open(`/api/pdf?type=ugovor-o-djelu&${buildQuery()}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Ugovor o djelu — kalkulator</h1>
        <p className="text-muted-foreground text-sm">
          Izračun poreza i doprinosa za honorar u FBiH. Zdravstveni doprinos 4%, porez 10%, PIO 6% na teret naručioca.
        </p>
      </div>

      {/* Kalkulator */}
      <div className="border rounded-md p-4 space-y-4">
        <h2 className="font-semibold text-sm">Iznos naknade</h2>

        <div className="flex gap-2 text-sm">
          {(["neto", "bruto"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className={`px-3 py-1 rounded-md border transition-colors ${
                direction === d ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
              }`}
            >
              Poznat {d === "neto" ? "NETO" : "BRUTO"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label>Vrsta naknade</Label>
            <Select value={expenseType} onValueChange={(v) => setExpenseType(v as UodExpenseType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>{direction === "neto" ? "Neto iznos (KM)" : "Bruto iznos (KM)"}</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="npr. 1.000,00"
            />
          </div>
        </div>

        {result && (
          <div className="space-y-3">
            <table className="w-full text-sm border rounded-md overflow-hidden">
              <tbody>
                {[
                  ["1", "Neto iznos naknade",                          result.netPayment,   true],
                  ["2", `Bruto iznos UoD (×${(1/result.expenseRate < 100 ? (1/(1-result.expenseRate-result.expenseRate*0.064)).toFixed(6) : "—")})`, result.bruto, false],
                  ["3", `Priznati troškovi ${(result.expenseRate*100).toFixed(0)}%`,   result.expenseAmount, false],
                  ["4", "Bruto naknada umanjena za troškove",          result.brutoMinusExp,false],
                  ["5", "Doprinos za zdravstveno 4%",                  result.healthContrib,false],
                  ["6", "Osnovica za porez",                           result.taxBase,      false],
                  ["7", "Porez na dohodak 10%",                        result.incomeTax,    false],
                  ["8", "Naknada po odbitku zdravstva i poreza",       result.naknada,      false],
                  ["9", `Priznati troškovi (vraćeni)`,                 result.expenseAmount,false],
                  ["10","Naknada za isplatu",                          result.netPayment,   true],
                  ["11","PIO/MIO 6% (na teret naručioca)",             result.pensionOn,    false],
                  ["12","Zaštita od prirodnih nepogoda 0,5%",          result.disaster,     false],
                  ["13","Opća vodna naknada 0,5%",                     result.water,        false],
                  ["14","Ukupni troškovi naručioca",                   result.totalCost,    true],
                  ["15","Isplata izvršiocu",                           result.netPayment,   false],
                  ["16",`Porezi i doprinosi (% na neto)`,              null,                false, `${result.taxPercent.toFixed(2)}%`],
                ].map(([rb, label, value, bold, text]) => (
                  <tr key={rb as string} className={bold ? "font-bold border-t-2 bg-muted/30" : ""}>
                    <td className="px-3 py-1 text-muted-foreground w-8">{rb as string}</td>
                    <td className="px-3 py-1">{label as string}</td>
                    <td className="px-3 py-1 text-right font-mono">
                      {text ? (text as string) : formatKM(value as number)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ugovorene strane */}
      <div className="border rounded-md p-4 space-y-4">
        <h2 className="font-semibold text-sm">Naručilac (poslodavac)</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <Label className="text-xs">Naziv / Ime i prezime</Label>
            <Input value={naruciocNaziv} onChange={(e) => setNaruciocNaziv(e.target.value)} disabled={!!org} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Adresa</Label>
            <Input value={naruciocAdresa} onChange={(e) => setNaruciocAdresa(e.target.value)} disabled={!!org} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">JIB / ID broj</Label>
            <Input value={naruciocJib} onChange={(e) => setNaruciocJib(e.target.value)} disabled={!!org} />
          </div>
        </div>
      </div>

      <div className="border rounded-md p-4 space-y-4">
        <h2 className="font-semibold text-sm">Izvršilac (radnik/honorarac)</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <Label className="text-xs">Ime i prezime</Label>
            <Input value={izvrsName} onChange={(e) => setIzvrsName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Adresa</Label>
            <Input value={izvrsAdresa} onChange={(e) => setIzvrsAdresa(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">JMBG</Label>
            <Input value={izvrsJmbg} onChange={(e) => setIzvrsJmbg(e.target.value)} maxLength={13} />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <Label className="text-xs">Žiro račun (transakcijski)</Label>
            <Input value={izvrsZiro} onChange={(e) => setIzvrsZiro(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="border rounded-md p-4 space-y-4">
        <h2 className="font-semibold text-sm">Predmet ugovora i rokovi</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1">
            <Label className="text-xs">Opis posla (počinje glagolom, npr. "Izrada...")</Label>
            <Input value={opis} onChange={(e) => setOpis(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Datum zaključenja</Label>
            <Input type="date" value={datumZakl} onChange={(e) => setDatumZakl(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Rok izvršenja</Label>
            <Input type="date" value={rokIzvrs} onChange={(e) => setRokIzvrs(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Broj ugovora</Label>
            <Input value={brojUgovora} onChange={(e) => setBrojUgovora(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Mjesto zaključenja</Label>
            <Input value={mjesto} onChange={(e) => setMjesto(e.target.value)} />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <Label className="text-xs">Nadležni sud (u slučaju spora)</Label>
            <Input value={sud} onChange={(e) => setSud(e.target.value)} placeholder="npr. Općinski sud u Sarajevu" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Kanton</Label>
            <Select value={kanton} onValueChange={setKanton}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CANTONS.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Uplatnice */}
      {result && uplatnice.length > 0 && (
        <div className="border rounded-md p-4">
          <h2 className="font-semibold text-sm mb-3">6 uplatnica — rok isplate: isti dan kao i neto isplata izvršiocu</h2>
          <div className="space-y-2">
            {uplatnice.map((u, i) => (
              <div key={i} className="text-sm border rounded p-2 flex justify-between items-start gap-4">
                <div>
                  <div className="font-medium">{i + 1}. {u.naziv}</div>
                  {u.racun && (
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">Račun: {u.racun}</div>
                  )}
                  <div className="text-xs text-muted-foreground">Šifra vrste prihoda: {u.sifra}</div>
                </div>
                <div className="font-mono font-semibold shrink-0">{formatKM(u.iznos)}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Napomena: Naručilac podnosi i AUG-1031 obrazac. Uplate se vrše istovremeno s isplatom neto iznosa.
          </p>
        </div>
      )}

      {/* Pravno upozorenje */}
      <div className="border border-amber-200 rounded-md p-4 bg-amber-50 text-sm text-amber-900">
        <strong>Pravno upozorenje:</strong> Inspekcija rada može preklasifikovati UoD u ugovor o radu
        ako posao ima karakteristike radnog odnosa (fiksno radno vrijeme, subordinacija, dugotrajnost).
        UoD mora biti ograničen vremenski i predmetno.
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          type="button"
          className="gap-1.5"
          onClick={downloadPdf}
        >
          <Download className="h-4 w-4" />
          Preuzmi PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          className="gap-1.5"
          onClick={openPdfPreview}
        >
          <FileText className="h-4 w-4" />
          Pregled / štampaj
        </Button>
      </div>
    </div>
  );
}
