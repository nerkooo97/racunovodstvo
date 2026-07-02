import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { OrganizationProvider, type OrgData } from "@/contexts/organization-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  const { data: orgs, error: orgsError } = await supabase
    .from("organizations")
    .select("id, name, type, tax_id, logo_url, address, city, canton, plan")
    .eq("owner_id", data.user.id)
    .order("created_at", { ascending: true });

  if (orgsError) {
    console.error("DashboardLayout - greška pri dohvatu organizacija:", orgsError.message);
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("active_org_id")?.value;
  const sidebarState = cookieStore.get("sidebar_state")?.value;

  const rawActive =
    (activeOrgId ? orgs?.find((o) => o.id === activeOrgId) : null) ??
    orgs?.[0] ??
    null;

  const toOrgData = (o: typeof rawActive): OrgData | null =>
    o
      ? {
          id: o.id,
          name: o.name,
          type: o.type as "obrt" | "doo",
          tax_id: o.tax_id ?? null,
          logo_url: o.logo_url ?? null,
          address: o.address ?? null,
          city: o.city ?? null,
          canton: o.canton ?? null,
          plan: o.plan ?? "free",
        }
      : null;

  const activeOrg = toOrgData(rawActive);
  const allOrgs: OrgData[] = (orgs ?? []).map((o) => toOrgData(o)!);

  if (!activeOrg && orgs?.length === 0) {
    redirect("/nova-djelatnost");
  }

  return (
    <OrganizationProvider organization={activeOrg} allOrganizations={allOrgs}>
      <SidebarProvider defaultOpen={sidebarState !== "false"}>
        <AppSidebar userEmail={data.user.email ?? ""} />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col gap-6 p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </OrganizationProvider>
  );
}
