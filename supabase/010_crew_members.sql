-- Phase E6 — normalized crew_members table
--
-- Crew members are per-project entities referenced by ID from one soft-ref
-- location:
--
--   tasks.assigned_to TEXT — soft ref; already synced via useTaskSync.
--     No FK upgrade needed: the tasks table already holds the crew member ID
--     as a text field and the UI resolves names via local lookup.
--
-- No image column (crew cards do not have photos).
-- No RLS, consistent with all other tables in this migration set.
-- Depends on: 001_initial_schema.sql (projects table).

CREATE TABLE IF NOT EXISTS crew_members (
  id         uuid        PRIMARY KEY,
  project_id uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       text        NOT NULL DEFAULT '',
  role       text        NOT NULL DEFAULT '',
  contact    text        NOT NULL DEFAULT '',
  notes      text        NOT NULL DEFAULT '',
  sort_order bigint      NOT NULL DEFAULT 0,   -- array-index-based order; no reorder UI yet
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crew_members_project_idx ON crew_members (project_id);
