-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase E1: deck snapshots (shareable-deck structure sync)
-- Migration: 004_deck_snapshots
--
-- Paste into Supabase SQL Editor → Run.
--
-- What this adds:
--   deck_snapshots — one denormalised JSONB row per project holding exactly
--   the structure the read-only Brief Deck share routes need to render
--   (title, metadata, moodboard items, schedule, contacts, shots, models, …).
--
--   This lets /share/* deck routes render on a fresh device using remote
--   structure + remote media, instead of depending on local Zustand/
--   localStorage.  The full project editor stays on local state — only the
--   deck-visible slice is mirrored here.
--
--   Written one-directionally (local → remote) by useDeckSnapshotSync; read
--   by the share routes via useRemoteDeckSnapshot.  No realtime needed.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deck_snapshots (
  -- One snapshot per project.  A project is either an event or a shoot, so
  -- project_id is a natural primary key.
  project_id uuid        PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,

  module     text        NOT NULL CHECK (module IN ('event', 'shoot')),

  -- Denormalised project name (also inside payload) for cheap listing/debug.
  name       text        NOT NULL DEFAULT '',

  -- The deck-visible slice of the project, shaped to mirror the project's
  -- own field names so share pages can render from it directly.
  payload    jsonb       NOT NULL,

  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  deck_snapshots         IS 'One denormalised JSONB snapshot per project of the structure the read-only Brief Deck share routes render. Written by useDeckSnapshotSync; read by useRemoteDeckSnapshot.';
COMMENT ON COLUMN deck_snapshots.payload IS 'Deck-visible slice of the project (EventDeckData | ShootDeckData), using the same field names as the project so the share page renders from local ?? remote.';
