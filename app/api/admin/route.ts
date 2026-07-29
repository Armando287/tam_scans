import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ddbcetqueswsszzftmjh.supabase.co";
// Need service role to ban/unban users from auth
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTMzNjM2MCwiZXhwIjoyMTAwOTEyMzYwfQ.GdBmpCH4oQZi179qrzV77r_zTRp-pQEyBHNdGi1rFUo";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = authHeader.slice(7);

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized");

  const { data: userDoc } = await supabaseAdmin.from("users").select("isAdmin").eq("id", user.id).single();
  if (!userDoc?.isAdmin) throw new Error("Forbidden: Not an admin");
  
  return user;
}

// GET /api/admin?action=stats|chapters|users
export async function GET(req: NextRequest) {
  try {
    await verifyAdmin(req);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "stats") {
      const { count: mangas } = await supabaseAdmin.from("mangas").select("*", { count: "exact", head: true });
      const { count: chapters } = await supabaseAdmin.from("chapters").select("*", { count: "exact", head: true });
      const { count: users } = await supabaseAdmin.from("users").select("*", { count: "exact", head: true });
      const { count: pending } = await supabaseAdmin.from("chapters").select("*", { count: "exact", head: true }).eq("status", "pending");
      
      return NextResponse.json({
        mangas: mangas || 0,
        chapters: chapters || 0,
        users: users || 0,
        pending: pending || 0,
      });
    }

    if (action === "chapters") {
      const { data: chapters } = await supabaseAdmin.from("chapters").select("*").order("createdAt", { ascending: false });
      return NextResponse.json({ chapters: chapters || [] });
    }

    if (action === "users") {
      const { data: users } = await supabaseAdmin.from("users").select("*").order("createdAt", { ascending: false });
      return NextResponse.json({ users: users || [] });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

// POST /api/admin { action, id, data }
export async function POST(req: NextRequest) {
  try {
    await verifyAdmin(req);
    const body = await req.json();
    const { action, id, data } = body;

    if (action === "approve-chapter") {
      await supabaseAdmin.from("chapters").update({ status: "published" }).eq("id", id);
      const { data: chapter } = await supabaseAdmin.from("chapters").select("mangaId").eq("id", id).single();
      if (chapter?.mangaId) {
        await supabaseAdmin.from("mangas").update({ updatedAt: new Date().toISOString() }).eq("id", chapter.mangaId);
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "reject-chapter") {
      await supabaseAdmin.from("chapters").update({ status: "rejected" }).eq("id", id);
      return NextResponse.json({ ok: true });
    }

    if (action === "delete-chapter") {
      await supabaseAdmin.from("chapters").delete().eq("id", id);
      return NextResponse.json({ ok: true });
    }

    if (action === "ban-user") {
      await supabaseAdmin.from("users").update({ isBanned: true }).eq("id", id);
      await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: "87600h" }); // Ban for 10 years
      return NextResponse.json({ ok: true });
    }

    if (action === "unban-user") {
      await supabaseAdmin.from("users").update({ isBanned: false }).eq("id", id);
      await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: "none" });
      return NextResponse.json({ ok: true });
    }

    if (action === "make-admin") {
      await supabaseAdmin.from("users").update({ isAdmin: true }).eq("id", id);
      return NextResponse.json({ ok: true });
    }

    if (action === "create-manga") {
      const { data: newManga } = await supabaseAdmin.from("mangas").insert({
        ...data,
        views: 0,
      }).select("id").single();
      return NextResponse.json({ id: newManga?.id });
    }

    if (action === "delete-manga") {
      await supabaseAdmin.from("mangas").delete().eq("id", id);
      return NextResponse.json({ ok: true });
    }

    if (action === "update-manga") {
      await supabaseAdmin.from("mangas").update({ ...data, updatedAt: new Date().toISOString() }).eq("id", id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
