import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = authHeader.slice(7);
  const decoded = await adminAuth.verifyIdToken(token);
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  if (!userDoc.data()?.isAdmin) throw new Error("Forbidden: Not an admin");
  return decoded;
}

// GET /api/admin?action=stats|chapters|users
export async function GET(req: NextRequest) {
  try {
    await verifyAdmin(req);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "stats") {
      const [mangasSnap, chaptersSnap, usersSnap] = await Promise.all([
        adminDb.collection("mangas").get(),
        adminDb.collection("chapters").get(),
        adminDb.collection("users").get(),
      ]);
      const pending = chaptersSnap.docs.filter((d: { data: () => Record<string, unknown> }) => d.data().status === "pending").length;
      return NextResponse.json({
        mangas: mangasSnap.size,
        chapters: chaptersSnap.size,
        users: usersSnap.size,
        pending,
      });
    }

    if (action === "chapters") {
      const snap = await adminDb.collection("chapters").orderBy("createdAt", "desc").get();
      const chapters = snap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ chapters });
    }

    if (action === "users") {
      const snap = await adminDb.collection("users").orderBy("createdAt", "desc").get();
      const users = snap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ users });
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
      await adminDb.collection("chapters").doc(id).update({ status: "published" });
      // Update manga's updatedAt
      const chapter = await adminDb.collection("chapters").doc(id).get();
      if (chapter.data()?.mangaId) {
        await adminDb.collection("mangas").doc(chapter.data()!.mangaId).update({
          updatedAt: new Date(),
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "reject-chapter") {
      await adminDb.collection("chapters").doc(id).update({ status: "rejected" });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete-chapter") {
      await adminDb.collection("chapters").doc(id).delete();
      return NextResponse.json({ ok: true });
    }

    if (action === "ban-user") {
      await adminDb.collection("users").doc(id).update({ isBanned: true });
      await adminAuth.updateUser(id, { disabled: true });
      return NextResponse.json({ ok: true });
    }

    if (action === "unban-user") {
      await adminDb.collection("users").doc(id).update({ isBanned: false });
      await adminAuth.updateUser(id, { disabled: false });
      return NextResponse.json({ ok: true });
    }

    if (action === "make-admin") {
      await adminDb.collection("users").doc(id).update({ isAdmin: true });
      return NextResponse.json({ ok: true });
    }

    if (action === "create-manga") {
      const ref = await adminDb.collection("mangas").add({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        views: 0,
      });
      return NextResponse.json({ id: ref.id });
    }

    if (action === "delete-manga") {
      await adminDb.collection("mangas").doc(id).delete();
      return NextResponse.json({ ok: true });
    }

    if (action === "update-manga") {
      await adminDb.collection("mangas").doc(id).update({ ...data, updatedAt: new Date() });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
