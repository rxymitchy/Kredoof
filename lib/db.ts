import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/** True when production (or local) has a Neon connection string. */
export function dbEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

let sql: NeonQueryFunction<false, false> | null = null;
/** Create tables once per serverless instance, then reuse the promise. */
let schemaReady: Promise<void> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!sql) sql = neon(url);
  return sql;
}

export async function ensureSchema(): Promise<void> {
  if (!dbEnabled()) return;
  if (!schemaReady) schemaReady = createTables();
  await schemaReady;
}

async function createTables(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      wallet TEXT,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      verify_token_hash TEXT,
      verify_token_expires BIGINT,
      reset_token_hash TEXT,
      reset_token_expires BIGINT,
      created_at BIGINT NOT NULL,
      last_score INTEGER,
      deleted_at BIGINT,
      role TEXT NOT NULL DEFAULT 'borrower',
      google_id TEXT
    )
  `;
  // Unique only among live accounts so a deleted email/phone can be reused.
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_email_live ON users (email) WHERE deleted_at IS NULL`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_phone_live ON users (phone) WHERE deleted_at IS NULL AND phone <> ''`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'borrower'`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_google_live ON users (google_id) WHERE deleted_at IS NULL AND google_id IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS users_verify_hash ON users (verify_token_hash)`;
  await sql`CREATE INDEX IF NOT EXISTS users_reset_hash ON users (reset_token_hash)`;
  await sql`
    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      email TEXT,
      wallet TEXT NOT NULL,
      amount_usdc DOUBLE PRECISION NOT NULL,
      net_usdc DOUBLE PRECISION,
      origination_usdc DOUBLE PRECISION,
      app_fee_usdc DOUBLE PRECISION,
      lead_id TEXT,
      repay_usdc DOUBLE PRECISION,
      term_days INTEGER,
      daily_rate DOUBLE PRECISION,
      due_at BIGINT,
      status TEXT NOT NULL,
      disburse_tx TEXT,
      repay_tx TEXT,
      created_at BIGINT NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS loans_wallet ON loans (wallet)`;
  await sql`CREATE INDEX IF NOT EXISTS loans_email ON loans (email)`;
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      email TEXT,
      wallet TEXT NOT NULL,
      score INTEGER,
      limit_kes DOUBLE PRECISION,
      fee_kes DOUBLE PRECISION NOT NULL,
      payer TEXT NOT NULL DEFAULT 'lender',
      status TEXT NOT NULL,
      lender TEXT,
      loan_id TEXT,
      created_at BIGINT NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS leads_wallet ON leads (wallet)`;
  await sql`CREATE INDEX IF NOT EXISTS leads_status ON leads (status)`;
}
