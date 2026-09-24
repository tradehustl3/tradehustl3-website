import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { createHash } from "node:crypto";

/**
 * In-memory D1 stand-in backed by node:sqlite with this repo's forward
 * migrations applied, so worker SQL (JSON functions, EXISTS clauses, upserts)
 * runs for real in tests. Never points at a remote/production database.
 */
export type SqliteD1 = { DB: D1Database; sqlite: DatabaseSync };

const MIGRATIONS_DIR = new URL("../../drizzle/", import.meta.url);

function param(value: unknown): SQLInputValue {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  return value as SQLInputValue;
}

export function sqliteD1(): SqliteD1 {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(MIGRATIONS_DIR).filter((name) => /^\d{4}_.*\.sql$/.test(name) && !/_(?:down|preflight)\.sql$/.test(name)).sort()) {
    sqlite.exec(readFileSync(new URL(file, MIGRATIONS_DIR), "utf8").replace(/-->\s*statement-breakpoint/g, ""));
  }
  const statement = (sql: string, values: unknown[] = []) => ({
    sql,
    async first<T>() { return (sqlite.prepare(sql).get(...values.map(param)) ?? null) as T | null; },
    async all<T>() { return { results: sqlite.prepare(sql).all(...values.map(param)) as T[] }; },
    async run() {
      if (/\bRETURNING\b/i.test(sql)) return { results: sqlite.prepare(sql).all(...values.map(param)), meta: { changes: 1 } };
      const result = sqlite.prepare(sql).run(...values.map(param));
      return { meta: { changes: Number(result.changes) } };
    },
    bind(...next: unknown[]) { return statement(sql, next); },
  });
  const DB = {
    prepare: (sql: string) => statement(sql),
    async batch(statements: Array<{ run(): Promise<unknown> }>) {
      const results = [];
      for (const item of statements) results.push(await item.run());
      return results;
    },
  } as unknown as D1Database;
  return { DB, sqlite };
}

export const TEST_SESSION = "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

/** Signed-in user whose session cookie is `TEST_SESSION`. */
export function seedSession(sqlite: DatabaseSync, userId = "user-1", email = "account@example.com"): void {
  sqlite.prepare("INSERT INTO users (user_id, email, full_name) VALUES (?, ?, ?)").run(userId, email, "Account Name");
  const hash = createHash("sha256").update(TEST_SESSION).digest("hex");
  sqlite.prepare("INSERT INTO sessions (session_hash, user_id, expires_at) VALUES (?, ?, ?)").run(hash, userId, Math.floor(Date.now() / 1000) + 3600);
}
