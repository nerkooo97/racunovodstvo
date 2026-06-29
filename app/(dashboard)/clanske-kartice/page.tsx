import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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

export default async function ClanskeKarticePage() {
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

  const { data: cards } = await supabase
    .from("membership_cards")
    .select("id, member_name, member_code, club_name, valid_from, valid_until, color")
    .eq("organization_id", org.id)
    .order("member_name", { ascending: true });

  return (
    <div>
      <PageHeader title="Članske kartice" description={org.name}>
        <Button asChild>
          <Link href="/clanske-kartice/nova">Nova kartica</Link>
        </Button>
      </PageHeader>

      {cards && cards.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ime i prezime</TableHead>
              <TableHead>Broj</TableHead>
              <TableHead>Klub / organizacija</TableHead>
              <TableHead>Vrijedi od</TableHead>
              <TableHead>Vrijedi do</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.member_name}</TableCell>
                <TableCell className="font-mono text-sm">{c.member_code}</TableCell>
                <TableCell>{c.club_name ?? "—"}</TableCell>
                <TableCell>{formatDate(c.valid_from)}</TableCell>
                <TableCell>{formatDate(c.valid_until)}</TableCell>
                <TableCell>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/clanske-kartice/${c.id}`}>Uredi</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground mb-4">Još nema kreiranih članaskih kartica.</p>
          <Button asChild>
            <Link href="/clanske-kartice/nova">Kreiraj prvu karticu</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
