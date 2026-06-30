import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/page-header";
import FixedAssetForm from "@/components/forms/fixed-asset-form";
import { ArrowLeft } from "lucide-react";
import { requireOrgFeature } from "@/lib/organization/server";

export default async function DugotrajnaImovinaNovaPage() {
  await requireOrgFeature("fixed_assets");

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      <PageHeader
        title="Novo sredstvo — PLDI-1043"
        description="Dodavanje dugotrajne imovine u evidenciju"
      >
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/dugotrajnaimovina">
            <ArrowLeft className="h-4 w-4" />
            Nazad
          </Link>
        </Button>
      </PageHeader>

      <FixedAssetForm />
    </div>
  );
}
