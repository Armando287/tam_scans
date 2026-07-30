import { Pool } from 'pg';

async function main() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    console.log("Migrating chapters table...");
    await client.query(`
      ALTER TABLE chapters 
      ALTER COLUMN number TYPE FLOAT;
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
