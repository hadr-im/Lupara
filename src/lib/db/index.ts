/**
 * Neon PostgreSQL connection.
 *
 * REQUIRES:  npm install @neondatabase/serverless
 *
 * Then add your connection string:
 *   Local dev  →  .dev.vars     DATABASE_URL=postgres://...
 *   Cloudflare →  wrangler secret put DATABASE_URL
 */

import { neon } from "@neondatabase/serverless";

export function getDb() {
  const url =
    (typeof process !== "undefined" ? process.env?.DATABASE_URL : undefined) ||
    ((globalThis as Record<string, unknown>).DATABASE_URL as string | undefined);

  if (!url) {
    throw new Error(
      "DATABASE_URL is not set.\n" +
        "  Local dev: add DATABASE_URL=postgres://... to .dev.vars\n" +
        "  Cloudflare: run  wrangler secret put DATABASE_URL",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return neon(url) as ReturnType<typeof neon>;
}

export type Sql = ReturnType<typeof getDb>;
