import { Pool } from "pg";

// We authenticate as the `postgres` role (via POSTGRES_URL, the Supabase
// pooler connection string) which bypasses Row Level Security entirely.
// This is only ever used from server-side API routes, never from the
// browser, and every route that touches it verifies the caller's Supabase
// auth token + admin flag first.
let _pool: Pool | null = null;

export function getDb(): Pool {
  if (!_pool) {
    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error("POSTGRES_URL is not set");
    }
    _pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return _pool;
}
