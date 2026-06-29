import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import PageHeader from "@/components/shared/page-header";
import EmptyState from "@/components/shared/empty-state";
import DataPagination from "@/components/shared/data-pagination";
import { formatKM, formatDate } from "@/lib/utils";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import { FileText, Plus, ExternalLink } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft:     { label: "Nacrt",     variant: "outline" },
  open:      { label: "Izdana",    variant: "secondary" },
  paid:      { label: "Plaćena",   variant: "default" },
  cancelled: { label: "Otkazana",  variant: "destructive" },
  overdue:   { label: "Dospijela", variant: "destructive" },
};

const TYPE_MAP: Record<string, string> = {
  invoice:     "Faktura",
  proforma:    "Predračun",
  credit_note: "Kreditna nota",
  advance:     "Avansna",
};

const PAGE_SIZE = 25;

export default async function FakturePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const { page: pageParam, q, status } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = await getActiveOrgId(supabase, user.id);
  if (!orgId) redirect("/nova-djelatnost");

  const { data: org } = await supabase
    .from("organizations").select("id, name").eq("id", orgId).single();
  if (!org) redirect("/nova-djelatnost");

  let query = supabase
    .from("invoices")
    .select(
      "id, invoice_number, type, status, issue_date, due_date, total, partner:partner_id(name)",
      { count: "exact" }
    )
    .eq("organization_id", org.id)
    .order("issue_date", { ascending: false })
    .order("sequence_number", { ascending: false });

  if (q) query = query.ilike("invoice_number", `%${q}%`);
  if (status) query = query.eq("status", status);

  const { data: invoices, count } = await query
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const STATUSES = ["draft", "open", "paid", "overdue", "cancelled"];

  return (
    <div className="space-y-6">
      <PageHeader title="Fakture" description={org.name}>
        <Button asChild size="sm" className="gap-2">
          <Link href="/fakture/nova">
            <Plus className="h-4 w-4" />
            Nova faktura
          </Link>
        </Button>
      </PageHeader>

      {/* Filteri */}
      <div className="flex flex-wrap items-center gap-3">
        <form method="get" className="relative flex-1 max-w-xs">
          <input type="hidden" name="status" value={status ?? ""} />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Pretraži po broju fakture…"
            className="text-sm h-9"
          />
        </form>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Link href="/fakture" className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!status ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-muted border-transparent"}`}>
            Sve
          </Link>
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={`/fakture?status=${s}`}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${status === s ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-muted border-transparent"}`}
            >
              {STATUS_MAP[s]?.label ?? s}
            </Link>
          ))}
        </div>

        {count !== null && count !== undefined && (
          <p className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
            {count} faktura
          </p>
        )}
      </div>

      {invoices && invoices.length > 0 ? (
        <>
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-xs">Broj</TableHead>
                  <TableHead className="font-semibold text-xs hidden sm:table-cell">Vrsta</TableHead>
                  <TableHead className="font-semibold text-xs">Partner</TableHead>
                  <TableHead className="font-semibold text-xs hidden md:table-cell">Datum</TableHead>
                  <TableHead className="font-semibold text-xs hidden lg:table-cell">Dospijeva</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Iznos</TableHead>
                  <TableHead className="font-semibold text-xs">Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const st = STATUS_MAP[inv.status] ?? STATUS_MAP.draft;
                  const partner = Array.isArray(inv.partner) ? inv.partner[0] : inv.partner;
                  return (
                    <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-sm font-medium">{inv.invoice_number}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {TYPE_MAP[inv.type] ?? inv.type}
                      </TableCell>
                      <TableCell className="text-sm">{partner?.name ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatDate(inv.issue_date)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(inv.due_date)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {formatKM(inv.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                          <Link href={`/fakture/${inv.id}`}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <DataPagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
        </>
      ) : (
        <EmptyState
          icon={FileText}
          title="Nema faktura"
          description={q || status ? "Nema rezultata za odabrane filtere." : "Kreirajte prvu fakturu za vašu organizaciju."}
          action={(q || status) ? undefined : { label: "Nova faktura", href: "/fakture/nova" }}
        />
      )}
    </div>
  );
}
