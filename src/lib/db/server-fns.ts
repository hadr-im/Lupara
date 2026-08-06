import { createServerFn } from "@tanstack/react-start";
import { getDb } from "./index";
import { authedDb, adminDb, workspaceDb, requireUser } from "./session.server";

// Normalize a date/timestamp column to a "YYYY-MM-DD" string. The Neon driver
// returns timestamptz columns as JS Date objects, so calling .slice() on them
// directly throws ("r.due_date.slice is not a function"). We format using LOCAL
// date components (not toISOString/UTC): dates are written as bare "YYYY-MM-DD"
// strings and stored as local-midnight timestamps, so reading them back in the
// same server timezone recovers the intended calendar day (UTC would shift it).
function dateOnly(v: any): string | undefined {
  if (!v) return undefined;
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(v).slice(0, 10);
}

// --- Leads (Sales CRM) --------------------------------------------------------

export const getLeads = createServerFn({ method: "GET" })
  .inputValidator((data: { workspaceId?: string } | undefined) => data)
  .handler(async ({ data: input }) => {
    const sql = await workspaceDb(input?.workspaceId);
    const wsId = input?.workspaceId ?? null;
    const rows = wsId
      ? await sql`
        SELECT l.*, u.name AS assignee_name, u.hue AS assignee_hue
        FROM leads l
        LEFT JOIN users u ON u.id = l.assignee_id
        WHERE l.workspace_id = ${wsId}
        ORDER BY l.updated_at DESC
      `
      : await sql`
        SELECT l.*, u.name AS assignee_name, u.hue AS assignee_hue
        FROM leads l
        LEFT JOIN users u ON u.id = l.assignee_id
        ORDER BY l.updated_at DESC
      `;
    return rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      company: r.company,
      companyType: r.company_type,
      address: r.address,
      contact: r.contact,
      email: r.email,
      phone: r.phone,
      industry: r.industry,
      interest: r.interest,
      value: Number(r.value || 0),
      probability: Number(r.probability || 0),
      stage: r.stage,
      stageData: r.stage_data || {},
      assigneeId: r.assignee_id,
      tags: r.tags || [],
      notes: r.notes,
      pendingValidation: Boolean(r.pending_validation),
      validated: Boolean(r.validated),
      updatedAt: "Just now",
      createdAt: r.created_at,
      assignee: {
        name: r.assignee_name || "Unassigned",
        initials: (r.assignee_name || "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
        hue: r.assignee_hue || 220
      }
    }));
  });

export const upsertLead = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string;
      workspaceId: string;
      company: string;
      companyType?: string;
      address?: string;
      contact: string;
      email?: string;
      phone?: string;
      industry?: string;
      interest?: string;
      value?: number;
      probability?: number;
      stage?: string;
      stageData?: Record<string, unknown>;
      assigneeId?: string;
      tags?: string[];
      notes?: string;
      pendingValidation?: boolean;
      validated?: boolean;
    }) => data,
  )
  .handler(async ({ data: input }) => {
    const sql = await workspaceDb(input.workspaceId);
    const id = input.id ?? `lead-${Date.now()}`;
    await sql`
      INSERT INTO leads (
        id, workspace_id, company, company_type, address, contact, email, phone,
        industry, interest, value, probability, stage, stage_data, assignee_id,
        tags, notes, pending_validation, validated, updated_at
      ) VALUES (
        ${id}, ${input.workspaceId}, ${input.company}, ${input.companyType ?? null},
        ${input.address ?? null}, ${input.contact}, ${input.email ?? null},
        ${input.phone ?? null}, ${input.industry ?? null}, ${input.interest ?? null},
        ${input.value ?? 0}, ${input.probability ?? 0}, ${input.stage ?? "new"},
        ${JSON.stringify(input.stageData ?? {})}, ${input.assigneeId ?? null},
        ${input.tags ?? []}, ${input.notes ?? null},
        ${input.pendingValidation ?? false}, ${input.validated ?? false}, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        company = EXCLUDED.company, company_type = EXCLUDED.company_type,
        address = EXCLUDED.address, contact = EXCLUDED.contact,
        email = EXCLUDED.email, phone = EXCLUDED.phone,
        industry = EXCLUDED.industry, interest = EXCLUDED.interest,
        value = EXCLUDED.value, probability = EXCLUDED.probability,
        stage = EXCLUDED.stage, stage_data = EXCLUDED.stage_data,
        assignee_id = EXCLUDED.assignee_id, tags = EXCLUDED.tags,
        notes = EXCLUDED.notes, pending_validation = EXCLUDED.pending_validation,
        validated = EXCLUDED.validated, updated_at = NOW()
    `;
    return { id };
  });

