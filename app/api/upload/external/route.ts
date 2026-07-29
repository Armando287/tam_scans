import { NextRequest, NextResponse } from "next/server";
import { uploadToS3 } from "@/lib/s3";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ddbcetqueswsszzftmjh.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token." }, { status: 403 });
    }

    const { url, mangaId, chapterNumber, pageIndex } = await req.json();

    if (!url || !mangaId || !chapterNumber || !pageIndex) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Fetch the external image
    const imageRes = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://zonatmo.org/"
        }
    });

    if (!imageRes.ok) {
        throw new Error(`Failed to fetch image: ${imageRes.statusText}`);
    }

    const contentType = imageRes.headers.get("content-type") || "image/webp";
    let ext = "webp";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = "jpg";
    if (contentType.includes("png")) ext = "png";

    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const key = `mangas/${mangaId}/chapters/${chapterNumber}/pages/${pageIndex}.${ext}`;

    const uploadedUrl = await uploadToS3(key, buffer, contentType);

    return NextResponse.json({ url: uploadedUrl, key });
  } catch (error: any) {
    console.error("External Upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
