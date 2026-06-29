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
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import { Users2, UserPlus2, Pencil, Phone, Mail } from "lucide-react";

const TYPE_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  customer: { label: "Kupac",           variant: "default" },
  supplier: { label: "Dobavljač",       variant: "secondary" },
  both:     { label: "Kupac/Dobavljač", variant: "outline" },
};

const PAGE_SIZE = 25;

export default async function PartneriPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageParam, q } = await searchParams;
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
    .from("partners")
    .select("id, name, tax_id, city, type, email, phone", { count: "exact" })
    .eq("organization_id", org.id)
    .order("name", { ascending: true });

  if (q) {
    query = query.or(`name.ilike.%${q}%,tax_id.ilike.%${q}%,city.ilike.%${q}%`);
  }

  const { data: partners, count } = await query
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  return (
    <div className="space-y-6">
      <PageHeader title="Partneri" description={org.name}>
        <Button asChild size="sm" className="gap-2">
          <Link href="/partneri/novi">
            <UserPlus2 className="h-4 w-4" />
            Novi partner
          </Link>
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3">
        <form method="get" className="relative flex-1 max-w-sm">
          <Input
            name="q"
            defaultValue={q}
            placeholder="Pretraži po nazivu, JIB-u, gradu…"
            className="text-sm h-9"
          />
        </form>
        {count !== null && count !== undefined && (
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            {count} partnera
          </p>
        )}
      </div>

      {partners && partners.length > 0 ? (
        <>
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-xs">Naziv</TableHead>
                  <TableHead className="font-semibold text-xs hidden sm:table-cell">JIB / PDV</TableHead>
                  <TableHead className="font-semibold text-xs hidden md:table-cell">Grad</TableHead>
                  <TableHead className="font-semibold text-xs">Vrsta</TableHead>
                  <TableHead className="font-semibold text-xs hidden lg:table-cell">Kontakt</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((p) => {
                  const t = TYPE_MAP[p.type] ?? TYPE_MAP.both;
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-sm">{p.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground font-mono">
                        {p.tax_id ?? "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {p.city ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.variant} className="text-xs">{t.label}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {p.email ? (
                          <a href={`mailto:${p.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <Mail className="h-3 w-3" />
                            {p.email}
                          </a>
                        ) : p.phone ? (
                          <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <Phone className="h-3 w-3" />
                            {p.phone}
                          </a>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                          <Link href={`/partneri/${p.id}`}>
                            <Pencil className="h-3.5 w-3.5" />
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
          icon={Users2}
          title="Nema partnera"
          description={q ? `Nema rezultata za "${q}".` : "Dodajte kupce i dobavljače koji posluju s vašom organizacijom."}
          action={q ? undefined : { label: "Novi partner", href: "/partneri/novi" }}
        />
      )}
    </div>
  );
}
