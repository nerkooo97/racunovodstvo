import { cookies } from "next/headers";

export const YEAR_COOKIE = "active_year";

export async function getActiveYear(): Promise<number> {
  const c = await cookies();
  const v = c.get(YEAR_COOKIE)?.value;
  const n = v ? parseInt(v, 10) : NaN;
  return isNaN(n) ? new Date().getFullYear() : n;
}
