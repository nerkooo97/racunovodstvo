/**
 * Konvertuje Supabase Storage javni URL u lokalni proxy URL.
 *
 * U lokalnom razvoju, browser šalje auth kolačiće na localhost:8000 (Supabase/Kong),
 * što prelazi limit veličine headera. Ovaj proxy dohvata slike server-strane.
 *
 * U produkciji možemo koristiti direktni URL ako su na različitoj domeni,
 * ali proxy također radi i nema negativnih efekata.
 */
export function proxyImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}
