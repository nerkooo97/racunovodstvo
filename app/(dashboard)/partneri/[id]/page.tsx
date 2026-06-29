"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updatePartner } from "@/app/actions/invoices";
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

export default function EditPartnerPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [name,         setName]         = useState("");
  const [taxId,        setTaxId]        = useState("");
  const [vatNumber,    setVatNumber]    = useState("");
  const [address,      setAddress]      = useState("");
  const [city,         setCity]         = useState("");
  const [email,        setEmail]        = useState("");
  const [phone,        setPhone]        = useState("");
  const [bankAccount,  setBankAccount]  = useState("");
  const [type,         setType]         = useState("both");
  const [keywords,     setKeywords]     = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("partners")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) {
          setName(data.name ?? "");
          setTaxId(data.tax_id ?? "");
          setVatNumber(data.vat_number ?? "");
          setAddress(data.address ?? "");
          setCity(data.city ?? "");
          setEmail(data.email ?? "");
          setPhone(data.phone ?? "");
          setBankAccount(data.bank_account ?? "");
          setType(data.type ?? "both");
          setKeywords((data.keywords as string[] ?? []).join(", "));
        }
        setLoading(false);
      });
  }, [id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("name",         name);
    fd.set("tax_id",       taxId);
    fd.set("vat_number",   vatNumber);
    fd.set("address",      address);
    fd.set("city",         city);
    fd.set("email",        email);
    fd.set("phone",        phone);
    fd.set("bank_account", bankAccount);
    fd.set("type",         type);
    fd.set("keywords",     keywords);

    startTransition(async () => {
      const result = await updatePartner(id, fd);
      if (result.error) { setError(result.error); return; }
      router.push("/partneri");
    });
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto w-full">
        <p className="text-muted-foreground">Učitavanje...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <PageHeader title="Uredi partnera" description="Ažurirajte podatke o kupcu ili dobavljaču.">
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
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>JIB / Porezni broj</Label>
              <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>PDV broj</Label>
              <Input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
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
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Grad</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
        </FormSection>

        <FormSection title="Kontakt i banka">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Telefon</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="col-span-2 grid gap-2">
              <Label>Bankovni račun</Label>
              <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
            </div>
          </div>
        </FormSection>

        <FormSection title="Napredno">
          <div className="grid gap-2">
            <Label>Ključne riječi (za auto-match izvoda)</Label>
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="npr. telekom, t-mobile, razdvoji zarezom"
            />
            <span className="text-xs text-muted-foreground">
              JIB partnera se automatski dodaje ako je upisan. Razdvoji zarezom.
            </span>
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
