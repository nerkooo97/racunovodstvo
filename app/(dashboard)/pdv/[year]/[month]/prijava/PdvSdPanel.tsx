"use client";

import { Button } from "@/components/ui/button";
import { formatKM } from "@/lib/utils";
import type { PdvReturn } from "@/lib/pdv/pdv-sd/types";

interface Row {
  field: string;
  label: string;
  value: number;
  strong?: boolean;
}

export default function PdvSdPanel({
  ret,
  year,
  month,
  vatRegistered,
}: {
  ret: PdvReturn;
  year: number;
  month: number;
  vatRegistered: boolean;
}) {
  const supplies: Row[] = [
    { field: "11", label: "Oporezive isporuke — osnovica (17%)", value: ret.taxableSuppliesBase },
    { field: "12", label: "Izvoz (oslobođeno s pravom na odbitak)", value: ret.exportSupplies },
    { field: "13", label: "Oslobođene isporuke bez prava na odbitak", value: ret.exemptSupplies },
    { field: "—", label: "Vlastita / vanposlovna potrošnja", value: ret.internalSupplies },
    { field: "21", label: "Izlazni PDV", value: ret.outputVat, strong: true },
  ];
  const purchases: Row[] = [
    { field: "41", label: "Oporezive nabavke iz zemlje — osnovica", value: ret.domesticPurchasesBase },
    { field: "42", label: "Uvoz (JCI) — osnovica", value: ret.importBase },
    { field: "—", label: "Paušalna naknada", value: ret.flatFee },
    { field: "51", label: "Ulazni PDV — ukupno", value: ret.inputVatTotal },
    { field: "—", label: "Neodbitni ulazni PDV", value: ret.nonDeductibleVat },
    { field: "60", label: "Odbitni ulazni PDV", value: ret.deductibleVat, strong: true },
  ];

  const result = ret.vatLiability > 0 ? ret.vatLiability : ret.vatCredit;
  const resultLabel =
    ret.vatLiability > 0
      ? "PDV obaveza za uplatu (UIO)"
      : ret.vatCredit > 0
        ? "PDV za povrat"
        : "Saldo PDV-a";

  return (
    <div className="space-y-4">
      {!vatRegistered && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm">
          PDV broj organizacije nije ispravno postavljen (12 cifara). Provjerite
          postavke prije nego što popunite službenu prijavu.
        </div>
      )}

      <Section title="Isporuke (izlazni PDV)" rows={supplies} />
      <Section title="Nabavke (ulazni PDV)" rows={purchases} />

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold">{resultLabel}</span>
          <span
            className={`font-mono text-lg font-bold ${
              ret.vatLiability > 0 ? "text-destructive" : "text-emerald-600"
            }`}
          >
            {formatKM(result)}
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button asChild>
          <a
            href={`/api/pdf?type=pdv-sd&year=${year}&month=${month}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Preuzmi PDF prijavu
          </a>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Pregled je agregiran iz e-KIF ({ret.kifCount}) i e-KUF ({ret.kufCount}) stavki.
        Brojevi rubrika su orijentacioni — služi kao pomoć pri popunjavanju službene
        PDV prijave UIO.
      </p>
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="bg-muted/50 px-4 py-2 text-sm font-semibold border-b">
        {title}
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="px-4 py-2 w-10 font-mono text-xs text-muted-foreground">
                {r.field}
              </td>
              <td className={`px-2 py-2 ${r.strong ? "font-medium" : ""}`}>
                {r.label}
              </td>
              <td
                className={`px-4 py-2 text-right font-mono ${
                  r.strong ? "font-semibold" : ""
                }`}
              >
                {formatKM(r.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
