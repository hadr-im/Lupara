-- ============================================================
-- Nucleus CRM — Neon PostgreSQL Schema
-- Run this entire file once in your Neon SQL editor
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- for gen_random_uuid()

-- ── 1. Workspaces ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id            TEXT PRIMARY KEY,             -- 'tedx' | 'meetup' | 'pmewa'
  name          TEXT NOT NULL,
  short         TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('event', 'department')),
  color         TEXT NOT NULL,                -- Tailwind gradient classes
  description   TEXT,
  progress      INTEGER NOT NULL DEFAULT 0,
  event_date    DATE,                         -- default seed date
  allowed_areas TEXT[],                       -- null = all areas allowed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Key Areas ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS key_areas (
  id    TEXT PRIMARY KEY,   -- 'sales' | 'marketing' | 'pr' | 'logistics' | etc.
  name  TEXT NOT NULL,
  color TEXT
);

-- ── 3. Users ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,               -- store bcrypt hash, never plaintext
  role          TEXT NOT NULL CHECK (role IN ('admin', 'ocp', 'ocvp', 'oc')),
  workspace_id  TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  key_area_id   TEXT REFERENCES key_areas(id) ON DELETE SET NULL,
  hue           INTEGER NOT NULL DEFAULT 220,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'inactive')),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. Admin-set Event Dates ─────────────────────────────────
