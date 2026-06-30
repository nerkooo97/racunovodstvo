"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAccount } from "@/app/actions/accounting/accounts";

const TYPES = [
  { value: "asset", label: "Aktiva" },
  { value: "liability", label: "Pasiva" },
  { value: "equity", label: "Kapital" },
  { value: "income", label: "Prihod" },
  { value: "expense", label: "Rashod" },
  { value: "offbalance", label: "Vanbilansno" },
] as const;

export default function AddAccountForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("asset");

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createAccount({ code, name, account_type: type });
      if (res.error) {
        setError(res.error);
        return;
      }
      setCode("");
      setName("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Novi konto
      </Button>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Šifra</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="npr. 2020" />
        </div>
        <div className="space-y-1.5">
          <Label>Naziv</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Vrsta</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
          Odustani
        </Button>
        <Button size="sm" onClick={submit} disabled={isPending}>
          {isPending ? "Spremam…" : "Dodaj konto"}
        </Button>
      </div>
    </div>
  );
}
