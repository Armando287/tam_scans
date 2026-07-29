import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Upsert user profile in Firestore
    const userRef = adminDb.collection("users").doc(decoded.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        email: decoded.email,
        displayName: decoded.name || decoded.email?.split("@")[0] || "User",
        isAdmin: false,
        isVerified: decoded.email_verified,
        isBanned: false,
        uploadCount: 0,
        createdAt: new Date(),
      });
    } else {
      await userRef.update({ isVerified: decoded.email_verified });
    }

    const data = (await userRef.get()).data();
    return NextResponse.json({ user: { uid: decoded.uid, ...data } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
