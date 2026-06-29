"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { postBankStatementToGl } from "@/app/actions/accounting/posting";

export default function PostBankToGlButton({
  statementId,
}: {
  statementId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const res = await postBankStatementToGl(statementId);
      if (res.error) {
        setMessage(res.error);
        return;
      }
      setMessage(
        `Proknjiženo ${res.posted ?? 0}, preskočeno ${res.skipped ?? 0}.`
      );
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {message && (
        <span className="text-xs text-muted-foreground">{message}</span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? "Knjižim…" : "Proknjiži u GK"}
      </Button>
    </div>
  );
}
