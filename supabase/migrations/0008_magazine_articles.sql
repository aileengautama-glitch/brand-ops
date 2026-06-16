-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5G: magazine articles content table (writing)
-- Migration: 0008_magazine_articles
--
-- Paste into Supabase SQL Editor → Run.
--
-- Fourth magazine content slice (after outreach 0005, spreads 0006, graphics 0007).
-- Articles are the writing deliverables. One row per article, project-scoped,
-- cascade-deleted with the project.
--
-- SCOPE: Article[] FLAT FIELDS ONLY. The three project-level writing-workspace
-- arrays (articleComments, articleVersions, writerHours) are DEFERRED to later
-- slices and are NOT modeled here.
--
-- Read-first + dual-write (same pattern as 0005–0007). Empty table → reads fall
-- back to the local store.
--
-- Column-type notes:
--   • id reuses the local Article.id (UUID for app-created articles; seed/legacy
--     non-UUID ids stay local-only and are skipped by the sync).
--   • project_id FKs projects(id) ON DELETE CASCADE (same as the sibling tables).
--   • type / status are text + CHECK, pinned to the ArticleType / ArticleStatus domains.
--   • body is text (long-form draft; unbounded).
--   • assigned_writer_id / approver_id / approved_by_id are NULLABLE text soft refs
--     (no FK); the app maps '' ↔ NULL.
--   • created_at is timestamptz (always present — the instant round-trips).
--   • approved_at and deadline are TEXT: they carry a meaningful '' sentinel
--     ('' = not approved / unset), so text preserves the exact app string round-trip.
--   • word_count_target / word_count_actual are integer (0 = unset/untracked).
--   • sort_order is BIGINT: Article.order is Date.now()-based (~1.7e12) > int4 max.
--   • RLS intentionally deferred (consistent with the other content tables).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_articles (
  id                 uuid        PRIMARY KEY,
  project_id         uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title              text        NOT NULL DEFAULT '',
  type               text        NOT NULL DEFAULT 'article'
                       CHECK (type IN ('article', 'interview', 'column', 'feature', 'ad')),
  author             text        NOT NULL DEFAULT '',     -- free-text writer (fallback / external)
  assigned_writer_id text,                                -- soft ref to MagazineTeamMember, nullable (no FK)
  section            text        NOT NULL DEFAULT '',     -- free-text grouping within the issue
  brief              text        NOT NULL DEFAULT '',     -- editorial angle / brief
  body               text        NOT NULL DEFAULT '',     -- long-form draft content (may be large)
  word_count_target  integer     NOT NULL DEFAULT 0,
  word_count_actual  integer     NOT NULL DEFAULT 0,
  deadline           text        NOT NULL DEFAULT '',     -- ISO date string, '' if unset
  status             text        NOT NULL DEFAULT 'idea'
                       CHECK (status IN ('idea', 'drafting', 'review', 'final')),
  notes              text        NOT NULL DEFAULT '',
  approver_id        text,                                -- soft ref (designated approver), nullable (no FK)
  approved_by_id     text,                                -- soft ref (app user who finalised), nullable (no FK)
  approved_by_name   text        NOT NULL DEFAULT '',     -- name snapshot at sign-off
  approved_at        text        NOT NULL DEFAULT '',     -- ISO timestamp or '' (not approved)
  sort_order         bigint      NOT NULL DEFAULT 0,      -- mirrors Article.order (Date.now()-based)
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS magazine_articles_project_idx ON magazine_articles (project_id);

COMMENT ON TABLE  magazine_articles            IS 'Magazine articles / writing deliverables (Phase 5G). Flat Article fields only — workspace arrays (comments/versions/hours) are deferred. Project-scoped, cascade-deleted.';
COMMENT ON COLUMN magazine_articles.body       IS 'Long-form draft content (text, unbounded).';
COMMENT ON COLUMN magazine_articles.approved_at IS 'ISO timestamp of sign-off, or '''' when not approved. TEXT to preserve the '''' sentinel round-trip.';
COMMENT ON COLUMN magazine_articles.sort_order IS 'Mirrors local Article.order (Date.now()-based) — BIGINT to fit.';
