import { defineConfig } from "drizzle-kit";
import path from "path";

try {
  process.loadEnvFile?.();
} catch {
  // .env is optional
}

function cleanDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  let url = rawUrl.trim();
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1);
  }
  url = url.replace(/:\[([^\]]+)\]@/, (_match, pw) => `:${encodeURIComponent(pw)}@`);
  return url;
}

const dbUrl = cleanDatabaseUrl(process.env.DATABASE_URL);

if (!dbUrl) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
    ssl: dbUrl.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  },
});
