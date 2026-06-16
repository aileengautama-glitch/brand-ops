-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5M: magazine writer hours content table
-- Migration: 0014_magazine_writer_hours
--
-- Paste into Supabase SQL Editor → Run.
--
-- Tenth magazine content slice — and the FIRST of the writing-workspace arrays. Writer
-- hours are a project-level time log (project.writerHours), each entry optionally linked
-- to an article. One row per entry, project-scoped, cascade-deleted with the project.
--
-- CRITICAL BOUNDARY: article_id is NOT a hard FK to magazine_articles. A writer-hours
-- entry can be general/unlinked (articleId === ''), which a FK would reject. So article_id
-- is a NULLABLE text soft ref ('' ↔ NULL), and ONLY project_id is a real foreign key.
-- writer_id is likewise a nullable text soft ref (MagazineTeamMember id, '' if unset).
--
-- Flat columns only; no order, no updatedAt on this entity. Read-first + dual-write
-- (same pattern as 0005–0013). Empty table → reads fall back to the local store.
--
-- Notes:
--   • id reuses the local WriterHoursEntry.id (UUID for app-created; seed/legacy
--     non-UUID ids stay local-only and are skipped by the sync).
--   • project_id FKs projects(id) ON DELETE CASCADE (the only FK here).
--   • date is TEXT (ISO date string), '' preserved exactly.
--   • hours is numeric.
--   • billable is boolean.
--   • RLS intentionally deferred (consistent with the other content tables).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_writer_hours (
  id          uuid        PRIMARY KEY,
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date        text        NOT NULL DEFAULT '',     -- ISO date string, '' if unset
  hours       numeric     NOT NULL DEFAULT 0,
  note        text        NOT NULL DEFAULT '',
  article_id  text,                                -- soft ref ('' = general/unlinked), nullable; NOT a hard FK
  writer_id   text,                                -- soft ref to MagazineTeamMember, nullable (no FK)
  billable    boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()   -- DB write marker (no app updatedAt on this entity)
);

CREATE INDEX IF NOT EXISTS magazine_writer_hours_project_idx ON magazine_writer_hours (project_id);

COMMENT ON TABLE  magazine_writer_hours            IS 'Magazine writer hours log (Phase 5M). One row per entry; project-scoped, cascade-deleted. First writing-workspace array.';
COMMENT ON COLUMN magazine_writer_hours.article_id IS 'Soft ref to an Article id within the project (no FK — entries may be general, articleId=''''). '''' ↔ NULL.';
COMMENT ON COLUMN magazine_writer_hours.writer_id  IS 'Soft ref to a MagazineTeamMember id (no FK). '''' ↔ NULL.';
