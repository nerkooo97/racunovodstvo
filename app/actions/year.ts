"use server";

import { cookies } from "next/headers";
import { YEAR_COOKIE } from "@/lib/year";

export async function setActiveYear(year: number): Promise<void> {
  const c = await cookies();
  c.set(YEAR_COOKIE, String(year), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    sameSite: "lax",
  });
}
