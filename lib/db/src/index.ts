import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { createMemoryPool } from "./mem-db";

const { Pool } = pg;

try {
  process.loadEnvFile?.();
} catch {
  // .env is optional
}

function cleanDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  let url = rawUrl.trim();
  // Strip surrounding quotes
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1);
  }
  // Strip square brackets around password if present, e.g. :[password]@ -> :encoded@
  url = url.replace(/:\[([^\]]+)\]@/, (_match, pw) => `:${encodeURIComponent(pw)}@`);
  return url;
}

const rawDatabaseUrl = process.env.DATABASE_URL;
const databaseUrl = cleanDatabaseUrl(rawDatabaseUrl);

const isOfflineOrMemory =
  process.env.USE_LOCAL_MEM_DB === "true" ||
  !databaseUrl ||
  databaseUrl.includes("ordstmmtnhulzsihrkgp");

const isRemoteOrSupabase = Boolean(
  databaseUrl &&
    (databaseUrl.includes("supabase.co") ||
      databaseUrl.includes("pooler.supabase.com") ||
      databaseUrl.includes("sslmode=require") ||
      process.env.NODE_ENV === "production"),
);

export const pool: pg.Pool = isOfflineOrMemory
  ? createMemoryPool()
  : new Pool({
      connectionString: databaseUrl,
      ssl: isRemoteOrSupabase ? { rejectUnauthorized: false } : undefined,
    });

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

export * from "./schema";
