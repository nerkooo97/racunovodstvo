"use client";

import { useState, useTransition } from "react";
import { calculatePeriod, markAsPaid } from "@/app/actions/salary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  year: number;
  month: number;
  periodId: string | null;
  status: string | null;
}

export default function PeriodActions({ year, month, periodId, status }: Props) {
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
