import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export type AppDatabase = NodePgDatabase<typeof schema>;

let pool: pg.Pool | null = null;
let dbInstance: AppDatabase | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** Lazy PostgreSQL pool — returns null when DATABASE_URL is unset (dev/demo mode). */
export function getDb(): AppDatabase | null {
  if (!isDatabaseConfigured()) return null;
  if (!dbInstance) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    dbInstance = drizzle(pool, { schema });
  }
  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    dbInstance = null;
  }
}

export * from "./schema";
