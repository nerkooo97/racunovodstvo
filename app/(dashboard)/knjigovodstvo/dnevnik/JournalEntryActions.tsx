"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteJournalEntry } from "@/app/actions/accounting/journal";

export default function JournalEntryActions({
  id,
  canDelete,
}: {
  id: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!canDelete) return null;

  function handleDelete() {
    if (!confirm("Obrisati ovaj nalog za knjiženje?")) return;
    startTransition(async () => {
      const res = await deleteJournalEntry(id);
      if (res.error) alert(res.error);
      else router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
    >
      Obriši
    </button>
  );
}