-- Overrides workspaces.event_date when admin updates it
CREATE TABLE IF NOT EXISTS event_dates (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  event_date   DATE NOT NULL,
  updated_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. Leads (Sales CRM) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  workspace_id        TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  company             TEXT NOT NULL,
  company_type        TEXT,
  address             TEXT,
  contact             TEXT NOT NULL,
  email               TEXT,
  phone               TEXT,
  industry            TEXT,
  interest            TEXT,
  value               NUMERIC(12, 2) NOT NULL DEFAULT 0,   -- TND
  probability         INTEGER NOT NULL DEFAULT 0,
  stage               TEXT NOT NULL DEFAULT 'new'
                        CHECK (stage IN ('new','contacted','meeting','proposal','confirmed','lost')),
  stage_data          JSONB NOT NULL DEFAULT '{}',          -- typed transition payloads
  assignee_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
  tags                TEXT[] NOT NULL DEFAULT '{}',
  notes               TEXT,
  pending_validation  BOOLEAN NOT NULL DEFAULT FALSE,
  validated           BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_workspace ON leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage     ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_assignee  ON leads(assignee_id);

-- ── 6. Sales Meetings ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  workspace_id     TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id          TEXT REFERENCES leads(id) ON DELETE SET NULL,
  company          TEXT NOT NULL,
  scheduled_date   DATE NOT NULL,
  scheduled_time   TEXT,
  location         TEXT,
  format           TEXT CHECK (format IN ('google_meet', 'physical')),
  status           TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  assigned_oc_id   TEXT,
  assigned_oc_name TEXT,
  assigned_oc_hue  INTEGER,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_workspace ON meetings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date      ON meetings(scheduled_date);

-- ── 7. PR People (Public Relations CRM) ──────────────────────
CREATE TABLE IF NOT EXISTS pr_people (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  workspace_id     TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('speaker', 'media')),
  name             TEXT NOT NULL,
  organization     TEXT,
  email            TEXT,
  phone            TEXT,
  topic            TEXT,                   -- for speakers
  media_type       TEXT,                   -- for media
  stage            TEXT NOT NULL DEFAULT 'contact'
                     CHECK (stage IN ('contact','contacted','negotiation','confirmed','rejected')),
  stage_notes      JSONB NOT NULL DEFAULT '{}',   -- keyed by stage id
  confirmed_date   DATE,
  confirmed_time   TEXT,
  rejected_reason  TEXT,
  assignee_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pr_workspace ON pr_people(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pr_stage     ON pr_people(stage);

-- ── 8. Logistics Items ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS logistics_items (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  workspace_id        TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key_area_id         TEXT REFERENCES key_areas(id) ON DELETE SET NULL,
  company             TEXT NOT NULL,
  contact             TEXT,
  email               TEXT,
  phone               TEXT,
  item_type           TEXT NOT NULL,
  quantity            INTEGER NOT NULL DEFAULT 1,
  unit                TEXT NOT NULL DEFAULT 'units',
  notes               TEXT,
  stage               TEXT NOT NULL DEFAULT 'new'
                        CHECK (stage IN ('new','contacted','negotiating','confirmed','delivered')),
  validated           BOOLEAN NOT NULL DEFAULT FALSE,
  pending_validation  BOOLEAN NOT NULL DEFAULT FALSE,
  tags                TEXT[] NOT NULL DEFAULT '{}',
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logistics_workspace ON logistics_items(workspace_id);

-- ── 9. Tasks (Marketing / Content / DXP / etc.) ──────────────
CREATE TABLE IF NOT EXISTS tasks (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  workspace_id     TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  area_id          TEXT NOT NULL REFERENCES key_areas(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  status           TEXT NOT NULL DEFAULT 'todo'
                     CHECK (status IN ('todo','in_progress','review','done')),
  priority         TEXT NOT NULL DEFAULT 'medium'
                     CHECK (priority IN ('low','medium','high','critical','urgent')),
  due_date         DATE,
  assignee_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  tags             TEXT[] NOT NULL DEFAULT '{}',
  review_link      TEXT,
  rejection_reason TEXT,
  comments         INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_area      ON tasks(area_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status    ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee  ON tasks(assignee_id);

-- ── 10. PM Tasks (PM & EWA department) ───────────────────────
CREATE TABLE IF NOT EXISTS pm_tasks (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  workspace_id     TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  priority         TEXT NOT NULL DEFAULT 'medium'
                     CHECK (priority IN ('low','medium','high','urgent')),
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','todo','in_progress','done')),
  due_date         DATE,
  assigned_to      TEXT,               -- user id or 'all'
  assigned_to_name TEXT,
  assigned_to_hue  INTEGER,
  created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_tasks_workspace ON pm_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_status    ON pm_tasks(status);

-- ── 11. Notifications ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  type            TEXT NOT NULL,   -- 'lead_pending' | 'lead_validated' | 'task_assigned' | 'review_submitted' | ...
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  read            BOOLEAN NOT NULL DEFAULT FALSE,
  lead_id         TEXT REFERENCES leads(id) ON DELETE CASCADE,
  task_id         TEXT,            -- soft ref, may be tasks or pm_tasks
  target_role     TEXT,
  target_user_id  TEXT REFERENCES users(id) ON DELETE CASCADE,
  workspace_id    TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_target_user ON notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notif_workspace   ON notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notif_read        ON notifications(read);

-- ── 12. Activity Log ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  area_id      TEXT,
  who          TEXT NOT NULL,
  who_hue      INTEGER,
  action       TEXT NOT NULL,
  target       TEXT,
  type         TEXT,
  tone         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_workspace ON activity_log(workspace_id);

-- ── 13. Calendar Events ──────────────────────────────────────
-- Stores explicitly saved calendar entries (tasks/meetings auto-derive from their own tables)
CREATE TABLE IF NOT EXISTS calendar_events (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  area_id      TEXT,
  title        TEXT NOT NULL,
  date         DATE NOT NULL,
  time         TEXT,
  type         TEXT NOT NULL DEFAULT 'event'
                 CHECK (type IN ('deadline','meeting','event')),
  source_id    TEXT,     -- id of the originating lead / pr_person / task
  source_table TEXT,     -- 'leads' | 'pr_people' | 'tasks'
  description  TEXT,
  assigned_to  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cal_workspace ON calendar_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cal_date      ON calendar_events(date);

-- ── Seed: Workspaces ─────────────────────────────────────────
INSERT INTO workspaces (id, name, short, type, color, description, progress, event_date, allowed_areas)
VALUES
  ('tedx',   'TEDx',       'TX', 'event',      'from-fuchsia-500 to-rose-500',    'Annual flagship conference',       64, '2025-07-15', NULL),
  ('meetup', 'MeetupPro',  'MP', 'event',      'from-violet-500 to-indigo-500',   'Monthly community meetups',        42, '2025-06-28', NULL),
  ('pmewa',  'PM & EWA',   'PE', 'department', 'from-cyan-500 to-emerald-500',    'Project mgmt & event-wide admin',  78, NULL,         ARRAY['sales','pr'])
ON CONFLICT (id) DO NOTHING;

-- ── Seed: Key Areas ──────────────────────────────────────────
INSERT INTO key_areas (id, name)
VALUES
  ('dxp',       'DXP / Experience'),
  ('sales',     'Sales'),
  ('logistics', 'Logistics'),
  ('marketing', 'Marketing'),
  ('pr',        'Public Relations'),
  ('content',   'Content')
ON CONFLICT (id) DO NOTHING;
