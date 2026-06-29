import { redirect } from "next/navigation";

export default async function BankovniIzvodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/bankovni-izvod/${id}`);
}
