import PageHeader from "@/components/shared/page-header";
import FormSection from "@/components/shared/form-section";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function UgovorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <PageHeader title="Ugovori radnika" description="Odaberite vrstu ugovora ili obrasca.">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/radnici/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            Nazad na profil
          </Link>
        </Button>
      </PageHeader>
      <FormSection title="Dostupni obrasci">
      <div className="grid grid-cols-2 gap-4">
        <Link
          href={`/zaposlenici/${id}/ugovori/rad`}
          className="border rounded-md p-4 hover:border-primary transition-colors"
        >
          <div className="font-semibold text-sm">Ugovor o radu</div>
          <div className="text-xs text-muted-foreground mt-1">
            Forma, odluka o otkazu, JS3100 odjava
          </div>
        </Link>
        <Link
          href={`/radnici/${id}/js3100`}
          className="border rounded-md p-4 hover:border-primary transition-colors"
        >
          <div className="font-semibold text-sm">JS3100</div>
          <div className="text-xs text-muted-foreground mt-1">
            Prijava / odjava / promjena
          </div>
        </Link>
      </div>
      </FormSection>
    </div>
  );
}