export const deleteLead = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data: input }) => {
    const sql = await adminDb();
    await sql`DELETE FROM leads WHERE id = ${input.id}`;
    return { ok: true };
  });

// --- Meetings -----------------------------------------------------------------

export const getMeetings = createServerFn({ method: "GET" })
  .inputValidator((data: { workspaceId?: string } | undefined) => data)
  .handler(async ({ data: input }) => {
    const sql = await workspaceDb(input?.workspaceId);
    const wsId = input?.workspaceId ?? null;
    const rows = await sql`
      SELECT * FROM meetings
      WHERE (${wsId}::text IS NULL OR workspace_id = ${wsId})
      ORDER BY scheduled_date ASC, scheduled_time ASC
    `;
    return rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      leadId: r.lead_id,
      partnerName: r.company,
      date: dateOnly(r.scheduled_date) ?? "",
      time: r.scheduled_time,
      location: r.location,
      format: r.format,
      status: r.status,
      assignedOcId: r.assigned_oc_id,
      assignedOcName: r.assigned_oc_name || "Unassigned",
      assignedOcHue: r.assigned_oc_hue || 220,
      notes: r.notes,
    }));
  });

export const upsertMeeting = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string;
      workspaceId: string;
      leadId?: string;
      company: string;
      scheduledDate: string;
      scheduledTime?: string;
      location?: string;
      format?: string;
      status?: string;
      assignedOcId?: string;
      assignedOcName?: string;
      assignedOcHue?: number;
      notes?: string;
    }) => data,
  )
  .handler(async ({ data: input }) => {
    const sql = await workspaceDb(input.workspaceId);
    const id = input.id ?? `mtg-${Date.now()}`;
    await sql`
      INSERT INTO meetings (
        id, workspace_id, lead_id, company, scheduled_date, scheduled_time,
        location, format, status, assigned_oc_id, assigned_oc_name, assigned_oc_hue, notes
      ) VALUES (
        ${id}, ${input.workspaceId}, ${input.leadId ?? null}, ${input.company},
        ${input.scheduledDate}, ${input.scheduledTime ?? null}, ${input.location ?? null},
        ${input.format ?? null}, ${input.status ?? "scheduled"},
        ${input.assignedOcId ?? null}, ${input.assignedOcName ?? null},
        ${input.assignedOcHue ?? null}, ${input.notes ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        company = EXCLUDED.company, scheduled_date = EXCLUDED.scheduled_date,
        scheduled_time = EXCLUDED.scheduled_time, location = EXCLUDED.location,
        format = EXCLUDED.format, status = EXCLUDED.status,
        assigned_oc_id = EXCLUDED.assigned_oc_id,
        assigned_oc_name = EXCLUDED.assigned_oc_name,
        assigned_oc_hue = EXCLUDED.assigned_oc_hue,
        notes = EXCLUDED.notes
    `;
    return { id };
  });

export const deleteMeeting = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data: input }) => {
    const sql = await authedDb();
    await sql`DELETE FROM meetings WHERE id = ${input.id}`;
    return { ok: true };
  });

