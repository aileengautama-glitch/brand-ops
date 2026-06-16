-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase E3: project_sections (shared editing for list/array slices)
-- Migration: 006_project_sections
--
-- Paste into Supabase SQL Editor → Run.
--
-- What this adds:
--   project_sections — one JSONB row per (project, section) holding an editable
--   ARRAY slice of a project that is now shared across devices:
--     • shoot_shot_list   → shots[]
--     • shoot_milestones  → milestones[]
--     • shoot_schedule    → dayOfSlots[]
--     • shoot_dday        → ddayRows[]
--     • event_milestones  → milestones[]
--     • event_schedule    → dayOfSlots[]
--
--   Bidirectional, like project_content (E2), but keyed by (project_id, section)
--   so each section gets its own row + updated_at → SECTION-LEVEL last-write-wins
--   (editing the shot list never clobbers a simultaneous schedule/brief edit).
--
--   content shape: { "items": [ ...full row objects... ] } — preserves row ids,
--   order, and links (e.g. ddayRows.modelIds / stylingId / imageId).
--
--   E2's project_content table is untouched.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_sections (
  project_id uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  section    text        NOT NULL,
  module     text        NOT NULL CHECK (module IN ('event', 'shoot')),
  content    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, section)
);

-- List all sections for a project in one query.
CREATE INDEX IF NOT EXISTS project_sections_project_idx ON project_sections (project_id);

COMMENT ON TABLE  project_sections         IS 'Bidirectional shared-editing store for array slices of a project (shot list, schedules, milestones, D-Day). One row per (project_id, section); section-level last-write-wins.';
COMMENT ON COLUMN project_sections.content IS 'JSON object { items: [...] } holding the full array for this section, preserving row ids / order / links.';
