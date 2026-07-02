import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/page-header";
import KpEntryForm from "@/components/forms/kp-entry-form";
import { ArrowLeft } from "lucide-react";
import { requireOrgFeature } from "@/lib/organization/server";
import { getActiveYear } from "@/lib/year";

export default async function KpNoviPage() {
  const year = await getActiveYear();
  await requireOrgFeature("kp");

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      <PageHeader
        title="KP-1042 — Novi unos"
        description={`Evidencija naplaćenog prometa za ${year}. godinu`}
      >
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/kp">
            <ArrowLeft className="h-4 w-4" />
            Nazad na KP
          </Link>
        </Button>
      </PageHeader>

      <KpEntryForm year={year} />
    </div>
  );
}
