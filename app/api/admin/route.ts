import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deleteFolderFromS3 } from "@/lib/s3";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ddbcetqueswsszzftmjh.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmNldHF1ZXN3c3N6emZ0bWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzYzNjAsImV4cCI6MjEwMDkxMjM2MH0.TON9YYSoe424lPZHGWwC_SqxDlVzTobiYQ647uHN2WE";

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = authHeader.slice(7);

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");

  const { data: userDoc } = await client.from("users").select("isAdmin").eq("id", user.id).single();
  if (!userDoc?.isAdmin) throw new Error("Forbidden: Not an admin");
  
  return { client, user };
}

// GET /api/admin?action=stats|chapters|users
export async function GET(req: NextRequest) {
  try {
    const { client } = await verifyAdmin(req);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "stats") {
      const { count: mangas } = await client.from("mangas").select("*", { count: "exact", head: true });
      const { count: chapters } = await client.from("chapters").select("*", { count: "exact", head: true });
      const { count: users } = await client.from("users").select("*", { count: "exact", head: true });
      const { count: pending } = await client.from("chapters").select("*", { count: "exact", head: true }).eq("status", "pending");
      
      return NextResponse.json({
        mangas: mangas || 0,
        chapters: chapters || 0,
        users: users || 0,
        pending: pending || 0,
      });
    }

    if (action === "chapters") {
      const { data: chapters } = await client.from("chapters").select("*").order("createdAt", { ascending: false });
      return NextResponse.json({ chapters: chapters || [] });
    }

    if (action === "users") {
      const { data: users } = await client.from("users").select("*").order("createdAt", { ascending: false });
      return NextResponse.json({ users: users || [] });
    }

    if (action === "mangas") {
      const { data: mangas } = await client.from("mangas").select("id, title").order("title", { ascending: true });
      return NextResponse.json({ mangas: mangas || [] });
    }

    if (action === "manga-chapters") {
      const mangaId = searchParams.get("mangaId");
      if (!mangaId) return NextResponse.json({ error: "Missing mangaId" }, { status: 400 });
      const { data: existingChapters } = await client.from("chapters").select("number").eq("mangaId", mangaId);
      return NextResponse.json({ existingChapters: existingChapters?.map(c => c.number) || [] });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

// POST /api/admin { action, id, data }
export async function POST(req: NextRequest) {
  console.log("-> POST /api/admin started");
  try {
    const { client, user } = await verifyAdmin(req);
    const body = await req.json();
    const { action, id, data } = body;
    console.log("-> POST /api/admin action:", action);

    if (action === "approve-chapter") {
      await client.from("chapters").update({ status: "published" }).eq("id", id);
      const { data: chapter } = await client.from("chapters").select("mangaId").eq("id", id).single();
      if (chapter?.mangaId) {
        await client.from("mangas").update({ updatedAt: new Date().toISOString() }).eq("id", chapter.mangaId);
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "reject-chapter") {
      await client.from("chapters").update({ status: "rejected" }).eq("id", id);
      return NextResponse.json({ ok: true });
    }

    if (action === "delete-chapter") {
      // Fetch chapter first to get mangaId and number to delete from S3
      const { data: chapter } = await client.from("chapters").select("mangaId, number").eq("id", id).single();
      if (chapter) {
        await deleteFolderFromS3(`mangas/${chapter.mangaId}/chapters/${chapter.number}/`).catch(console.error);
      }
      await client.from("chapters").delete().eq("id", id);
      return NextResponse.json({ ok: true });
    }

    if (action === "ban-user") {
      // Note: Admin ban requires service_role key, bypassing for now
      await client.from("users").update({ isBanned: true }).eq("id", id);
      return NextResponse.json({ ok: true });
    }

    if (action === "unban-user") {
      await client.from("users").update({ isBanned: false }).eq("id", id);
      return NextResponse.json({ ok: true });
    }

    if (action === "make-admin") {
      await client.from("users").update({ isAdmin: true }).eq("id", id);
      return NextResponse.json({ ok: true });
    }

    if (action === "search-manga") {
      const { data: manga } = await client.from("mangas").select("id").eq("title", data.title).maybeSingle();
      if (manga) {
         const { data: existingChapters } = await client.from("chapters").select("number").eq("mangaId", manga.id);
         return NextResponse.json({ id: manga.id, existingChapters: existingChapters?.map(c => c.number) || [] });
      }
      return NextResponse.json({ id: null, existingChapters: [] });
    }

    if (action === "create-manga") {
      const { data: newManga } = await client.from("mangas").insert({
        ...data,
        views: 0,
      }).select("id").single();
      return NextResponse.json({ id: newManga?.id });
    }

    if (action === "create-chapter") {
      const { data: newChapter, error } = await client.from("chapters").insert({
        mangaId: data.manga_id,
        title: data.title,
        number: data.number,
        pages: data.pages,
        fileType: "images",
        status: "published",
        uploadedBy: user.id,
        uploaderEmail: user.email || "",
        views: 0,
        createdAt: new Date().toISOString()
      }).select("id").single();
      
      if (error) {
        console.error("Supabase create-chapter error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      // Update manga's updatedAt
      await client.from("mangas").update({ updatedAt: new Date().toISOString() }).eq("id", data.manga_id);

      return NextResponse.json({ id: newChapter?.id });
    }

    if (action === "delete-manga") {
      // Delete all images in S3
      await deleteFolderFromS3(`mangas/${id}/`).catch(console.error);
      // Delete from Supabase
      await client.from("mangas").delete().eq("id", id);
      return NextResponse.json({ ok: true });
    }

    if (action === "update-manga") {
      await client.from("mangas").update({ ...data, updatedAt: new Date().toISOString() }).eq("id", id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("API Admin Catch Error:", err);
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
