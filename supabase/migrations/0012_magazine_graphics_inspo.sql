-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5K: magazine graphics inspiration tiles content table
-- Migration: 0012_magazine_graphics_inspo
--
-- Paste into Supabase SQL Editor → Run.
--
-- Eighth magazine content slice. Graphics inspo items are the Graphics section's
-- inspiration board (kept separate from the graphics deliverables). One row per item,
-- project-scoped, cascade-deleted with the project. Near-identical to mood tiles (0011).
--
-- IMAGE BOUNDARY: image_id is a SOFT reference (IndexedDB/media key) ONLY. Image bytes
-- are never stored here — they live in IndexedDB and sync via the existing media table.
-- '' until an image is uploaded.
--
-- Flat columns only; this entity has NO app-level updatedAt (only created_at) and no
-- reorder action. Read-first + dual-write (same pattern as 0005–0011). Empty table →
-- reads fall back to the local store.
--
-- Notes:
--   • id reuses the local GraphicsInspoItem.id (UUID for app-created; seed/legacy
--     non-UUID ids stay local-only and are skipped by the sync).
--   • project_id FKs projects(id) ON DELETE CASCADE (same as the sibling tables).
--   • image_id is text, '' preserved exactly (no '' ↔ null) — soft ref, no FK.
--   • source_url is free text (optional link to where the inspiration came from).
--   • sort_order is BIGINT (mirrors GraphicsInspoItem.order, Date.now()-based).
--   • RLS intentionally deferred (consistent with the other content tables).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_graphics_inspo (
  id          uuid        PRIMARY KEY,
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  image_id    text        NOT NULL DEFAULT '',     -- soft ref (IndexedDB/media key); '' if not uploaded
  caption     text        NOT NULL DEFAULT '',
  source_url  text        NOT NULL DEFAULT '',     -- optional link to the inspiration source
  sort_order  bigint      NOT NULL DEFAULT 0,      -- mirrors GraphicsInspoItem.order (Date.now()-based)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()   -- DB write marker (no app updatedAt on this entity)
);

CREATE INDEX IF NOT EXISTS magazine_graphics_inspo_project_idx ON magazine_graphics_inspo (project_id);

COMMENT ON TABLE  magazine_graphics_inspo          IS 'Magazine Graphics inspiration board tiles (Phase 5K). One row per item; project-scoped, cascade-deleted.';
COMMENT ON COLUMN magazine_graphics_inspo.image_id IS 'SOFT reference to a media/IndexedDB image key (no FK). Image bytes live in IndexedDB / the media table — never here. '''' if not uploaded.';
COMMENT ON COLUMN magazine_graphics_inspo.sort_order IS 'Mirrors local GraphicsInspoItem.order (Date.now()-based) — BIGINT to fit.';
