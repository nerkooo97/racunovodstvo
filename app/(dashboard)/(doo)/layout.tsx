import { requireOrgFeature } from "@/lib/organization/server";

/**
 * Guard za sve d.o.o. stranice (glavna knjiga, saldakonti, zaključak godine):
 * obrt korisnik se preusmjerava — server-side, ne samo vizualno u sidebaru.
 */
export default async function DooLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOrgFeature("general_ledger");
  return <>{children}</>;
}
