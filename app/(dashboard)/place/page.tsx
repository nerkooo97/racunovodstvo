import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";
import { getActiveYear } from "@/lib/year";
import Link from "next/link";
import { redirect } from "next/navigation";
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
import { formatDate } from "@/lib/utils";

const MONTH_NAMES = [
  "", "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  calculated: { label: "Obračunato", variant: "secondary" },
  paid:        { label: "Isplaćeno",  variant: "default" },
  cancelled:   { label: "Otkazano",   variant: "outline" },
};

const CURRENT_MONTH = new Date().getMonth() + 1;

export default async function PlacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeYear = await getActiveYear();

  const activeOrgId = await getActiveOrgId(supabase, user.id);
  const { data: org } = activeOrgId
    ? await supabase.from("organizations").select("id, name").eq("id", activeOrgId).single()
    : { data: null };

  if (!org) redirect("/nova-djelatnost");

  const { data: periods } = await supabase
    .from("salary_periods")
    .select("id, year, month, payment_date, status")
    .eq("organization_id", org.id)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  return (
    <div>
      <PageHeader title="Obračun plata" description={org.name}>
        <Button asChild>
          <Link href={`/place/${activeYear}/${CURRENT_MONTH}`}>
            Novi obračun
          </Link>
        </Button>
      </PageHeader>

      {periods && periods.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Datum isplate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((p) => {
              const st = STATUS_MAP[p.status] ?? STATUS_MAP.calculated;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {MONTH_NAMES[p.month]} {p.year}
                  </TableCell>
                  <TableCell>{formatDate(p.payment_date)}</TableCell>
                  <TableCell>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/place/${p.year}/${p.month}`}>Otvori</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground mb-4">Još nema obračuna plata.</p>
          <Button asChild>
            <Link href={`/place/${activeYear}/${CURRENT_MONTH}`}>
              Kreiraj obračun za ovaj mjesec
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
