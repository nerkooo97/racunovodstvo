import { requireOrgFeature } from "@/lib/organization/server";

/**
 * Guard za sve obrt stranice (KPR, KP): d.o.o. korisnik se preusmjerava —
 * server-side, ne samo vizualno u sidebaru.
 */
export default async function ObrtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOrgFeature("kpr");
  return <>{children}</>;
}