export const getCalendarEvents = createServerFn({ method: "GET" })
  .inputValidator((data: { workspaceId?: string } | undefined) => data)
  .handler(async ({ data: input }) => {
    const sql = await workspaceDb(input?.workspaceId);
    const wsId = input?.workspaceId ?? null;
    const rows = (await sql`
      SELECT * FROM calendar_events
      WHERE (${wsId}::text IS NULL OR workspace_id = ${wsId})
      ORDER BY date ASC, time ASC
    `) as any[];
    // date is timestamptz (a Date object over the wire) — normalize to a string
    // so the client can slice/compare it safely.
    return rows.map((r: any) => ({ ...r, date: dateOnly(r.date) ?? "" }));
  });

export const upsertCalendarEvent = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string;
      workspaceId: string;
      areaId?: string;
      title: string;
      date: string;
      time?: string;
      type?: string;
      sourceId?: string;
      sourceTable?: string;
      description?: string;
      assignedTo?: string;
    }) => data,
  )
  .handler(async ({ data: input }) => {
    const sql = await workspaceDb(input.workspaceId);
    const id = input.id ?? `cal-${Date.now()}`;
    await sql`
      INSERT INTO calendar_events (
        id, workspace_id, area_id, title, date, time, type, source_id, source_table, description, assigned_to
      ) VALUES (
        ${id}, ${input.workspaceId}, ${input.areaId ?? null}, ${input.title},
        ${input.date}, ${input.time ?? null}, ${input.type ?? "event"},
        ${input.sourceId ?? null}, ${input.sourceTable ?? null},
        ${input.description ?? null}, ${input.assignedTo ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        date = EXCLUDED.date,
        time = EXCLUDED.time,
        type = EXCLUDED.type,
        area_id = EXCLUDED.area_id,
        source_id = EXCLUDED.source_id,
        source_table = EXCLUDED.source_table,
        description = EXCLUDED.description,
        assigned_to = EXCLUDED.assigned_to
    `;
    return { id };
  });

export const deleteCalendarEvent = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data: input }) => {
    const sql = await adminDb();
    await sql`DELETE FROM calendar_events WHERE id = ${input.id}`;
    return { ok: true };
  });

// --- Tasks (Marketing / Content / DXP) ----------------------------------------


export const getTasks = createServerFn({ method: "GET" })
  .inputValidator((data: { workspaceId?: string; areaId?: string } | undefined) => data)
  .handler(async ({ data: input }) => {
    const sql = await workspaceDb(input?.workspaceId);
    const wsId = input?.workspaceId ?? null;
    const aId = input?.areaId ?? null;
    const rows = await sql`
      SELECT t.*, u.name AS assignee_name, u.hue AS assignee_hue
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assignee_id
      WHERE (${wsId}::text IS NULL OR t.workspace_id = ${wsId})
        AND (${aId}::text  IS NULL OR t.area_id      = ${aId})
      ORDER BY t.updated_at DESC
    `;
    return rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      areaId: r.area_id,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      dueDate: dateOnly(r.due_date),
      assigneeId: r.assignee_id,
      tags: r.tags || [],
      reviewLink: r.review_link,
      rejectionReason: r.rejection_reason,
      comments: Number(r.comments || 0),
      assigneeName: r.assignee_name,
      assigneeHue: r.assignee_hue,
    }));
  });

export const upsertTask = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string;
      workspaceId: string;
      areaId: string;
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: string;
      assigneeId?: string;
      tags?: string[];
      reviewLink?: string;
      rejectionReason?: string;
    }) => data,
  )
  .handler(async ({ data: input }) => {
    const sql = await workspaceDb(input.workspaceId);
    const id = input.id ?? `task-${Date.now()}`;
    await sql`
      INSERT INTO tasks (
        id, workspace_id, area_id, title, description, status, priority,
        due_date, assignee_id, tags, review_link, rejection_reason, updated_at
      ) VALUES (
        ${id}, ${input.workspaceId}, ${input.areaId}, ${input.title},
        ${input.description ?? null}, ${input.status ?? "todo"}, ${input.priority ?? "medium"},
        ${input.dueDate ?? null}, ${input.assigneeId ?? null}, ${input.tags ?? []},
        ${input.reviewLink ?? null}, ${input.rejectionReason ?? null}, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title, description = EXCLUDED.description,
        status = EXCLUDED.status, priority = EXCLUDED.priority,
        due_date = EXCLUDED.due_date, assignee_id = EXCLUDED.assignee_id,
        tags = EXCLUDED.tags, review_link = EXCLUDED.review_link,
        rejection_reason = EXCLUDED.rejection_reason, updated_at = NOW()
    `;
    return { id };
  });

