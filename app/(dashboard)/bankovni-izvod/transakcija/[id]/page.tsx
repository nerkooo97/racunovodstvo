"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { matchTransaction, confirmTransaction } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatKM, formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

interface Partner { id: string; name: string }
interface Tx {
  id: string;
  transaction_date: string;
  amount: number;
  direction: string;
  counterparty_name: string | null;
  description: string | null;
  reference_number: string | null;
  status: string;
  partner_id: string | null;
  statement_id: string;
}

export default function TransakcijaPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState<Tx | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState("__none__");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: txData } = await supabase
        .from("transactions").select("*").eq("id", id).single();

      if (txData) {
        setTx(txData as Tx);
        setSelectedPartner((txData as Tx).partner_id ?? "__none__");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: org } = await supabase
          .from("organizations").select("id").eq("owner_id", user.id)
          .order("created_at").limit(1).single();
        if (org) {
          const { data: partnerData } = await supabase
            .from("partners").select("id, name").eq("organization_id", org.id).order("name");
          setPartners((partnerData as Partner[] | null) ?? []);
        }
      }

      setLoading(false);
    }

    load();
  }, [id]);

  function handleMatch() {
    if (selectedPartner === "__none__") return;
    setError(null);
    startTransition(async () => {
      const result = await matchTransaction(id, selectedPartner);
      if (result.error) { setError(result.error); return; }
      setTx((prev) => prev ? { ...prev, partner_id: selectedPartner, status: "review" } : prev);
    });
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await confirmTransaction(id);
      if (result.error) { setError(result.error); return; }
      router.push(tx?.statement_id ? `/bankovni-izvod/${tx.statement_id}` : "/bankovni-izvod");
    });
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto w-full">
        <p className="text-muted-foreground">Učitavanje...</p>
      </div>
    );
  }
  if (!tx) {
    return (
      <div className="max-w-4xl mx-auto w-full">
        <p className="text-destructive">Transakcija nije pronađena.</p>
      </div>
    );
  }

  const STATUS_LABELS: Record<string, string> = {
    unmatched: "Nije spareno",
    review:    "Na pregledu",
    confirmed: "Potvrđeno",
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <PageHeader
        title="Uredi transakciju"
        description="Sparivanje transakcije s partnerom i potvrda."
      >
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/bankovni-izvod/${tx.statement_id}`}>
            <ArrowLeft className="h-4 w-4" />
            Nazad na izvod
          </Link>
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-8">
      <FormSection title="Detalji transakcije">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Datum</span>
          <span>{formatDate(tx.transaction_date)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Iznos</span>
          <span className={`font-mono font-bold ${tx.direction === "credit" ? "text-green-700" : "text-red-600"}`}>
            {tx.direction === "credit" ? "+" : "-"}{formatKM(tx.amount)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Vrsta</span>
          <Badge variant={tx.direction === "credit" ? "default" : "outline"}>
            {tx.direction === "credit" ? "Uplata" : "Isplata"}
          </Badge>
        </div>
        {tx.counterparty_name && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Naziv</span>
            <span>{tx.counterparty_name}</span>
          </div>
        )}
        {tx.description && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Opis</span>
            <span className="text-right max-w-xs">{tx.description}</span>
          </div>
        )}
        {tx.reference_number && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Referenca</span>
            <span className="font-mono">{tx.reference_number}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status</span>
          <span>{STATUS_LABELS[tx.status] ?? tx.status}</span>
        </div>
      </div>
      </FormSection>

      <FormSection title="Sparivanje s partnerom">
        <div className="flex flex-col gap-1">
          <Label>Poveži s partnerom</Label>
          <Select value={selectedPartner} onValueChange={setSelectedPartner}>
            <SelectTrigger>
              <SelectValue placeholder="Odaberi partnera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Bez partnera —</SelectItem>
              {partners.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleMatch}
            disabled={isPending || selectedPartner === "__none__"}
          >
            Spoji s partnerom
          </Button>

          {tx.status !== "unmatched" && (
            <Button
              onClick={handleConfirm}
              disabled={isPending}
            >
              Potvrdi transakciju
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </FormSection>
      </div>
    </div>
  );
}
