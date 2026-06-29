import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy za javne slike iz Supabase Storage.
 * 
 * Problem: U lokalnom razvoju, Supabase Storage je na localhost:8000.
 * Browser šalje sve kolačiće domene "localhost" (uključujući velike JWT tokene)
 * sa svakim zahtjevom, što prelazi Kong limit veličine headera.
 *
 * Rješenje: Slike dohvatamo server-strane (bez auth kolačića) i vraćamo browseru.
 * U produkciji (različite domene) ovo nije problem, ali proxy radi i tamo.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // Dozvolimo samo Supabase Storage URL-ove (sigurnost)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const allowedHosts = [
    new URL(supabaseUrl).hostname,
    "localhost",
    "127.0.0.1",
  ];

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (!allowedHosts.includes(parsedUrl.hostname)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    // Dohvatamo sliku server-strane, BEZ prosljeđivanja browser kolačića
    const response = await fetch(url, {
      headers: {
        Accept: "image/*,*/*",
      },
    });

    if (!response.ok) {
      return new NextResponse("Image fetch failed", { status: response.status });
    }

    const contentType = response.headers.get("content-type") ?? "image/png";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
    });
  } catch (err: any) {
    return new NextResponse(`Proxy error: ${err.message}`, { status: 500 });
  }
}
