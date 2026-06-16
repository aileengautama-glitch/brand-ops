-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5O: magazine article comments content table
-- Migration: 0016_magazine_article_comments
--
-- Paste into Supabase SQL Editor → Run.
--
-- Twelfth and FINAL magazine content slice — third writing-workspace array. Article
-- comments are the per-article discussion thread (comments + suggestions, each with an
-- open/approved/rejected resolution). One row per comment, project-scoped AND article-
-- scoped, cascade-deleted with either parent.
--
-- DUAL FK (locked decision, same as 0015): every comment belongs to a real article:
--   • article_id → magazine_articles(id) ON DELETE CASCADE  (NOT NULL)
--   • project_id → projects(id)          ON DELETE CASCADE  (NOT NULL)
-- The app push guard skips comments whose parent article id is a non-UUID SEED article
-- (those stay local-only). Both FKs self-heal (project after Phase 4, article after 5G).
--
-- Mutable via resolveArticleComment (status + resolver snapshot) — synced as an upsert.
--
-- Notes:
--   • id reuses the local ArticleComment.id (UUID for app-created; non-UUID seed ids
--     stay local-only and are skipped by the sync).
--   • kind / status are text + CHECK, pinned to ArticleNoteKind / ArticleNoteStatus.
--   • author_id / resolved_by_id are NULLABLE text soft refs (no FK); '' ↔ NULL.
--   • resolved_at is TEXT (ISO or '' while open), '' preserved exactly.
--   • anchor is NULLABLE jsonb — the optional ArticleCommentAnchor {start,end,quote};
--     absent/undefined anchor ↔ NULL.
--   • no sort_order, no app_updated_at (neither exists on the shape).
--   • RLS intentionally deferred (consistent with the other content tables).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_article_comments (
  id               uuid        PRIMARY KEY,
  project_id       uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  article_id       uuid        NOT NULL REFERENCES magazine_articles(id) ON DELETE CASCADE,
  kind             text        NOT NULL DEFAULT 'comment'
                     CHECK (kind IN ('comment', 'suggestion')),
  author_id        text,                                -- soft ref (app user), nullable (no FK)
  author_name      text        NOT NULL DEFAULT '',     -- name snapshot at post time
  body             text        NOT NULL DEFAULT '',
  status           text        NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'approved', 'rejected')),
  resolved_by_id   text,                                -- soft ref (resolver), nullable (no FK)
  resolved_by_name text        NOT NULL DEFAULT '',
  resolved_at      text        NOT NULL DEFAULT '',     -- ISO or '' while open
  anchor           jsonb,                               -- ArticleCommentAnchor {start,end,quote} or NULL
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()   -- DB write marker (no app updatedAt on this entity)
);

CREATE INDEX IF NOT EXISTS magazine_article_comments_project_idx ON magazine_article_comments (project_id);
CREATE INDEX IF NOT EXISTS magazine_article_comments_article_idx ON magazine_article_comments (article_id);

COMMENT ON TABLE  magazine_article_comments            IS 'Magazine article discussion thread (Phase 5O — final content slice). One row per comment/suggestion; FKs both project and article (CASCADE). Mutable via resolve.';
COMMENT ON COLUMN magazine_article_comments.article_id IS 'Hard FK to magazine_articles(id) CASCADE. Comments of non-UUID seed articles are skipped by the app sync (stay local-only).';
COMMENT ON COLUMN magazine_article_comments.anchor     IS 'Optional ArticleCommentAnchor {start,end,quote} as JSONB; NULL when the comment is not attached to a text range. undefined ↔ NULL.';
