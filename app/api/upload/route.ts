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

    if (!user.email_confirmed_at && !user.user_metadata?.email_verified) {
      // In Supabase, email verification is marked by email_confirmed_at
      // return NextResponse.json({ error: "Email not verified. Please verify your email first." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const mangaId = formData.get("mangaId") as string;
    const chapterNumber = formData.get("chapterNumber") as string;
    const chapterTitle = formData.get("chapterTitle") as string;
    const pageIndex = formData.get("pageIndex") as string;
    const fileType = formData.get("fileType") as string; // "images" | "pdf"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Allowed: PNG, JPG, WebP, PDF" }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 50MB." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop() || "bin";
    const key = fileType === "pdf"
      ? `mangas/${mangaId}/chapters/${chapterNumber}/chapter.pdf`
      : `mangas/${mangaId}/chapters/${chapterNumber}/pages/${pageIndex}.${ext}`;

    const url = await uploadToS3(key, buffer, file.type);

    return NextResponse.json({ url, key });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
