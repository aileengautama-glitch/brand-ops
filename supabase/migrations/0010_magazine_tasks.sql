-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5I: magazine tasks content table
-- Migration: 0010_magazine_tasks
--
-- Paste into Supabase SQL Editor → Run.
--
-- Sixth magazine content slice. Magazine tasks (MagazineTask) are the per-issue task
-- board. One row per task, project-scoped, cascade-deleted with the project.
--
-- SEPARATE from the shared `tasks` table (events/shoots, synced by useTaskSync).
-- Magazine tasks live in the local MagazineProject.tasks array and get their own
-- table here. The shared Task TYPE is reused only for its enum VALUES (status,
-- priority) in the CHECK constraints below — nothing in the shared task system is touched.
--
-- Flat columns only. Read-first + dual-write (same pattern as 0005–0009). Empty
-- table → reads fall back to the local store.
--
-- Notes:
--   • id reuses the local MagazineTask.id (UUID for app-created; seed/legacy
--     non-UUID ids stay local-only and are skipped by the sync).
--   • project_id FKs projects(id) ON DELETE CASCADE (same as the sibling tables).
--   • status / priority / link_type are text + CHECK, pinned to the shared
--     TaskStatus / Priority and the MagazineTaskLinkType domains.
--   • section is free-ish text (usually one of MAGAZINE_TASK_SECTIONS, but the app
--     type is plain string) → no CHECK.
--   • assigned_to / link_id are NULLABLE text soft refs (no FK); '' ↔ NULL.
--   • due_date is TEXT: it carries a meaningful '' sentinel, preserved exactly.
--   • sort_order is BIGINT (mirrors MagazineTask.order).
--   • app_updated_at holds the app entity's MagazineTask.updatedAt — DISTINCT from
--     updated_at (the DB write marker).
--   • RLS intentionally deferred (consistent with the other content tables).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_tasks (
  id             uuid        PRIMARY KEY,
  project_id     uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title          text        NOT NULL DEFAULT '',
  description    text        NOT NULL DEFAULT '',
  status         text        NOT NULL DEFAULT 'todo'
                   CHECK (status IN ('todo', 'in_progress', 'done')),
  priority       text        NOT NULL DEFAULT 'normal'
                   CHECK (priority IN ('low', 'normal', 'high')),
  due_date       text        NOT NULL DEFAULT '',     -- ISO date string, '' if unset
  assigned_to    text,                                -- soft ref (team/crew member), nullable (no FK)
  section        text        NOT NULL DEFAULT '',     -- '' | one of MAGAZINE_TASK_SECTIONS (free-ish)
  link_type      text        NOT NULL DEFAULT 'none'
                   CHECK (link_type IN ('none', 'article', 'visual', 'graphic', 'spread')),
  link_id        text,                                -- soft ref to the linked entity, nullable (no FK)
  sort_order     bigint      NOT NULL DEFAULT 0,      -- mirrors MagazineTask.order
  app_updated_at timestamptz NOT NULL DEFAULT now(),  -- app entity's MagazineTask.updatedAt
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()   -- DB write marker (distinct from app_updated_at)
);

CREATE INDEX IF NOT EXISTS magazine_tasks_project_idx ON magazine_tasks (project_id);

COMMENT ON TABLE  magazine_tasks                IS 'Magazine task board (Phase 5I). One row per MagazineTask; project-scoped, cascade-deleted. Separate from the shared tasks table (events/shoots).';
COMMENT ON COLUMN magazine_tasks.link_id        IS 'Soft ref to the linked content entity (article/visual/graphic/spread) within the project (no FK). '''' when link_type=none.';
COMMENT ON COLUMN magazine_tasks.app_updated_at IS 'The app entity MagazineTask.updatedAt. DISTINCT from updated_at (the DB write marker).';
