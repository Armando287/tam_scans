import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ddbcetqueswsszzftmjh.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYmNldHF1ZXN3c3N6emZ0bWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzYzNjAsImV4cCI6MjEwMDkxMjM2MH0.TON9YYSoe424lPZHGWwC_SqxDlVzTobiYQ647uHN2WE";

async function supaFetch(path: string, options: RequestInit = {}) {
  const headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
    ...options.headers,
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    
    // Verify user securely with Firebase Auth
    let decoded;
    try {
       decoded = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
      // Fallback for missing admin sdk credentials in dev
      if (process.env.NODE_ENV === "development") {
        const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64").toString());
        decoded = { uid: payload.user_id, email: payload.email, email_verified: payload.email_verified, name: payload.name };
      } else {
        throw e;
      }
    }

    // Upsert user profile in Supabase
    // Using ON CONFLICT logic via Postgres REST
    const payload = {
      id: decoded.uid,
      email: decoded.email,
      displayName: decoded.name || decoded.email?.split("@")[0] || "User",
      isAdmin: false,
      isVerified: decoded.email_verified,
      isBanned: false,
      uploadCount: 0,
      createdAt: new Date().toISOString(),
    };

    // Supabase upsert
    const res = await supaFetch(`users`, {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload)
    });

    const data = res[0];
    return NextResponse.json({ user: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
