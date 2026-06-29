import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/shared/page-header";
import ProfileForm from "./ProfileForm";

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const { org: orgId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const query = supabase
    .from("organizations")
    .select("*")
    .eq("owner_id", user.id);

  const { data: org } = orgId
    ? await query.eq("id", orgId).single()
    : await query.order("created_at", { ascending: true }).limit(1).single();

  if (!org) redirect("/nova-djelatnost");

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <PageHeader
        title="Profil organizacije"
        description="Ažurirajte osnovne podatke o djelatnosti."
      />
      <ProfileForm org={org} />
    </div>
  );
}
