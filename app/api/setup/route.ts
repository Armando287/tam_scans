import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    // Create Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        "displayName" TEXT,
        "isAdmin" BOOLEAN DEFAULT false,
        "isVerified" BOOLEAN DEFAULT false,
        "isBanned" BOOLEAN DEFAULT false,
        "uploadCount" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create Mangas Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS mangas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        "coverUrl" TEXT,
        genres JSONB,
        status TEXT,
        author TEXT,
        artist TEXT,
        views INTEGER DEFAULT 0,
        rating FLOAT DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create Chapters Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chapters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "mangaId" UUID,
        number INTEGER,
        title TEXT,
        pages JSONB,
        "fileType" TEXT,
        "pdfUrl" TEXT,
        "uploadedBy" TEXT,
        "uploaderEmail" TEXT,
        status TEXT,
        views INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Insert Admin User (We use a dummy ID, but they should login with Firebase to get their real UID, which will update this later or they can just match by email)
    await client.query(`
      INSERT INTO users (id, email, "displayName", "isAdmin", "isVerified")
      VALUES ('admin-dummy-id', 'admin@mangaverse.local', 'Admin', true, true)
      ON CONFLICT (email) DO NOTHING;
    `);

    client.release();
    return NextResponse.json({ success: true, message: "Tables created and admin user seeded successfully!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
