-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5C: magazine outreach content table
-- Migration: 0005_magazine_outreach
--
-- Paste into Supabase SQL Editor → Run.
--
-- First normalized slice of MAGAZINE CONTENT (previous magazine work only covered
-- the project summary: magazine_project_meta). Outreach is the lowest-coupling
-- magazine content entity — a flat record with no images, no relational child
-- arrays, and only a soft article backlink. Mirrors the products table pattern
-- (007): one row per contact, project-scoped, cascade-deleted with the project.
--
-- This migration is READ-FIRST: the app reads these rows Supabase-first (with a
-- local fallback) via MagazineOutreachRepository. The dual-write path is a later
-- phase, so the table is expected to be empty until then — reads fall back to the
-- local store while it is.
--
-- Notes:
--   • id reuses the local OutreachContact.id (a UUID for app-created contacts;
--     seed/legacy non-UUID ids stay local-only and are skipped by the repo).
--   • project_id FKs projects(id) with ON DELETE CASCADE (same as products).
--   • type/status are text + CHECK, pinned to the OutreachType / OutreachStatus
--     domains (mirrors editorial_status on magazine_project_meta).
--   • article_id is a SOFT backlink to a magazine Article (no FK) — articles are
--     not yet a Supabase table; '' when unlinked.
--   • RLS is intentionally deferred (consistent with the other content tables and
--     the pre-Auth anon-read posture of Phases 5A/5B).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_outreach (
  id           uuid        PRIMARY KEY,
  project_id   uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name         text        NOT NULL DEFAULT '',
  type         text        NOT NULL DEFAULT 'contributor'
                 CHECK (type   IN ('contributor', 'photographer', 'advertiser', 'stylist', 'other')),
  status       text        NOT NULL DEFAULT 'prospecting'
                 CHECK (status IN ('prospecting', 'contacted', 'confirmed', 'declined')),
  contact_info text        NOT NULL DEFAULT '',
  fee          text        NOT NULL DEFAULT '',     -- free text: "€500/day", "TBC", …
  article_id   text        NOT NULL DEFAULT '',     -- soft backlink to an Article (no FK)
  role         text        NOT NULL DEFAULT '',
  notes        text        NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS magazine_outreach_project_idx ON magazine_outreach (project_id);

COMMENT ON TABLE  magazine_outreach            IS 'Magazine outreach contacts (Phase 5C). One row per contact; project-scoped, cascade-deleted with the project. Read-first; dual-write is a later phase.';
COMMENT ON COLUMN magazine_outreach.article_id IS 'Soft backlink to a magazine Article id (no FK — articles are not yet a Supabase table). '''' when unlinked.';
COMMENT ON COLUMN magazine_outreach.fee        IS 'Free-text fee / rate, e.g. "€500/day", "£2,000 flat", "TBC".';
