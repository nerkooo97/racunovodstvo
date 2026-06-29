import PageHeader from "@/components/shared/page-header";
import RegimeHub from "@/components/organization/regime-hub";
import { requireActiveOrganization } from "@/lib/organization/server";

export default async function RacunovodstvoPage() {
  const { org } = await requireActiveOrganization();

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 pb-12">
      <PageHeader
        title="Računovodstvo"
        description="Pregled režima i modula prilagođenih tipu vaše organizacije"
      />
      <RegimeHub
        orgName={org.name}
        orgType={org.type}
        isVatRegistered={org.is_vat_registered}
      />
    </div>
  );
}
