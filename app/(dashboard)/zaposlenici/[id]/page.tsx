import { redirect } from "next/navigation";

export default async function ZaposleniciIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/radnici/${id}`);
}
