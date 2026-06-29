"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPartner } from "@/app/actions/invoices";
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
import PageHeader from "@/components/shared/page-header";
import FormSection from "@/components/shared/form-section";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NoviPartnerPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("both");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("type", type);
    startTransition(async () => {
      const result = await createPartner(formData);
      if (result.error) { setError(result.error); return; }
      router.push("/partneri");
    });
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <PageHeader title="Novi partner" description="Unesite podatke o kupcu ili dobavljaču.">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/partneri">
            <ArrowLeft className="h-4 w-4" />
            Nazad na partnere
          </Link>
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <FormSection title="Osnovni podaci">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 grid gap-2">
              <Label>Naziv *</Label>
              <Input name="name" required />
            </div>
            <div className="grid gap-2">
              <Label>JIB / Porezni broj</Label>
              <Input name="tax_id" />
            </div>
            <div className="grid gap-2">
              <Label>PDV broj</Label>
              <Input name="vat_number" />
            </div>
            <div className="grid gap-2">
              <Label>Vrsta</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Kupac</SelectItem>
                  <SelectItem value="supplier">Dobavljač</SelectItem>
                  <SelectItem value="both">Kupac i dobavljač</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </FormSection>

        <FormSection title="Adresa">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 grid gap-2">
              <Label>Adresa</Label>
              <Input name="address" />
            </div>
            <div className="grid gap-2">
              <Label>Grad</Label>
              <Input name="city" />
            </div>
          </div>
        </FormSection>

        <FormSection title="Kontakt i banka">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input name="email" type="email" />
            </div>
            <div className="grid gap-2">
              <Label>Telefon</Label>
              <Input name="phone" />
            </div>
            <div className="col-span-2 grid gap-2">
              <Label>Bankovni račun</Label>
              <Input name="bank_account" />
            </div>
          </div>
        </FormSection>

        <FormSection title="Napredno">
          <div className="grid gap-2">
            <Label>Ključne riječi (za auto-match izvoda)</Label>
            <Input name="keywords" placeholder="npr. telekom, t-mobile, razdvoji zarezom" />
            <span className="text-xs text-muted-foreground">
              JIB partnera se automatski dodaje ako je upisan. Razdvoji zarezom.
            </span>
          </div>
          <div className="grid gap-2">
            <Label>Napomena</Label>
            <Input name="note" placeholder="Opcionalna napomena" />
          </div>
        </FormSection>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pb-8">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Čuvanje..." : "Sačuvaj partnera"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/partneri")}>
            Otkaži
          </Button>
        </div>
      </form>
    </div>
  );
}
