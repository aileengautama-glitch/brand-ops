-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase E2: project_content (first shared-editing slice)
-- Migration: 005_project_content
--
-- Paste into Supabase SQL Editor → Run.
--
-- What this adds:
--   project_content — one JSONB row per project holding the editable text slice
--   that is now shared across devices:
--     • shoots: briefDetails + shootBrief (the brief authoring text)
--     • events: eventDate / venue / runTime (deck-facing metadata)
--
--   Unlike deck_snapshots (one-directional, read-only mirror), project_content
--   is BIDIRECTIONAL: edits on any device persist here and propagate back to
--   other devices (fetch on load + realtime). The Zustand store stays the
--   immediate local write target; this table is the cross-device source of
--   truth for these fields.
--
--   Conflict model: last-write-wins at document level (updated_at).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_content (
  project_id uuid        PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  module     text        NOT NULL CHECK (module IN ('event', 'shoot')),
  content    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  project_content         IS 'Bidirectional shared-editing store for the editable text slice of a project (shoot briefDetails+shootBrief; event metadata). Source of truth across devices; mirrored into Zustand locally.';
COMMENT ON COLUMN project_content.content IS 'EventContent | ShootContent (see lib/projectContent.ts), same field names as the project so it applies straight into the store.';
