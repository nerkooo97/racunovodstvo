"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/page-header";
import FormSection from "@/components/shared/form-section";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NovaKarticaPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [memberName,  setMemberName]  = useState("");
  const [memberCode,  setMemberCode]  = useState("");
  const [clubName,    setClubName]    = useState("");
  const [color,       setColor]       = useState("#1a56db");
  const [validFrom,   setValidFrom]   = useState("");
  const [validUntil,  setValidUntil]  = useState("");
  const [qrData,      setQrData]      = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberName || !memberCode) { setError("Ime i broj su obavezni."); return; }
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Niste prijavljeni."); return; }

      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (!org) { setError("Nema organizacije."); return; }

      const { error: insertErr } = await supabase.from("membership_cards").insert({
        organization_id: org.id,
        member_name:     memberName,
        member_code:     memberCode,
        club_name:       clubName || null,
        color,
        valid_from:      validFrom || null,
        valid_until:     validUntil || null,
        qr_data:         qrData || null,
      });

      if (insertErr) { setError(insertErr.message); return; }
      router.push("/clanske-kartice");
    });
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <PageHeader title="Nova članska kartica" description="Unesite podatke za novu člansku karticu.">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/clanske-kartice">
            <ArrowLeft className="h-4 w-4" />
            Nazad na kartice
          </Link>
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <FormSection title="Podaci člana">
          <div className="grid gap-2">
            <Label>Ime i prezime člana *</Label>
            <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Broj kartice *</Label>
            <Input value={memberCode} onChange={(e) => setMemberCode(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Naziv kluba / organizacije</Label>
            <Input value={clubName} onChange={(e) => setClubName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Vrijedi od</Label>
              <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Vrijedi do</Label>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
          </div>
        </FormSection>

        <FormSection title="Izgled kartice">
          <div className="grid gap-2">
            <Label>Boja kartice</Label>
            <div className="flex items-center gap-3">
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-16 p-1" />
              <span className="text-sm text-muted-foreground">{color}</span>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>QR kod sadržaj</Label>
            <Input value={qrData} onChange={(e) => setQrData(e.target.value)} placeholder="npr. https://... ili ID" />
          </div>
          <div
            className="rounded-xl p-4 text-white"
            style={{ background: color, minHeight: "100px" }}
          >
            <div className="font-bold text-lg">{memberName || "Ime Prezime"}</div>
            <div className="text-sm opacity-80 mt-1">{clubName || "Naziv kluba"}</div>
            <div className="font-mono text-sm mt-4">{memberCode || "0000000"}</div>
            {validUntil && <div className="text-xs opacity-70 mt-1">Do: {validUntil}</div>}
          </div>
        </FormSection>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pb-8">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Čuvanje..." : "Sačuvaj karticu"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/clanske-kartice")}>
            Otkaži
          </Button>
        </div>
      </form>
    </div>
  );
}