// --- PR People ----------------------------------------------------------------

export const getPrPeople = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { workspaceId?: string; type?: "speaker" | "media" } | undefined) => data,
  )
  .handler(async ({ data: input }) => {
    const sql = await workspaceDb(input?.workspaceId);
    await sql`ALTER TABLE pr_people ADD COLUMN IF NOT EXISTS biography TEXT`;
    await sql`ALTER TABLE pr_people ADD COLUMN IF NOT EXISTS image_url TEXT`;
    await sql`ALTER TABLE pr_people ADD COLUMN IF NOT EXISTS linkedin_url TEXT`;
    await sql`ALTER TABLE pr_people ADD COLUMN IF NOT EXISTS instagram_url TEXT`;
    await sql`ALTER TABLE pr_people ADD COLUMN IF NOT EXISTS talk_id TEXT`;
    await sql`ALTER TABLE pr_people ADD COLUMN IF NOT EXISTS location TEXT`;

    const wsId = input?.workspaceId ?? null;
    const type = input?.type ?? null;
    const rows = await sql`
      SELECT * FROM pr_people
      WHERE (${wsId}::text IS NULL OR workspace_id = ${wsId})
        AND (${type}::text IS NULL OR type = ${type})
      ORDER BY updated_at DESC
    `;
    return rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      type: r.type,
      name: r.name,
      organization: r.organization,
      email: r.email,
      phone: r.phone,
      topic: r.topic,
      mediaType: r.media_type,
      stage: r.stage,
      stageNotes: r.stage_notes || {},
      confirmedDate: dateOnly(r.confirmed_date),
      confirmedTime: r.confirmed_time,
      rejectedReason: r.rejected_reason,
      assigneeId: r.assignee_id,
      biography: r.biography,
      imageUrl: r.image_url,
      linkedinUrl: r.linkedin_url,
      instagramUrl: r.instagram_url,
      talkId: r.talk_id,
      location: r.location,
    }));
  });

