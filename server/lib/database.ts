import { Pool } from "pg";

let pool: Pool | null = null;
let tableReady = false;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for campaign lead storage.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }

  return pool;
}

export async function ensureCampaignLeadsTable() {
  if (tableReady) return;
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS campaign_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      brand_name TEXT NOT NULL,
      email TEXT NOT NULL,
      mobile TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  tableReady = true;
}

export async function insertCampaignRequest(input: {
  brandName: string;
  email: string;
  mobile: string;
}) {
  await ensureCampaignLeadsTable();
  const db = getPool();
  await db.query(
    `INSERT INTO campaign_requests (brand_name, email, mobile)
     VALUES ($1, $2, $3)`,
    [input.brandName, input.email, input.mobile],
  );
}
