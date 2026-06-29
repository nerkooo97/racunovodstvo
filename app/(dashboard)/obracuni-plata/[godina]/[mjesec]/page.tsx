import { redirect } from "next/navigation";

export default async function ObracuniPlataDetailPage({
  params,
}: {
  params: Promise<{ godina: string; mjesec: string }>;
}) {
  const { godina, mjesec } = await params;
  redirect(`/place/${godina}/${mjesec}`);
}