export const upsertPrPerson = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string;
      workspaceId: string;
      type: "speaker" | "media";
      name: string;
      organization?: string;
      email?: string;
      phone?: string;
      topic?: string;
      mediaType?: string;
      stage?: string;
      stageNotes?: Record<string, string>;
      confirmedDate?: string;
      confirmedTime?: string;
      rejectedReason?: string;
      assigneeId?: string;
      biography?: string;
      imageUrl?: string;
      linkedinUrl?: string;
      instagramUrl?: string;
      talkId?: string;
      location?: string;
    }) => data,
  )
  .handler(async ({ data: input }) => {
    const sql = await workspaceDb(input.workspaceId);
    await sql`ALTER TABLE pr_people ADD COLUMN IF NOT EXISTS biography TEXT`;
    await sql`ALTER TABLE pr_people ADD COLUMN IF NOT EXISTS image_url TEXT`;
    await sql`ALTER TABLE pr_people ADD COLUMN IF NOT EXISTS linkedin_url TEXT`;
    await sql`ALTER TABLE pr_people ADD COLUMN IF NOT EXISTS instagram_url TEXT`;
    await sql`ALTER TABLE pr_people ADD COLUMN IF NOT EXISTS talk_id TEXT`;
    await sql`ALTER TABLE pr_people ADD COLUMN IF NOT EXISTS location TEXT`;

    const id = input.id ?? `pr-${Date.now()}`;
    await sql`
      INSERT INTO pr_people (
        id, workspace_id, type, name, organization, email, phone,
        topic, media_type, stage, stage_notes, confirmed_date, confirmed_time,
        rejected_reason, assignee_id, biography, image_url, linkedin_url, instagram_url, talk_id, location, updated_at
      ) VALUES (
        ${id}, ${input.workspaceId}, ${input.type}, ${input.name},
        ${input.organization ?? null}, ${input.email ?? null}, ${input.phone ?? null},
        ${input.topic ?? null}, ${input.mediaType ?? null}, ${input.stage ?? "contact"},
        ${JSON.stringify(input.stageNotes ?? {})},
        ${input.confirmedDate ?? null}, ${input.confirmedTime ?? null},
        ${input.rejectedReason ?? null}, ${input.assigneeId ?? null},
        ${input.biography ?? null}, ${input.imageUrl ?? null},
        ${input.linkedinUrl ?? null}, ${input.instagramUrl ?? null},
        ${input.talkId ?? null}, ${input.location ?? null}, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, organization = EXCLUDED.organization,
        email = EXCLUDED.email, phone = EXCLUDED.phone,
        topic = EXCLUDED.topic, media_type = EXCLUDED.media_type,
        stage = EXCLUDED.stage, stage_notes = EXCLUDED.stage_notes,
        confirmed_date = EXCLUDED.confirmed_date, confirmed_time = EXCLUDED.confirmed_time,
        rejected_reason = EXCLUDED.rejected_reason,
        assignee_id = EXCLUDED.assignee_id,
        biography = EXCLUDED.biography,
        image_url = EXCLUDED.image_url,
        linkedin_url = EXCLUDED.linkedin_url,
        instagram_url = EXCLUDED.instagram_url,
        talk_id = EXCLUDED.talk_id,
        location = EXCLUDED.location,
        updated_at = NOW()
    `;
    return { id };
  });

// --- Logistics ----------------------------------------------------------------

export const getLogisticsItems = createServerFn({ method: "GET" })
  .inputValidator((data: { workspaceId?: string } | undefined) => data)
  .handler(async ({ data: input }) => {
    const sql = await workspaceDb(input?.workspaceId);
    const wsId = input?.workspaceId ?? null;
    const rows = await sql`
      SELECT * FROM logistics_items
      WHERE (${wsId}::text IS NULL OR workspace_id = ${wsId})
      ORDER BY updated_at DESC
    `;
    return rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      keyAreaId: r.key_area_id,
      company: r.company,
      contact: r.contact,
      email: r.email,
      phone: r.phone,
      itemType: r.item_type,
      quantity: Number(r.quantity || 1),
      unit: r.unit,
      notes: r.notes,
      stage: r.stage,
      validated: Boolean(r.validated),
      pendingValidation: Boolean(r.pending_validation),
      tags: r.tags || [],
    }));
  });

export const upsertLogisticsItem = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string;
      workspaceId: string;
      keyAreaId?: string;
      company: string;
      contact?: string;
      email?: string;
      phone?: string;
      itemType: string;
      quantity?: number;
      unit?: string;
      notes?: string;
      stage?: string;
      validated?: boolean;
      pendingValidation?: boolean;
      tags?: string[];
    }) => data,
  )
  .handler(async ({ data: input }) => {
    const sql = await workspaceDb(input.workspaceId);
    const id = input.id ?? `log-${Date.now()}`;
    await sql`
      INSERT INTO logistics_items (
        id, workspace_id, key_area_id, company, contact, email, phone,
        item_type, quantity, unit, notes, stage, validated, pending_validation, tags, updated_at
      ) VALUES (
        ${id}, ${input.workspaceId}, ${input.keyAreaId ?? null},
        ${input.company}, ${input.contact ?? null}, ${input.email ?? null}, ${input.phone ?? null},
        ${input.itemType}, ${input.quantity ?? 1}, ${input.unit ?? "units"},
        ${input.notes ?? null}, ${input.stage ?? "new"},
        ${input.validated ?? false}, ${input.pendingValidation ?? false},
        ${input.tags ?? []}, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        company = EXCLUDED.company, contact = EXCLUDED.contact,
        email = EXCLUDED.email, phone = EXCLUDED.phone,
        item_type = EXCLUDED.item_type, quantity = EXCLUDED.quantity,
        unit = EXCLUDED.unit, notes = EXCLUDED.notes, stage = EXCLUDED.stage,
        validated = EXCLUDED.validated, pending_validation = EXCLUDED.pending_validation,
        tags = EXCLUDED.tags, updated_at = NOW()
    `;
    return { id };
  });

