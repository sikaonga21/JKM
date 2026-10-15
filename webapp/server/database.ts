import { neon } from "@neondatabase/serverless"

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL is not configured")
  return neon(connectionString)
}

export async function ensureDatabaseSchema(sql: ReturnType<typeof getDatabase>) {
  await sql`CREATE TABLE IF NOT EXISTS jkm_quotations (
    id TEXT PRIMARY KEY,
    created_at BIGINT NOT NULL,
    data JSONB NOT NULL
  )`
  await sql`CREATE TABLE IF NOT EXISTS jkm_settings (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`
}