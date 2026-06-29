import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PageHeader from "@/components/shared/page-header";
import FormSection from "@/components/shared/form-section";
import { formatKM, formatDate } from "@/lib/utils";
import { hasFeature } from "@/lib/organization/regime";
import PostBankToGlButton from "./PostBankToGlButton";
import { ArrowLeft } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  unmatched: { label: "Nije spareno", variant: "outline" },
  review:    { label: "Na pregledu",  variant: "secondary" },
  confirmed: { label: "Potvrđeno",    variant: "default" },
};

export default async function BankovniIzvodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, type")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!org) redirect("/nova-djelatnost");

  const canPostToGl = hasFeature(org.type, "general_ledger");

  const { data: stmt } = await supabase
    .from("bank_statements")
    .select("*")
    .eq("id", id)
    .eq("organization_id", org.id)
    .single();

  if (!stmt) notFound();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, transaction_date, amount, direction, counterparty_name, description, reference_number, status, match_score, partner:partner_id(name)")
    .eq("statement_id", id)
    .order("transaction_date", { ascending: true });

  const totalCredit = (transactions ?? [])
    .filter((t) => t.direction === "credit")
    .reduce((s, t) => s + t.amount, 0);
  const totalDebit = (transactions ?? [])
    .filter((t) => t.direction === "debit")
    .reduce((s, t) => s + t.amount, 0);
  const unmatched = (transactions ?? []).filter((t) => t.status === "unmatched").length;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <PageHeader
        title={`${stmt.bank} — ${formatDate(stmt.period_from)} – ${formatDate(stmt.period_to)}`}
        description={stmt.account_number ?? "Pregled transakcija bankovnog izvoda."}
      >
        <div className="flex items-center gap-2">
          {canPostToGl && <PostBankToGlButton statementId={id} />}
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/bankovni-izvod">
              <ArrowLeft className="h-4 w-4" />
              Nazad na izvode
            </Link>
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-8">
      <FormSection title="Sažetak">
      <div className="grid grid-cols-4 gap-4">
        <div className="border rounded-md p-3">
          <p className="text-xs text-muted-foreground">Početno stanje</p>
          <p className="font-bold">{formatKM(stmt.opening_balance)}</p>
        </div>
        <div className="border rounded-md p-3">
          <p className="text-xs text-muted-foreground">Ukupno uplate</p>
          <p className="font-bold text-green-700">{formatKM(totalCredit)}</p>
        </div>
        <div className="border rounded-md p-3">
          <p className="text-xs text-muted-foreground">Ukupno isplate</p>
          <p className="font-bold text-red-600">{formatKM(totalDebit)}</p>
        </div>
        <div className="border rounded-md p-3">
          <p className="text-xs text-muted-foreground">Završno stanje</p>
          <p className="font-bold">{formatKM(stmt.closing_balance)}</p>
        </div>
      </div>
      {unmatched > 0 && (
        <p className="text-sm text-amber-600">
          {unmatched} {unmatched === 1 ? "transakcija nije sparena" : "transakcija nije spareno"} s partnerom.
        </p>
      )}
      </FormSection>

      <FormSection title="Transakcije">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Datum</TableHead>
            <TableHead>Partner / Opis</TableHead>
            <TableHead>Referenca</TableHead>
            <TableHead className="text-right">Iznos</TableHead>
            <TableHead>Vrsta</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(transactions ?? []).map((tx) => {
            const st = STATUS_MAP[tx.status] ?? STATUS_MAP.unmatched;
            const partner = Array.isArray(tx.partner) ? tx.partner[0] : tx.partner;
            return (
              <TableRow key={tx.id}>
                <TableCell>{formatDate(tx.transaction_date)}</TableCell>
                <TableCell>
                  <div className="font-medium">{partner?.name ?? tx.counterparty_name ?? "—"}</div>
                  {tx.description && (
                    <div className="text-xs text-muted-foreground truncate max-w-xs">{tx.description}</div>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{tx.reference_number ?? "—"}</TableCell>
                <TableCell className={`text-right font-mono text-sm font-medium ${tx.direction === "credit" ? "text-green-700" : "text-red-600"}`}>
                  {tx.direction === "credit" ? "+" : "-"}{formatKM(tx.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant={tx.direction === "credit" ? "default" : "outline"}>
                    {tx.direction === "credit" ? "Uplata" : "Isplata"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </TableCell>
                <TableCell>
                  {tx.status !== "confirmed" && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/bankovni-izvod/transakcija/${tx.id}`}>Uredi</Link>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </FormSection>
      </div>
    </div>
  );
}
