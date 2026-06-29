import { redirect } from "next/navigation";

export default async function BankovniIzvodiTransakcijaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/bankovni-izvod/transakcija/${id}`);
}
