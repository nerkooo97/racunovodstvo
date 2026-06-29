"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateInvoiceStatus } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";

type InvoiceStatus = "draft" | "open" | "paid" | "cancelled" | "overdue";

const TRANSITIONS: Record<InvoiceStatus, { label: string; next: InvoiceStatus; variant: "default" | "outline" | "destructive" }[]> = {
  draft:     [{ label: "Izdaj",    next: "open",      variant: "default" },
              { label: "Otkaži",   next: "cancelled", variant: "destructive" }],
  open:      [{ label: "Označi plaćenom", next: "paid",      variant: "default" },
              { label: "Otkaži",          next: "cancelled", variant: "destructive" }],
  paid:      [],
  cancelled: [],
  overdue:   [{ label: "Označi plaćenom", next: "paid", variant: "default" }],
};

export default function InvoiceStatusActions({
  invoiceId,
  currentStatus,
}: {
  invoiceId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const actions = TRANSITIONS[currentStatus as InvoiceStatus] ?? [];
  if (actions.length === 0) return null;

  function handleAction(next: InvoiceStatus) {
    startTransition(async () => {
      await updateInvoiceStatus(invoiceId, next);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      {actions.map((a) => (
        <Button
          key={a.next}
          variant={a.variant}
          size="sm"
          disabled={isPending}
          onClick={() => handleAction(a.next)}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}
