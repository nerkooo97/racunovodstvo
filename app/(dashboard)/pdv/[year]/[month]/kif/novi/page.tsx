import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { requireOrgFeature } from "@/lib/organization/server";
import { monthName } from "@/lib/pdv/period";
import KifForm from "./KifForm";

export default async function KifNoviPage({
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
    <div className="max-w-3xl mx-auto w-full space-y-6">
      <PageHeader
        title="Ručni KIF unos"
        description={`Interna potrošnja, knjižno odobrenje, oslobođene isporuke · ${monthName(month)} ${year}`}
      >
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/pdv/${year}/${month}`}>
            <ArrowLeft className="h-4 w-4" />
            Nazad
          </Link>
        </Button>
      </PageHeader>

      <KifForm year={year} month={month} />
    </div>
  );
}
