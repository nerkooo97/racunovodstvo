import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import PageHeader from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatKM, formatDate } from "@/lib/utils";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  confirmed:  { label: "Potvrđena",  variant: "default" },
  review:     { label: "Na pregledu", variant: "secondary" },
  unmatched:  { label: "Nesparena",  variant: "outline" },
};

export default async function TransakcijePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = await getActiveOrgId(supabase, user.id);
  if (!orgId) redirect("/nova-djelatnost");

  const { data: transactions } = await supabase
    .from("transactions")
    .select(`
      id, transaction_date, description, credit_amount, debit_amount,
      counterparty_name, status, match_score,
      partner:partner_id (name),
      statement:statement_id (id)
    `)
    .eq("organization_id", orgId)
    .order("transaction_date", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader title="Transakcije" description="Sve finansijske transakcije" />

      {transactions && transactions.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Opis / Kontrastrana</TableHead>
                <TableHead className="text-right">Uplata</TableHead>
                <TableHead className="text-right">Isplata</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const partner = Array.isArray(tx.partner) ? tx.partner[0] : tx.partner;
                const st = STATUS_LABELS[tx.status] ?? STATUS_LABELS.unmatched;
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">{formatDate(tx.transaction_date)}</TableCell>
                    <TableCell className="text-sm max-w-56 truncate">
                      {tx.description || tx.counterparty_name || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-green-700">
                      {tx.credit_amount ? formatKM(tx.credit_amount) : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-700">
                      {tx.debit_amount ? formatKM(tx.debit_amount) : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {partner?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {tx.status !== "confirmed" && (
                        <Link
                          href={`/bankovni-izvodi/transakcija/${tx.id}`}
                          className="text-xs text-primary underline"
                        >
                          Obradi
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm mt-6">
          Nema transakcija. Uvezite bankovni izvod da biste dodali transakcije.
        </p>
      )}
    </div>
  );
}
