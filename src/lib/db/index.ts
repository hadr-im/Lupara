/**
 * PostgreSQL connection (works with Supabase, Neon, or any Postgres).
 *
 * Uses postgres.js, whose tagged-template `sql`...`` API is what every query in
 * this app relies on — so the database provider can change with only the
 * connection string.
 *
 *   Local dev  →  DATABASE_URL=postgres://... in .env
 *   Production →  set DATABASE_URL as a host secret (Render, etc.)
 *
 * For Supabase, use the connection *pooler* string (Session or Transaction).
 * `prepare: false` keeps it compatible with transaction-mode poolers
 * (Supabase :6543 / Neon -pooler), which don't support prepared statements.
 */
import postgres from "postgres";

type Postgres = ReturnType<typeof postgres>;

let _sql: Postgres | undefined;

export function getDb(): Postgres {
  if (_sql) return _sql;

  const url =
    (typeof process !== "undefined" ? process.env?.DATABASE_URL : undefined) ||
    ((globalThis as Record<string, unknown>).DATABASE_URL as string | undefined);

  if (!url) {
    throw new Error(
      "DATABASE_URL is not set.\n" +
        "  Local dev: add DATABASE_URL=postgres://... to .env\n" +
        "  Production: set DATABASE_URL as a host secret",
    );
  }

  _sql = postgres(url, {
    ssl: "require",
    prepare: false, // required for transaction-mode poolers (Supabase :6543 / Neon -pooler)
    // Serverless (Vercel): each function instance keeps a tiny pool and releases
    // idle connections quickly, so many instances don't exhaust the DB. Point
    // DATABASE_URL at Supabase's Transaction pooler (:6543) in production.
    max: 1,
    idle_timeout: 20,
  });
  return _sql;
}

export type Sql = Postgres;
