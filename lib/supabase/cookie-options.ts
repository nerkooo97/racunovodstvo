import type { CookieOptions } from "@supabase/ssr";

/**
 * Na HTTP deployu (npr. traefik.me bez TLS) Secure kolačići se ne šalju —
 * server actions tada ne vide sesiju i svi upisi u bazu “ne rade”.
 *
 * Postavi COOKIE_SECURE=false u Environment aplikacije dok ne uključiš HTTPS.
 */
export function supabaseCookieOptions(): Pick<CookieOptions, "secure" | "sameSite"> {
  if (process.env.COOKIE_SECURE === "true") {
    return { secure: true, sameSite: "lax" };
  }
  if (process.env.COOKIE_SECURE === "false") {
    return { secure: false, sameSite: "lax" };
  }
  // Default: secure samo kad je eksplicitno https URL
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "";
  const secure = siteUrl.startsWith("https://");
  return { secure, sameSite: "lax" };
}

export function appCookieSecure(): boolean {
  return supabaseCookieOptions().secure ?? false;
}
