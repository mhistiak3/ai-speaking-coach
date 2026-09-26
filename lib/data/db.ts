import { readFileSync } from "node:fs";
import path from "node:path";

import postgres from "postgres";

import { getEnv, isDatabaseConfigured } from "@/lib/env";

/**
 * Lazy Postgres connection. Returns null when DATABASE_URL is not set —
 * the app then runs fully on localStorage (see lib/store/sessions-store.ts).
 *
 * State lives on globalThis so dev-server hot reloads don't leak pools.
 */

type Sql = ReturnType<typeof postgres>;

const globalCache = globalThis as unknown as {
  ascSql?: Sql | null;
  ascSchema?: Promise<void> | null;
};

export function getSql(): Sql | null {
  if (!isDatabaseConfigured()) return null;
  if (!globalCache.ascSql) {
    globalCache.ascSql = postgres(getEnv().DATABASE_URL, {
      max: 2,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  globalCache.ascSchema ??= applySchema(globalCache.ascSql);
  return globalCache.ascSql;
}

/** Resolves once db/schema.sql has been applied. */
export function databaseReady(): Promise<void> | null {
  return globalCache.ascSchema ?? null;
}

async function applySchema(client: Sql): Promise<void> {
  try {
    const ddl = readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
    await client.unsafe(ddl);
  } catch (err) {
    console.error("[db] failed to apply schema:", err);
    // Clear so the next request retries, but keep the pool open.
    globalCache.ascSchema = null;
  }
}
