import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { requireOrgFeature } from "@/lib/organization/server";
import { monthName } from "@/lib/pdv/period";
import RetailKifForm from "./RetailKifForm";

export default async function ZbirnoKifPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year: yearStr, month: monthStr } = await params;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month)) notFound();

  await requireOrgFeature("pdv");

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      <PageHeader
        title="Zbirni maloprodajni promet"
        description={`Dnevni/mjesečni fiskalni promet kao jedan KIF slog · ${monthName(month)} ${year}`}
      >
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/pdv/${year}/${month}`}>
            <ArrowLeft className="h-4 w-4" />
            Nazad
          </Link>
        </Button>
      </PageHeader>

      <RetailKifForm year={year} month={month} />
    </div>
  );
}
