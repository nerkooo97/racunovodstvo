import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { selectOrgAndRedirect } from "@/app/actions/organizations";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function OrganizationsPage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, type, tax_id, city, plan")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  if (!orgs || orgs.length === 0) redirect("/nova-djelatnost");

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Vaše organizacije</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Odaberite organizaciju s kojom želite raditi
          </p>
        </div>
        <Button asChild>
          <Link href="/organizations/new">+ Nova organizacija</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {orgs.map((org) => (
          <div
            key={org.id}
            className="border rounded-lg p-5 flex items-center justify-between gap-4 hover:bg-accent/20 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                {org.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{org.name}</p>
                <p className="text-sm text-muted-foreground">
                  {org.type === "obrt" ? "Obrt" : "d.o.o."}
                  {org.tax_id ? ` · JIB: ${org.tax_id}` : ""}
                </p>
              </div>
            </div>
            <form action={selectOrgAndRedirect} className="shrink-0">
              <input type="hidden" name="orgId" value={org.id} />
              <Button type="submit" size="sm">
                Otvori
              </Button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
