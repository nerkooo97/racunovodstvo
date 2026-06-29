import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { requireOrgFeature } from "@/lib/organization/server";
import { monthName } from "@/lib/pdv/period";
import KufForm from "./KufForm";

export default async function KufNoviPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year: yearStr, month: monthStr } = await params;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month)) notFound();

  const { supabase, org } = await requireOrgFeature("pdv");

  const { data: partners } = await supabase
    .from("partners")
    .select("id, name, tax_id, vat_number, address, city, partner_category")
    .eq("organization_id", org.id)
    .order("name", { ascending: true });

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      <PageHeader
        title="Ulazni račun (KUF)"
        description={`Unos za period ${monthName(month)} ${year}`}
      >
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/pdv/${year}/${month}`}>
            <ArrowLeft className="h-4 w-4" />
            Nazad
          </Link>
        </Button>
      </PageHeader>

      <KufForm year={year} month={month} partners={partners ?? []} />
    </div>
  );
}
