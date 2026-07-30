process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    console.log("Adding bookmarks and readHistory to users table...");
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS bookmarks JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS "readHistory" JSONB DEFAULT '{}'::jsonb;
    `);
    console.log("Migration successful!");
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    client.release();
    pool.end();
  }
}

main();
