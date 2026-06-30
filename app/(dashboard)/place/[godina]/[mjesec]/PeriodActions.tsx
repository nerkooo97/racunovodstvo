"use client";

import { useState, useTransition } from "react";
import { calculatePeriod, markAsPaid } from "@/app/actions/salary";
import { postSalaryPeriodToGl } from "@/app/actions/accounting/posting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OrgType } from "@/lib/organization/regime";

interface Props {
  year: number;
  month: number;
  periodId: string | null;
  status: string | null;
  orgType: OrgType;
}

export default function PeriodActions({ year, month, periodId, status, orgType }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState("");

  function handleCalculate() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await calculatePeriod(year, month);
      if (result.error) setError(result.error);
      else setSuccess("Obračun uspješno izračunat.");
    });
  }

  function handlePostToGl() {
    if (!periodId) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await postSalaryPeriodToGl(periodId);
      if (result.error) setError(result.error);
      else if (result.skipped) setSuccess("Obračun je već proknjižen u Glavnu knjigu.");
      else setSuccess(`Proknjiženo u GK (nalog: D 5200 bruto / P 4500+4800+4810).`);
    });
  }

  function handleMarkPaid() {
    if (!periodId || !paymentDate) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await markAsPaid(periodId, paymentDate);
      if (result.error) setError(result.error);
      else setSuccess("Period označen kao isplaćen.");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mt-2">
      <Button onClick={handleCalculate} disabled={isPending}>
        {isPending ? "Računanje..." : "Izračunaj"}
      </Button>

      {periodId && orgType === "doo" && (
        <Button
          variant="outline"
          onClick={handlePostToGl}
          disabled={isPending}
        >
          Proknjiži u GK
        </Button>
      )}

      {periodId && status !== "paid" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-40"
            placeholder="Datum isplate"
          />
          <Button
            variant="outline"
            onClick={handleMarkPaid}
            disabled={isPending || !paymentDate}
          >
            Označi isplaćeno
          </Button>
        </div>
      )}

      {error   && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
    </div>
  );
}
