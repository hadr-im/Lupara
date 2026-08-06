import { createServerFn } from "@tanstack/react-start";
import { getDb } from "./index";
import { hashPassword, verifyPassword } from "../auth/password";
import {
  getAppSession,
  getSessionUser,
  requireUser,
  requireAdmin,
  mapUser,
} from "./session.server";

// ─── Auth endpoints ───────────────────────────────────────────────────────────
export const me = createServerFn({ method: "GET" }).handler(async () => {
  return getSessionUser();
});

export const login = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const sql = getDb();
    const rows = (await sql`
      SELECT * FROM users WHERE lower(email) = lower(${data.email}) LIMIT 1
    `) as any[];
    const r = rows[0];
    // Same generic error whether the email is unknown or the password is wrong.
    if (!r || !r.password_hash) return { error: "Invalid email or password." };
    const ok = await verifyPassword(data.password, r.password_hash);
    if (!ok) return { error: "Invalid email or password." };
    if (r.status === "disabled") return { error: "This account is disabled." };
    const session = await getAppSession();
    await session.update({ userId: r.id });
    return { user: mapUser(r) };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getAppSession();
  await session.clear();
  return { ok: true };
});

export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((data: { currentPassword: string; newPassword: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireUser();
    if (data.newPassword.length < 8) {
      return { error: "New password must be at least 8 characters." };
    }
    const sql = getDb();
    const rows = (await sql`SELECT password_hash FROM users WHERE id = ${user.id} LIMIT 1`) as any[];
    const ok = await verifyPassword(data.currentPassword, rows[0]?.password_hash ?? "");
    if (!ok) return { error: "Current password is incorrect." };
    const hash = await hashPassword(data.newPassword);
    await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${user.id}`;
    return { ok: true };
  });

// ─── Member management (admin-only) ───────────────────────────────────────────
export const listMembers = createServerFn({ method: "GET" }).handler(async () => {
  await requireUser();
  const sql = getDb();
  const rows = (await sql`
    SELECT id, name, email, role, workspace_id, key_area_id, hue, status
    FROM users ORDER BY created_at ASC NULLS LAST
  `) as any[];
  return rows.map(mapUser);
});

export const createMember = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string;
      name: string;
      email: string;
      password: string;
      role: string;
      workspaceId?: string | null;
      keyAreaId?: string | null;
      hue?: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    if (!data.email || !data.name) return { error: "Name and email are required." };
    if (!data.password || data.password.length < 8) {
      return { error: "Initial password must be at least 8 characters." };
    }
    const sql = getDb();
    const id = data.id ?? `mu-${Date.now()}`;
    const hash = await hashPassword(data.password);
    try {
      await sql`
        INSERT INTO users (id, name, email, password_hash, role, workspace_id, key_area_id, hue, status)
        VALUES (
          ${id}, ${data.name}, ${data.email}, ${hash}, ${data.role},
          ${data.workspaceId ?? null}, ${data.keyAreaId ?? null}, ${data.hue ?? 220}, 'active'
        )
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name, role = EXCLUDED.role,
          workspace_id = EXCLUDED.workspace_id, key_area_id = EXCLUDED.key_area_id,
          hue = EXCLUDED.hue
      `;
    } catch {
      return { error: "Could not create member (email may already exist)." };
    }
    return { id, ok: true };
  });

export const updateMember = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      role?: string;
      workspaceId?: string | null;
      keyAreaId?: string | null;
      newPassword?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = getDb();
    if (data.role !== undefined) await sql`UPDATE users SET role = ${data.role} WHERE id = ${data.id}`;
    if (data.workspaceId !== undefined)
      await sql`UPDATE users SET workspace_id = ${data.workspaceId} WHERE id = ${data.id}`;
    if (data.keyAreaId !== undefined)
      await sql`UPDATE users SET key_area_id = ${data.keyAreaId} WHERE id = ${data.id}`;
    if (data.newPassword) {
      if (data.newPassword.length < 8) return { error: "Password must be at least 8 characters." };
      await sql`UPDATE users SET password_hash = ${await hashPassword(data.newPassword)} WHERE id = ${data.id}`;
    }
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    if (data.id === admin.id) return { error: "You cannot remove your own account." };
    const sql = getDb();
    await sql`DELETE FROM users WHERE id = ${data.id}`;
    return { ok: true };
  });
