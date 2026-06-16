-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5N: magazine article versions content table
-- Migration: 0015_magazine_article_versions
--
-- Paste into Supabase SQL Editor → Run.
--
-- Eleventh magazine content slice — second writing-workspace array, and the FIRST with
-- a hard article FK. Article versions are readable snapshots of an article's body. One
-- row per version, project-scoped AND article-scoped, cascade-deleted with either parent.
--
-- DUAL FK (locked decision): every version belongs to a real article, so:
--   • article_id → magazine_articles(id) ON DELETE CASCADE  (NOT NULL)
--   • project_id → projects(id)          ON DELETE CASCADE  (NOT NULL)
-- The app push guard skips versions whose parent article id is a non-UUID SEED article
-- (those stay local-only, like the seed article itself), so this FK is always satisfiable.
-- Both FKs self-heal: project_id after the Phase 4 project push, article_id after the
-- Phase 5G article push (a 23503 on either is logged, then succeeds on the next change).
--
-- Versions are add/remove only (immutable once created — restore copies the body back
-- onto the ARTICLE, not the version). Flat columns only; no order, no updatedAt.
--
-- Notes:
--   • id reuses the local ArticleVersion.id (UUID for app-created; non-UUID seed ids
--     stay local-only and are skipped by the sync).
--   • author_id is a NULLABLE text soft ref (no FK); '' ↔ NULL. author_name is a snapshot.
--   • body may be large (a full snapshot of the article body) → text.
--   • RLS intentionally deferred (consistent with the other content tables).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_article_versions (
  id          uuid        PRIMARY KEY,
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  article_id  uuid        NOT NULL REFERENCES magazine_articles(id) ON DELETE CASCADE,
  label       text        NOT NULL DEFAULT '',     -- e.g. "v3" or "Draft sent to Sarah"
  body        text        NOT NULL DEFAULT '',     -- snapshot of the article body (may be large)
  word_count  integer     NOT NULL DEFAULT 0,      -- computed at snapshot time
  author_id   text,                                -- soft ref (app user), nullable (no FK)
  author_name text        NOT NULL DEFAULT '',     -- name snapshot
  note        text        NOT NULL DEFAULT '',     -- optional "what changed" note
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()   -- DB write marker (no app updatedAt on this entity)
);

CREATE INDEX IF NOT EXISTS magazine_article_versions_project_idx ON magazine_article_versions (project_id);
CREATE INDEX IF NOT EXISTS magazine_article_versions_article_idx ON magazine_article_versions (article_id);

COMMENT ON TABLE  magazine_article_versions           IS 'Magazine article body snapshots (Phase 5N). One row per version; FKs both project and article (CASCADE). Add/remove only.';
COMMENT ON COLUMN magazine_article_versions.article_id IS 'Hard FK to magazine_articles(id) CASCADE. Versions of non-UUID seed articles are skipped by the app sync (stay local-only).';
COMMENT ON COLUMN magazine_article_versions.author_id  IS 'Soft ref to the app user who snapshotted (no FK). '''' ↔ NULL.';
