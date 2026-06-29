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
import { formatDate, formatKM } from "@/lib/utils";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import {
  EMPLOYEE_ROLES,
  INSURANCE_STATUS_LABELS,
  EMPLOYMENT_STATUS_LABELS,
} from "@/lib/constants/employee-codes";
import { UserPlus, Users, Pencil } from "lucide-react";

const PAGE_SIZE = 20;

export default async function RadniciPage({
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
    .from("employees")
    .select(
      "id, first_name, last_name, jmbg, job_title, employee_role, hire_date, insurance_registration_date, insurance_deregistration_date, insurance_status, gross_salary, net_salary, salary_type, status",
      { count: "exact" }
    )
    .eq("organization_id", org.id)
    .order("last_name", { ascending: true });

  if (q) {
    query = query.or(
      `last_name.ilike.%${q}%,first_name.ilike.%${q}%,jmbg.ilike.%${q}%,job_title.ilike.%${q}%`
    );
  }

  const { data: employees, count } = await query
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  return (
    <div className="space-y-6">
      <PageHeader title="Radnici" description={org.name}>
        <Button asChild size="sm" className="gap-2">
          <Link href="/radnici/novi">
            <UserPlus className="h-4 w-4" />
            Dodaj radnika
          </Link>
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3">
        <form method="get" className="relative flex-1 max-w-sm">
          <Input
            name="q"
            defaultValue={q}
            placeholder="Pretraži po imenu, JMBG, radnom mjestu…"
            className="pl-3 text-sm h-9"
          />
        </form>
        {count !== null && count !== undefined && (
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            {count} radnik{count === 1 ? "" : count < 5 ? "a" : "a"}
          </p>
        )}
      </div>

      {employees && employees.length > 0 ? (
        <>
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-xs">Prezime i ime</TableHead>
                  <TableHead className="font-semibold text-xs hidden md:table-cell">Uloga</TableHead>
                  <TableHead className="font-semibold text-xs hidden lg:table-cell">Datum prijave</TableHead>
                  <TableHead className="font-semibold text-xs hidden xl:table-cell">Datum odjave</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Plata</TableHead>
                  <TableHead className="font-semibold text-xs">PIO status</TableHead>
                  <TableHead className="font-semibold text-xs hidden sm:table-cell">Status</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => {
                  const salary = emp.salary_type === "gross_base" ? emp.gross_salary : emp.net_salary ?? emp.gross_salary;
                  const salaryLabel = emp.salary_type === "gross_base" ? "bruto" : "neto";
                  const roleLabel = EMPLOYEE_ROLES.find((r) => r.value === emp.employee_role)?.label ?? "Radnik";
                  const pioStatus = INSURANCE_STATUS_LABELS[emp.insurance_status ?? "draft"] ?? INSURANCE_STATUS_LABELS.draft;
                  const empStatus = EMPLOYMENT_STATUS_LABELS[emp.status ?? "draft"] ?? EMPLOYMENT_STATUS_LABELS.draft;

                  return (
                    <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-sm">
                        <div>{emp.last_name} {emp.first_name}</div>
                        <div className="text-xs text-muted-foreground font-mono md:hidden">{emp.jmbg ?? "—"}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {roleLabel}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {emp.insurance_registration_date ? formatDate(emp.insurance_registration_date) : "—"}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                        {emp.insurance_deregistration_date ? formatDate(emp.insurance_deregistration_date) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {salary ? (
                          <span>
                            {formatKM(salary)}
                            <span className="text-xs text-muted-foreground ml-1">({salaryLabel})</span>
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={pioStatus.variant} className="text-xs">
                          {pioStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={empStatus.variant} className="text-xs">
                          {empStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                          <Link href={`/radnici/${emp.id}`}>
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
          icon={Users}
          title="Nema radnika"
          description={q ? `Nema rezultata za "${q}".` : "Dodajte prvog radnika u vašu organizaciju."}
          action={q ? undefined : { label: "Dodaj radnika", href: "/radnici/novi" }}
        />
      )}
    </div>
  );
}
