import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/page-header";
import KprEntryForm from "@/components/forms/kpr-entry-form";
import { ArrowLeft } from "lucide-react";
import { requireOrgFeature } from "@/lib/organization/server";
import { getActiveYear } from "@/lib/year";

export default async function KprNoviPage() {
  const year = await getActiveYear();
  const { supabase, org } = await requireOrgFeature("kpr");

  const { data: partners } = await supabase
    .from("partners")
    .select("id, name, tax_id")
    .eq("organization_id", org.id)
    .order("name", { ascending: true });

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <PageHeader
        title="KPR-1041 — Ručni unos"
        description={`Unos stavke za ${year}. godinu`}
      >
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/kpr">
            <ArrowLeft className="h-4 w-4" />
            Nazad na KPR
          </Link>
        </Button>
      </PageHeader>

      <KprEntryForm year={year} partners={partners ?? []} />
    </div>
  );
}
