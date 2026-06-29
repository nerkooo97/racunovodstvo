import PageHeader from "@/components/shared/page-header";
import EmployeeForm from "@/components/forms/employee-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/supabase/get-active-org";

export default async function NoviRadnikPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = await getActiveOrgId(supabase, user.id);
  if (!orgId) redirect("/nova-djelatnost");

  const { data: org } = await supabase
    .from("organizations")
    .select("default_meal_allowance_per_day")
    .eq("id", orgId)
    .single();

  const defaultMeal = org?.default_meal_allowance_per_day ?? 16;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <PageHeader
        title="Novi radnik"
        description="Unesite matične i ugovorne podatke za novog zaposlenika."
      >
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/radnici">
            <ArrowLeft className="h-4 w-4" />
            Nazad na listu
          </Link>
        </Button>
      </PageHeader>
      <EmployeeForm defaultMealAllowance={Number(defaultMeal)} />
    </div>
  );
}
