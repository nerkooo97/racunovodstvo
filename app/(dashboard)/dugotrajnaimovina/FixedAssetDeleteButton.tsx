"use client";

import { useTransition } from "react";
import { deleteFixedAsset } from "@/app/actions/fixed-assets";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FixedAssetDeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-destructive"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Obrisati ovo sredstvo i sve obračune amortizacije?")) return;
        startTransition(() => { void deleteFixedAsset(id); });
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
