"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generateExport, generateTestExport, validateExport } from "@/app/actions/pdv/export";
import type { ValidationResult } from "@/lib/pdv/validation/export-gate";

type RecordType = "kif" | "kuf";

const TITLES: Record<RecordType, string> = {
  kif: "e-KIF (isporuke)",
  kuf: "e-KUF (nabavke)",
};

function IssueList({ result }: { result: ValidationResult }) {
  if (result.errors.length === 0 && result.warnings.length === 0) {
    return (
      <p className="text-sm text-emerald-600">Sve provjere prošle uspješno.</p>
    );
  }
  return (
    <ul className="space-y-1 text-sm">
      {result.errors.map((e, i) => (
        <li key={`e${i}`} className="text-destructive">
          ✗ {e.serial ? `Rb. ${e.serial}: ` : ""}
          {e.message}
        </li>
      ))}
      {result.warnings.map((w, i) => (
        <li key={`w${i}`} className="text-amber-600">
          ⚠ {w.serial ? `Rb. ${w.serial}: ` : ""}
          {w.message}
        </li>
      ))}
    </ul>
  );
}

function downloadCsv(filename: string, content: string) {
  // Prefiks BOM-a se NE dodaje (UIO traži čisti UTF-8)
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ExportCard({ year, month, type }: { year: number; month: number; type: RecordType }) {
  const [isPending, startTransition] = useTransition();
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const runValidate = useCallback(() => {
    startTransition(async () => {
      const res = await validateExport(type, year, month);
      if (res.error) setMessage(res.error);
      else setValidation(res.validation ?? null);
    });
  }, [type, year, month]);

  useEffect(() => {
    runValidate();
  }, [runValidate]);

  function handleDownload() {
    setMessage(null);
    startTransition(async () => {
      const res = await generateExport(type, year, month);
      if (res.validation) setValidation(res.validation);
      if (res.error) {
        setMessage(res.error);
        return;
      }
      if (res.files && res.files.length > 0) {
        res.files.forEach((f, i) => {
          // mali razmak da preglednik ne blokira višestruke download-e
          setTimeout(() => downloadCsv(f.filename, f.content), i * 300);
        });
        setMessage(
          res.files.length === 1
            ? `Preuzeto: ${res.files[0].filename}`
            : `Preuzeto ${res.files.length} datoteka (split > 5 MB).`
        );
      }
    });
  }

  function handleTestDownload() {
    setMessage(null);
    startTransition(async () => {
      const res = await generateTestExport(type);
      if (res.error) {
        setMessage(res.error);
        return;
      }
      if (res.files && res.files.length > 0) {
        res.files.forEach((f, i) =>
          setTimeout(() => downloadCsv(f.filename, f.content), i * 300)
        );
        setMessage(`Testni uzorak preuzet: ${res.files[0].filename}`);
      }
    });
  }

  const hasErrors = validation ? validation.errors.length > 0 : true;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{TITLES[type]}</h3>
        {validation && (
          <Badge variant={hasErrors ? "secondary" : "default"}>
            {hasErrors
              ? `${validation.errors.length} grešaka`
              : "Spremno"}
          </Badge>
        )}
      </div>

      {validation ? <IssueList result={validation} /> : (
        <p className="text-sm text-muted-foreground">Provjera…</p>
      )}

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={runValidate} disabled={isPending}>
          Ponovo provjeri
        </Button>
        <Button size="sm" onClick={handleDownload} disabled={isPending || hasErrors}>
          Preuzmi CSV
        </Button>
        <Button variant="ghost" size="sm" onClick={handleTestDownload} disabled={isPending}>
          Testni CSV (uzorak)
        </Button>
      </div>
    </div>
  );
}

export default function ExportPanel({
  year,
  month,
  isVatRegistered,
}: {
  year: number;
  month: number;
  isVatRegistered: boolean;
}) {
  return (
    <div className="space-y-4">
      {!isVatRegistered && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm">
          Organizacija nije označena kao PDV obveznik. Provjerite postavke prije
          dostave evidencija.
        </div>
      )}

      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Datoteke se generišu u UTF-8 CSV formatu sa separatorom <code>;</code>,
        prema Tehničkom uputstvu UIO. Naziv slijedi obrazac{" "}
        <code>PDVbroj_YYMM_tip_redni.csv</code>. Nabavke i isporuke se dostavljaju
        odvojeno.
      </div>

      <ExportCard year={year} month={month} type="kif" />
      <ExportCard year={year} month={month} type="kuf" />
    </div>
  );
}
