-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5F: magazine graphics content table
-- Migration: 0007_magazine_graphics
--
-- Paste into Supabase SQL Editor → Run.
--
-- Third magazine content slice (after 0005 outreach, 0006 spreads). Graphics are
-- the design deliverables. One row per graphic, project-scoped, cascade-deleted.
--
-- Two owned arrays stored as JSONB (read forward off their own graphic, never
-- reverse-queried), mirroring spreads.links / products.usps:
--   • image_ids    — string[] of media/IndexedDB keys (SOFT refs to images)
--   • result_links — VisualResultLink[] [{id,label,url}]
--
-- IMAGE BOUNDARY: preview_image_id and image_ids are SOFT references (IndexedDB
-- keys) ONLY. Image BYTES are never stored here — they live in IndexedDB and sync
-- via the existing media table. This table holds keys, not blobs.
--
-- Read-first + dual-write (same pattern as 0005/0006). Empty table → reads fall
-- back to the local store.
--
-- Notes:
--   • id reuses the local Graphic.id (UUID for app-created graphics; seed/legacy
--     non-UUID ids stay local-only and are skipped by the sync).
--   • project_id FKs projects(id) ON DELETE CASCADE (same as products / outreach / spreads).
--   • status is text + CHECK, pinned to the GraphicStatus domain.
--   • preview_image_id / article_id / visual_project_id / mood_tile_id are NULLABLE
--     text soft refs (no FK); the app maps '' ↔ NULL.
--   • dropbox_link is the legacy single asset link (migrated into result_links);
--     persisted for round-trip fidelity.
--   • sort_order is BIGINT: Graphic.order is Date.now()-based (~1.7e12) > int4 max.
--   • RLS intentionally deferred (consistent with the other content tables).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_graphics (
  id                uuid        PRIMARY KEY,
  project_id        uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title             text        NOT NULL DEFAULT '',
  format_detail     text        NOT NULL DEFAULT '',     -- free text: "A4 portrait · Print", …
  assignee          text        NOT NULL DEFAULT '',
  status            text        NOT NULL DEFAULT 'brief'
                      CHECK (status IN ('brief', 'design', 'review', 'final')),
  preview_image_id  text,                                -- soft ref (media/IndexedDB key), nullable
  image_ids         jsonb       NOT NULL DEFAULT '[]'::jsonb,  -- string[] of media/IndexedDB keys (soft refs)
  brief             text        NOT NULL DEFAULT '',
  notes             text        NOT NULL DEFAULT '',
  article_id        text,                                -- soft backlink to an Article, nullable (no FK)
  visual_project_id text,                                -- soft backlink to a VisualProject, nullable (no FK)
  mood_tile_id      text,                                -- soft link to a MoodTile, nullable (no FK)
  dropbox_link      text        NOT NULL DEFAULT '',     -- legacy single asset link (migrated into result_links)
  result_links      jsonb       NOT NULL DEFAULT '[]'::jsonb,  -- VisualResultLink[] [{id,label,url}]
  sort_order        bigint      NOT NULL DEFAULT 0,      -- mirrors Graphic.order (Date.now()-based)
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS magazine_graphics_project_idx ON magazine_graphics (project_id);

COMMENT ON TABLE  magazine_graphics                  IS 'Magazine graphics / design deliverables (Phase 5F). One row per graphic; project-scoped, cascade-deleted with the project.';
COMMENT ON COLUMN magazine_graphics.preview_image_id IS 'SOFT reference to a media/IndexedDB image key (no FK). Image bytes live in IndexedDB / the media table — never here.';
COMMENT ON COLUMN magazine_graphics.image_ids        IS 'string[] of media/IndexedDB keys (SOFT refs) — JSONB. Bytes are not stored here.';
COMMENT ON COLUMN magazine_graphics.result_links     IS 'Owned ordered VisualResultLink[] [{id,label,url}] — JSONB, not normalized.';
COMMENT ON COLUMN magazine_graphics.sort_order       IS 'Mirrors local Graphic.order (Date.now()-based) — BIGINT to fit.';
