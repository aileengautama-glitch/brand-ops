-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5J: magazine mood tiles content table
-- Migration: 0011_magazine_mood_tiles
--
-- Paste into Supabase SQL Editor → Run.
--
-- Seventh magazine content slice. Mood tiles are the Visual moodboard tiles. One row
-- per tile, project-scoped, cascade-deleted with the project.
--
-- IMAGE BOUNDARY: image_id is a SOFT reference (IndexedDB/media key) ONLY. Image bytes
-- are never stored here — they live in IndexedDB and sync via the existing media table.
-- '' for color-swatch-only tiles.
--
-- Flat columns only; this entity has NO app-level updatedAt (only created_at). Read-
-- first + dual-write (same pattern as 0005–0010). Empty table → reads fall back to local.
--
-- Notes:
--   • id reuses the local MoodTile.id (UUID for app-created; seed/legacy non-UUID ids
--     stay local-only and are skipped by the sync).
--   • project_id FKs projects(id) ON DELETE CASCADE (same as the sibling tables).
--   • image_id is text, '' preserved exactly (no '' ↔ null mapping) — soft ref, no FK.
--   • color is a hex string, '' if not set.
--   • sort_order is BIGINT (mirrors MoodTile.order, Date.now()-based).
--   • RLS intentionally deferred (consistent with the other content tables).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_mood_tiles (
  id          uuid        PRIMARY KEY,
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  image_id    text        NOT NULL DEFAULT '',     -- soft ref (IndexedDB/media key); '' for color swatches
  caption     text        NOT NULL DEFAULT '',
  color       text        NOT NULL DEFAULT '',     -- hex string e.g. '#C4B5A3', '' if not set
  sort_order  bigint      NOT NULL DEFAULT 0,      -- mirrors MoodTile.order (Date.now()-based)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()   -- DB write marker (no app updatedAt on this entity)
);

CREATE INDEX IF NOT EXISTS magazine_mood_tiles_project_idx ON magazine_mood_tiles (project_id);

COMMENT ON TABLE  magazine_mood_tiles          IS 'Magazine Visual moodboard tiles (Phase 5J). One row per tile; project-scoped, cascade-deleted.';
COMMENT ON COLUMN magazine_mood_tiles.image_id IS 'SOFT reference to a media/IndexedDB image key (no FK). Image bytes live in IndexedDB / the media table — never here. '''' for color-swatch tiles.';
COMMENT ON COLUMN magazine_mood_tiles.sort_order IS 'Mirrors local MoodTile.order (Date.now()-based) — BIGINT to fit.';
