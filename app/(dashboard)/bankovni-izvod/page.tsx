import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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
import { formatKM, formatDate } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  unmatched: { label: "Nije spareno", variant: "outline" },
  review:    { label: "Na pregledu",  variant: "secondary" },
  confirmed: { label: "Potvrđeno",    variant: "default" },
};

export default async function BankovniIzvodPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!org) redirect("/nova-djelatnost");

  const { data: statements } = await supabase
    .from("bank_statements")
    .select("id, bank, account_number, period_from, period_to, opening_balance, closing_balance, imported_at")
    .eq("organization_id", org.id)
    .order("period_from", { ascending: false });

  // Uzmi transakcije za posljednji izvod
  const latestStmt = statements?.[0];

  const { data: transactions } = latestStmt
    ? await supabase
        .from("transactions")
        .select("id, transaction_date, amount, direction, counterparty_name, description, status, match_score, partner:partner_id(name)")
        .eq("statement_id", latestStmt.id)
        .order("transaction_date", { ascending: true })
    : { data: [] };

  return (
    <div>
      <PageHeader title="Bankovni izvodi" description={org.name}>
        <Button asChild>
          <Link href="/bankovni-izvod/uvezi">Uvezi izvod</Link>
        </Button>
      </PageHeader>

      {/* Lista izvoda */}
      {statements && statements.length > 0 ? (
        <div className="mb-6">
          <h2 className="font-semibold mb-2 text-sm">Uvezeni izvodi</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banka</TableHead>
                <TableHead>Račun</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Početno stanje</TableHead>
                <TableHead className="text-right">Završno stanje</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {statements.map((s) => (
                <TableRow key={s.id} className={s.id === latestStmt?.id ? "bg-accent/20" : ""}>
                  <TableCell className="font-medium">{s.bank}</TableCell>
                  <TableCell className="font-mono text-sm">{s.account_number ?? "—"}</TableCell>
                  <TableCell>{formatDate(s.period_from)} – {formatDate(s.period_to)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatKM(s.opening_balance)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatKM(s.closing_balance)}</TableCell>
                  <TableCell>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/bankovni-izvod/${s.id}`}>Transakcije</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-12 text-center mb-6">
          <p className="text-muted-foreground mb-4">Još nema uvezenih bankovnih izvoda.</p>
          <Button asChild>
            <Link href="/bankovni-izvod/uvezi">Uvezi prvi izvod</Link>
          </Button>
        </div>
      )}

      {/* Transakcije posljednjeg izvoda */}
      {latestStmt && transactions && transactions.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2 text-sm">
            Transakcije — {latestStmt.bank} ({formatDate(latestStmt.period_from)} – {formatDate(latestStmt.period_to)})
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Opis / Partner</TableHead>
                <TableHead className="text-right">Iznos</TableHead>
                <TableHead>Smjer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const st = STATUS_MAP[tx.status] ?? STATUS_MAP.unmatched;
                const partner = Array.isArray(tx.partner) ? tx.partner[0] : tx.partner;
                return (
                  <TableRow key={tx.id}>
                    <TableCell>{formatDate(tx.transaction_date)}</TableCell>
                    <TableCell>
                      <div>{partner?.name ?? tx.counterparty_name ?? "—"}</div>
                      {tx.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-xs">{tx.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatKM(tx.amount)}</TableCell>
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
        </div>
      )}
    </div>
  );
}