// --- PM Tasks ----------------------------------------------------------------

export const getPmTasks = createServerFn({ method: "GET" })
  .inputValidator((data: { workspaceId?: string } | undefined) => data)
  .handler(async ({ data: input }) => {
    const sql = await workspaceDb(input?.workspaceId);
    const wsId = input?.workspaceId ?? null;
    const rows = await sql`
      SELECT * FROM pm_tasks
      WHERE (${wsId}::text IS NULL OR workspace_id = ${wsId})
      ORDER BY created_at DESC
    `;
    return rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      title: r.title,
      description: r.description,
      priority: r.priority,
      status: r.status,
      dueDate: dateOnly(r.due_date),
      assignedTo: r.assigned_to,
      assignedToName: r.assigned_to_name,
      assignedToHue: r.assigned_to_hue,
      createdBy: r.created_by,
      publishedAt: r.published_at,
    }));
  });

export const upsertPmTask = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string;
      workspaceId: string;
      title: string;
      description?: string;
      priority?: string;
      status?: string;
      dueDate?: string;
      assignedTo?: string;
      assignedToName?: string;
      assignedToHue?: number;
      createdBy?: string;
      publishedAt?: string;
    }) => data,
  )
  .handler(async ({ data: input }) => {
    const sql = await workspaceDb(input.workspaceId);
    const id = input.id ?? `pt-${Date.now()}`;
    // created_by references users(id), but members live in localStorage (the DB
    // users table stays empty), so that FK rejects every insert. Drop it — it's
    // incompatible with how this app manages accounts. Idempotent.
    await sql`ALTER TABLE pm_tasks DROP CONSTRAINT IF EXISTS pm_tasks_created_by_fkey`;
    await sql`
      INSERT INTO pm_tasks (
        id, workspace_id, title, description, priority, status, due_date,
        assigned_to, assigned_to_name, assigned_to_hue, created_by, published_at
      ) VALUES (
        ${id}, ${input.workspaceId}, ${input.title}, ${input.description ?? null},
        ${input.priority ?? "medium"}, ${input.status ?? "draft"},
        ${input.dueDate ?? null}, ${input.assignedTo ?? null},
        ${input.assignedToName ?? null}, ${input.assignedToHue ?? null},
        ${input.createdBy ?? null}, ${input.publishedAt ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title, description = EXCLUDED.description,
        priority = EXCLUDED.priority, status = EXCLUDED.status,
        due_date = EXCLUDED.due_date, assigned_to = EXCLUDED.assigned_to,
        assigned_to_name = EXCLUDED.assigned_to_name,
        assigned_to_hue = EXCLUDED.assigned_to_hue, published_at = EXCLUDED.published_at
    `;
    return { id };
  });

// --- Event Dates --------------------------------------------------------------

export const getEventDates = createServerFn({ method: "GET" }).handler(
  async () => {
    const sql = await authedDb();
    const rows = await sql`SELECT workspace_id, event_date::TEXT FROM event_dates`;
    return Object.fromEntries(
      (rows as { workspace_id: string; event_date: string }[]).map((r) => [
        r.workspace_id,
        r.event_date,
      ]),
    ) as Record<string, string>;
  },
);

export const setEventDate = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { workspaceId: string; date: string; updatedBy?: string }) => data,
  )
  .handler(async ({ data: input }) => {
    const sql = await authedDb();
    await sql`
      INSERT INTO event_dates (workspace_id, event_date, updated_by, updated_at)
      VALUES (${input.workspaceId}, ${input.date}, ${input.updatedBy ?? null}, NOW())
      ON CONFLICT (workspace_id) DO UPDATE SET
        event_date = EXCLUDED.event_date,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
    `;
    return { ok: true };
  });

