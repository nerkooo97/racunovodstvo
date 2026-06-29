import PageHeader from "@/components/shared/page-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function ObracuniRadnikaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <PageHeader title="Obračuni plate" description="Platni listići ovog radnika.">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/radnici/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            Nazad na profil
          </Link>
        </Button>
      </PageHeader>
      <p className="text-muted-foreground text-sm">Uskoro.</p>
    </div>
  );
}
