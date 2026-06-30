"use client";

import { useTransition } from "react";
import { deleteKpEntry } from "@/app/actions/kp";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function KpDeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-destructive"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Obrisati ovaj unos?")) return;
        startTransition(() => { void deleteKpEntry(id); });
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