// --- Notifications ------------------------------------------------------------

// Returns every notification the given user should see: those targeted directly
// at them, plus role-wide broadcasts (target_user_id NULL) for their role —
// admins see admin broadcasts across all workspaces, everyone else only within
// their own workspace. Mirrors the client-side visibility rules.
export const getNotifications = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { userId: string; role?: string; workspaceId?: string | null }) => data,
  )
  .handler(async () => {
    // Identity comes from the session, NOT client input — a caller can only ever
    // read their own notifications (direct + role-broadcast for their workspace).
    const me = await requireUser();
    const sql = getDb();
    const wsId = me.workspaceId ?? null;
    const rows = (await sql`
      SELECT * FROM notifications
      WHERE target_user_id = ${me.id}
         OR (
           target_user_id IS NULL
           AND target_role = ${me.role}
           AND (${me.role}::text = 'admin' OR workspace_id = ${wsId})
         )
      ORDER BY created_at DESC
      LIMIT 100
    `) as any[];
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      message: r.message,
      leadId: r.lead_id ?? undefined,
      taskId: r.task_id ?? undefined,
      targetRole: r.target_role,
      targetUserId: r.target_user_id,
      workspaceId: r.workspace_id,
      read: Boolean(r.read),
      createdAt:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at),
    }));
  });

export const addNotification = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string;
      type: string;
      title: string;
      message: string;
      leadId?: string | null;
      taskId?: string | null;
      targetRole?: string | null;
      targetUserId?: string | null;
      workspaceId: string;
    }) => data,
  )
  .handler(async ({ data: input }) => {
    const sql = await authedDb();
    const id = input.id ?? `notif-${Date.now()}`;
    try {
      await sql`
        INSERT INTO notifications (
          id, type, title, message, lead_id, task_id,
          target_role, target_user_id, workspace_id, read
        ) VALUES (
          ${id}, ${input.type}, ${input.title}, ${input.message},
          ${input.leadId ?? null}, ${input.taskId ?? null},
          ${input.targetRole ?? null}, ${input.targetUserId ?? null},
          ${input.workspaceId}, FALSE
        )
        ON CONFLICT (id) DO NOTHING
      `;
      return { id, ok: true };
    } catch {
      // A stale lead_id/workspace_id reference shouldn't crash the caller.
      return { id, ok: false };
    }
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data: input }) => {
    const sql = await authedDb();
    await sql`UPDATE notifications SET read = TRUE WHERE id = ${input.id}`;
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { userId: string; role?: string; workspaceId?: string | null }) => data,
  )
  .handler(async () => {
    // Identity from the session — a caller can only mark their own as read.
    const me = await requireUser();
    const sql = getDb();
    const wsId = me.workspaceId ?? null;
    await sql`
      UPDATE notifications SET read = TRUE
      WHERE read = FALSE
        AND (
          target_user_id = ${me.id}
          OR (
            target_user_id IS NULL
            AND target_role = ${me.role}
            AND (${me.role}::text = 'admin' OR workspace_id = ${wsId})
          )
        )
    `;
    return { ok: true };
  });

// --- Users -------------------------------------------------------------------

export const getUserByEmail = createServerFn({ method: "GET" })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data: input }) => {
    const sql = await adminDb();
    const rows = await sql`SELECT * FROM users WHERE email = ${input.email} LIMIT 1`;
    return (rows as unknown[])[0] ?? null;
  });

export const upsertUser = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string;
      name: string;
      email: string;
      passwordHash: string;
      role: string;
      workspaceId?: string;
      keyAreaId?: string;
      hue?: number;
      status?: string;
    }) => data,
  )
  .handler(async ({ data: input }) => {
    const sql = await adminDb();
    await sql`
      INSERT INTO users (id, name, email, password_hash, role, workspace_id, key_area_id, hue, status)
      VALUES (
        ${input.id ?? `user-${Date.now()}`}, ${input.name}, ${input.email},
        ${input.passwordHash}, ${input.role},
        ${input.workspaceId ?? null}, ${input.keyAreaId ?? null},
        ${input.hue ?? 220}, ${input.status ?? "active"}
      )
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name, role = EXCLUDED.role,
        workspace_id = EXCLUDED.workspace_id, key_area_id = EXCLUDED.key_area_id,
        hue = EXCLUDED.hue, status = EXCLUDED.status
    `;
    return { ok: true };
  });

