import { redirect } from "next/navigation";

export default async function RadnikUgovorORaduPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/radnici/${id}/ugovori`);
}
