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
  console.log("DashboardLayout - Učitavanje...");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  
  console.log("DashboardLayout - getUser rezultat:", { user: data?.user?.id, error });
  
  if (error || !data.user) {
    console.log("DashboardLayout - Nema korisnika, redirect na /login");
    redirect("/login");
  }

  const { data: orgs, error: orgsError } = await supabase
    .from("organizations")
    .select("id, name, type, tax_id, logo_url, city, canton, plan")
    .eq("owner_id", data.user.id)
    .order("created_at", { ascending: true });

  console.log("DashboardLayout - Dobavljene organizacije iz baze:", { 
    count: orgs?.length, 
    orgs, 
    orgsError 
  });

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("active_org_id")?.value;
  const sidebarState = cookieStore.get("sidebar_state")?.value;

  console.log("DashboardLayout - Cookie active_org_id:", activeOrgId);

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
          city: o.city ?? null,
          canton: o.canton ?? null,
          plan: o.plan ?? "free",
        }
      : null;

  const activeOrg = toOrgData(rawActive);
  const allOrgs: OrgData[] = (orgs ?? []).map((o) => toOrgData(o)!);

  console.log("DashboardLayout - Odabrana aktivna organizacija:", activeOrg);

  if (!activeOrg && orgs?.length === 0) {
    console.log("DashboardLayout - Nema organizacija, redirect na /nova-djelatnost");
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
