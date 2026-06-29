import PageHeader from "@/components/shared/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireOrgFeature } from "@/lib/organization/server";
import { listAccounts } from "@/app/actions/accounting/accounts";
import AddAccountForm from "./AddAccountForm";

const TYPE_LABEL: Record<string, string> = {
  asset: "Aktiva",
  liability: "Pasiva",
  equity: "Kapital",
  income: "Prihod",
  expense: "Rashod",
  offbalance: "Vanbilansno",
};

export default async function KontniPlanPage() {
  await requireOrgFeature("general_ledger");
  const res = await listAccounts();
  const accounts = res.accounts ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kontni plan"
        description="Standardni kontni okvir (FBiH) — uređiv šablon za dvojno knjigovodstvo"
      />

      {res.error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {res.error}
        </div>
      )}

      <AddAccountForm />

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Šifra</TableHead>
              <TableHead>Naziv konta</TableHead>
              <TableHead className="w-28">Vrsta</TableHead>
              <TableHead className="w-20">Klasa</TableHead>
              <TableHead className="w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((a) => (
              <TableRow key={a.id} className={a.is_synthetic ? "bg-muted/40 font-medium" : ""}>
                <TableCell className="font-mono">{a.code}</TableCell>
                <TableCell>{a.name}</TableCell>
                <TableCell className="text-xs">{TYPE_LABEL[a.account_type]}</TableCell>
                <TableCell className="font-mono text-sm">{a.account_class}</TableCell>
                <TableCell>
                  {a.is_active ? (
                    <Badge variant="outline" className="text-[10px]">Aktivan</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Neaktivan</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nema konta.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