// --- Activity Log -------------------------------------------------------------

export const addActivityLog = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      workspaceId: string;
      areaId?: string;
      who: string;
      whoHue?: number;
      action: string;
      target?: string;
      type?: string;
      tone?: string;
    }) => data,
  )
  .handler(async ({ data: input }) => {
    const sql = await authedDb();
    await sql`
      INSERT INTO activity_log (workspace_id, area_id, who, who_hue, action, target, type, tone)
      VALUES (
        ${input.workspaceId}, ${input.areaId ?? null}, ${input.who},
        ${input.whoHue ?? null}, ${input.action}, ${input.target ?? null},
        ${input.type ?? null}, ${input.tone ?? null}
      )
    `;
    return { ok: true };
  });

// --- Event Goals --------------------------------------------------------------

export const getEventGoals = createServerFn({ method: "GET" }).handler(
  async () => {
    const sql = await authedDb();
    await sql`
      CREATE TABLE IF NOT EXISTS event_goals (
        workspace_id TEXT PRIMARY KEY,
        goal NUMERIC NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    const rows = await sql`SELECT workspace_id, goal::TEXT FROM event_goals`;
    return Object.fromEntries(
      (rows as { workspace_id: string; goal: string }[]).map((r) => [
        r.workspace_id,
        Number(r.goal),
      ]),
    ) as Record<string, number>;
  },
);

export const setEventGoal = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { workspaceId: string; goal: number }) => data,
  )
  .handler(async ({ data: input }) => {
    const sql = await authedDb();
    await sql`
      CREATE TABLE IF NOT EXISTS event_goals (
        workspace_id TEXT PRIMARY KEY,
        goal NUMERIC NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      INSERT INTO event_goals (workspace_id, goal, updated_at)
      VALUES (${input.workspaceId}, ${input.goal}, NOW())
      ON CONFLICT (workspace_id) DO UPDATE SET
        goal = EXCLUDED.goal,
        updated_at = NOW()
    `;
    return { ok: true };
  });

// --- Talks & Panels -----------------------------------------------------------

export const getTalks = createServerFn({ method: "GET" })
  .inputValidator((data: { workspaceId?: string } | undefined) => data)
  .handler(async ({ data: input }) => {
    const sql = await workspaceDb(input?.workspaceId);
    await sql`
      CREATE TABLE IF NOT EXISTS event_talks (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    const wsId = input?.workspaceId ?? null;
    const rows = wsId
      ? await sql`SELECT * FROM event_talks WHERE workspace_id = ${wsId} ORDER BY created_at ASC`
      : await sql`SELECT * FROM event_talks ORDER BY created_at ASC`;
    return rows.map((r: any) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      name: r.name,
      type: r.type,
      createdAt: r.created_at,
    }));
  });

export const upsertTalk = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { id?: string; workspaceId: string; name: string; type: "talk" | "panel" }) => data,
  )
  .handler(async ({ data: input }) => {
    const sql = await workspaceDb(input.workspaceId);
    await sql`
      CREATE TABLE IF NOT EXISTS event_talks (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    const id = input.id ?? `talk-${Date.now()}`;
    await sql`
      INSERT INTO event_talks (id, workspace_id, name, type, created_at)
      VALUES (${id}, ${input.workspaceId}, ${input.name}, ${input.type}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type
    `;
    return { id };
  });

export const deleteTalk = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data: input }) => {
    const sql = await adminDb();
    await sql`DELETE FROM event_talks WHERE id = ${input.id}`;
    return { ok: true };
  });
