import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import {
  getAuthOrg,
  parseYearMonth,
  renderSihtericaPdfBuffer,
} from "@/lib/timesheet/render-pdf";
import { sihtericaBulkZipFilename } from "@/lib/timesheet/pdf-data";
import { PAYROLL_ELIGIBLE_STATUSES } from "@/lib/employees/form-utils";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthOrg();
    if (!auth) return new NextResponse("Unauthorized", { status: 401 });

    const period = parseYearMonth(req.nextUrl.searchParams);
    if (!period) {
      return new NextResponse("Missing or invalid year/month", { status: 400 });
    }

    const { data: employees } = await auth.supabase
      .from("employees")
      .select("id, first_name, last_name")
      .eq("organization_id", auth.org.id)
      .eq("insurance_status", "registered")
      .in("status", [...PAYROLL_ELIGIBLE_STATUSES])
      .order("last_name", { ascending: true });

    if (!employees || employees.length === 0) {
      return new NextResponse("Nema prijavljenih radnika.", { status: 404 });
    }

    const zip = new JSZip();

    for (const emp of employees) {
      const result = await renderSihtericaPdfBuffer(
        auth.org.id,
        auth.user.id,
        emp.id,
        period.year,
        period.month
      );
      if (result) {
        zip.file(result.filename, result.buffer);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const filename = sihtericaBulkZipFilename(period.year, period.month);

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    console.error("Sihterica bulk ZIP error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(`ZIP generation failed: ${message}`, { status: 500 });
  }
}
