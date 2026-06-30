"use client";

import { useState, useTransition } from "react";
import { postDepreciationToGl } from "@/app/actions/fixed-assets";
import { Button } from "@/components/ui/button";

export default function DepreciationPostButton({ year }: { year: number }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function handleClick() {
    setMsg(null);
    startTransition(async () => {
      const res = await postDepreciationToGl(year);
      if (res.error) setMsg({ type: "err", text: res.error });
      else if (res.skipped) setMsg({ type: "ok", text: `Amortizacija za ${year}. je već proknjižena.` });
      else setMsg({ type: "ok", text: `Proknjižena amortizacija za ${res.posted} sredstava (D 5400 / P 0290).` });
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        {isPending ? "Knjiženje..." : `Proknjiži amortizaciju ${year}.`}
      </Button>
      {msg && (
        <span className={`text-xs ${msg.type === "ok" ? "text-emerald-700" : "text-destructive"}`}>
          {msg.text}
        </span>
      )}
    </div>
  );
}
