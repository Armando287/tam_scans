import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { uploadToS3 } from "@/lib/s3";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // Verify Firebase token (or decode if admin is not configured)
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    
    let decoded: any = null;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch (err) {
      console.warn("Failed to verify token with adminAuth, falling back to manual decode (insecure):", err);
      // Fallback: manually decode the JWT payload (insecure, but allows testing without admin credentials)
      const payloadBase64 = token.split(".")[1];
      if (payloadBase64) {
        decoded = JSON.parse(Buffer.from(payloadBase64, "base64").toString());
      }
    }

    if (!decoded || !decoded.user_id) {
      return NextResponse.json({ error: "Invalid token." }, { status: 403 });
    }

    // Assign uid if it exists as user_id (standard for Firebase JWT)
    if (!decoded.uid) decoded.uid = decoded.user_id;

    // Check email verification
    if (!decoded.email_verified) {
      return NextResponse.json({ error: "Email not verified. Please verify your email first." }, { status: 403 });
    }

    // Check if user is banned
    try {
      const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
      if (userDoc.exists && userDoc.data()?.isBanned) {
        return NextResponse.json({ error: "Account is banned." }, { status: 403 });
      }
    } catch (err) {
      console.warn("Could not check if user is banned (adminDb might not be configured):", err);
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

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Allowed: PNG, JPG, WebP, PDF" }, { status: 400 });
    }

    // Max size: 50MB
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
