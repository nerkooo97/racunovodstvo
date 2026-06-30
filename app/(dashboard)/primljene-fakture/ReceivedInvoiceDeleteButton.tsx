"use client";

import { useTransition } from "react";
import { deleteReceivedInvoice } from "@/app/actions/received-invoices";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReceivedInvoiceDeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-destructive"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Obrisati ovu fakturu?")) return;
        startTransition(() => { void deleteReceivedInvoice(id); });
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
