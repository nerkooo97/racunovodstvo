"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { lockPeriod, unlockPeriod } from "@/app/actions/pdv/periods";

interface Props {
  year: number;
  month: number;
  isLocked: boolean;
}

export default function PeriodActions({ year, month, isLocked }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleLock() {
    if (!confirm(`Zaključati period ${month}/${year}? Stavke se nakon toga ne mogu mijenjati.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await lockPeriod(year, month);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function handleUnlock() {
    setError(null);
    startTransition(async () => {
      const res = await unlockPeriod(year, month);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}
      {isLocked ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleUnlock}
          disabled={isPending}
        >
          Otključaj period
        </Button>
      ) : (
        <Button size="sm" onClick={handleLock} disabled={isPending}>
          Zaključaj period
        </Button>
      )}
    </div>
  );
}
