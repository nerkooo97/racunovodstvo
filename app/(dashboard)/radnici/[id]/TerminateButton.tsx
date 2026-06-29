"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { terminateEmployee } from "@/app/actions/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TerminateButton({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleTerminate() {
    setError(null);
    startTransition(async () => {
      const result = await terminateEmployee(employeeId, date);
      if (result.error) { setError(result.error); return; }
      router.push("/radnici");
    });
  }

  if (!showForm) {
    return (
      <Button variant="destructive" size="sm" onClick={() => setShowForm(true)}>
        Prekini radni odnos
      </Button>
    );
  }

  return (
    <div className="flex items-end gap-3">
      <div className="flex flex-col gap-1">
        <Label>Datum prestanka</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-40"
        />
      </div>
      <Button variant="destructive" size="sm" onClick={handleTerminate} disabled={isPending}>
        {isPending ? "Čuvanje..." : "Potvrdi prekid"}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
        Otkaži
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
