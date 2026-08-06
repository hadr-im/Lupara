// SERVER-ONLY. This module touches request cookies via `useSession`, which is
// only available on the server. The `.server.ts` suffix guarantees it is never
// bundled into client code. It is imported only from inside server-fn handlers
// (whose bodies are stripped from the client build).
import { useSession } from "@tanstack/react-start/server";
import { getDb } from "./index";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "ocp" | "ocvp" | "oc";
  workspaceId: string | null;
  keyAreaId: string | null;
  hue: number;
  status: string;
};

type SessionData = { userId?: string };

function sessionSecret(): string {
  const secret =
    (typeof process !== "undefined" ? process.env?.SESSION_SECRET : undefined) ||
    ((globalThis as Record<string, unknown>).SESSION_SECRET as string | undefined);
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or too short (need >= 32 chars).\n" +
        "  Local dev: add SESSION_SECRET=... to .env\n" +
        "  Cloudflare: run  wrangler secret put SESSION_SECRET",
    );
  }
  return secret;
}

export function getAppSession() {
  return useSession<SessionData>({ password: sessionSecret(), name: "lupara_session" });
}

export function mapUser(r: any): SessionUser {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    workspaceId: r.workspace_id ?? null,
    keyAreaId: r.key_area_id ?? null,
    hue: r.hue ?? 220,
    status: r.status ?? "active",
  };
}

/** Load the currently-authenticated user from the sealed session cookie. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getAppSession();
  const userId = session.data.userId;
  if (!userId) return null;
  const sql = getDb();
  const rows = (await sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`) as any[];
  const r = rows[0];
  if (!r || r.status === "disabled") return null;
  return mapUser(r);
}

// ─── Server-side authorization guards (used by every data endpoint) ───────────
export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Not authenticated", 401);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new AuthError("Admin access required", 403);
  return user;
}

/** Admin sees all; others must belong to the workspace. */
export async function requireWorkspace(workspaceId: string): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role === "admin") return user;
  if (user.workspaceId !== workspaceId) throw new AuthError("No access to this workspace", 403);
  return user;
}

/**
 * Guarded DB accessors. Every data endpoint uses one of these instead of
 * getDb() directly, so authorization is enforced server-side before any query
 * runs — the endpoints are no longer open to unauthenticated callers.
 */
export async function authedDb() {
  await requireUser();
  return getDb();
}
export async function adminDb() {
  await requireAdmin();
  return getDb();
}

/**
 * Workspace-scoped access: admins see everything; a non-admin may only touch
 * their own workspace. Non-admins must pass a workspaceId matching theirs —
 * this prevents one workspace's members from reading/writing another's data.
 */
export async function workspaceDb(workspaceId?: string | null) {
  const user = await requireUser();
  if (user.role !== "admin") {
    if (!workspaceId || workspaceId !== user.workspaceId) {
      throw new AuthError("No access to this workspace", 403);
    }
  }
  return getDb();
}
