import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const formData = await req.formData();
    const file = formData.get("logo") as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Fajl nije poslan." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${user.id}/${orgId}.${ext}`;
    const buffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Dodajemo cache-buster timestamp kako bi izbjegli keširanje starog logotipa u browseru
    const logo_url = `${supabase.storage.from("logos").getPublicUrl(path).data.publicUrl}?t=${Date.now()}`;

    return NextResponse.json({ success: true, logo_url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
