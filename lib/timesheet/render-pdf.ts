import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { SihtericaPdf } from "@/lib/pdf/sihterica";
import {
  loadSihtericaPdfData,
  sihtericaPdfFilename,
} from "@/lib/timesheet/pdf-data";

export async function renderSihtericaPdfBuffer(
  orgId: string,
  userId: string,
  employeeId: string,
  year: number,
  month: number
): Promise<{ buffer: Buffer; filename: string } | null> {
  const supabase = await createClient();

  const { data: emp } = await supabase
    .from("employees")
    .select("first_name, last_name")
    .eq("id", employeeId)
    .eq("organization_id", orgId)
    .single();

  const data = await loadSihtericaPdfData(supabase, orgId, userId, employeeId, year, month);
  if (!data || !emp) return null;

  const buffer = await renderToBuffer(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(SihtericaPdf, { data }) as any
  );

  return {
    buffer: Buffer.from(buffer),
    filename: sihtericaPdfFilename(emp.last_name, emp.first_name, year, month),
  };
}

export async function getAuthOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!org) return null;

  return { supabase, user, org };
}

export function parseYearMonth(searchParams: URLSearchParams): { year: number; month: number } | null {
  const year = parseInt(searchParams.get("year") ?? "", 10);
  const month = parseInt(searchParams.get("month") ?? "", 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return null;
  return { year, month };
}
