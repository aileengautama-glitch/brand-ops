-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5E: magazine spreads content table
-- Migration: 0006_magazine_spreads
--
-- Paste into Supabase SQL Editor → Run.
--
-- Second magazine content slice (after 0005 outreach). Spreads are the page plan /
-- table of contents. Lowest-coupling content entity after outreach: one row per
-- spread, project-scoped, cascade-deleted with the project.
--
-- links: SpreadLink[] is stored as JSONB (an owned, ordered list that is only ever
-- read forward off its own spread — never reverse-queried). Mirrors products.usps;
-- refIds are SOFT references (no FK — article/visual/graphic ids within the project).
--
-- Read-first + dual-write (Phases 5C/5D pattern combined): the app reads spreads
-- Supabase-first with a local fallback (MagazineSpreadRepository) and dual-writes
-- via useMagazineSpreadSync. Empty table → reads fall back to the local store.
--
-- Notes:
--   • id reuses the local Spread.id (UUID for app-created spreads; seed/legacy
--     non-UUID ids stay local-only and are skipped by the sync).
--   • project_id FKs projects(id) ON DELETE CASCADE (same as products / outreach).
--   • content_type / status are text + CHECK, pinned to the SpreadContentType /
--     SpreadStatus domains.
--   • owner_id is a SOFT ref to a MagazineTeamMember id (no FK); '' when unset.
--   • sort_order is BIGINT: Spread.order is Date.now()-based (~1.7e12) > int4 max.
--   • RLS intentionally deferred (consistent with the other content tables).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_spreads (
  id           uuid        PRIMARY KEY,
  project_id   uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pages        text        NOT NULL DEFAULT '',     -- free text: "p.1", "p.2–3", …
  content_type text        NOT NULL DEFAULT 'editorial'
                 CHECK (content_type IN ('editorial', 'article', 'ad', 'blank')),
  section      text        NOT NULL DEFAULT '',     -- editorial TOC category
  owner_id     text        NOT NULL DEFAULT '',     -- soft ref to MagazineTeamMember (no FK)
  links        jsonb       NOT NULL DEFAULT '[]'::jsonb,  -- SpreadLink[] [{id,type,refId}]
  status       text        NOT NULL DEFAULT 'empty'
                 CHECK (status IN ('empty', 'planned', 'laid-out', 'final')),
  notes        text        NOT NULL DEFAULT '',
  sort_order   bigint      NOT NULL DEFAULT 0,      -- mirrors Spread.order (Date.now()-based)
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS magazine_spreads_project_idx ON magazine_spreads (project_id);

COMMENT ON TABLE  magazine_spreads            IS 'Magazine spreads / page plan (Phase 5E). One row per spread; project-scoped, cascade-deleted with the project.';
COMMENT ON COLUMN magazine_spreads.links      IS 'Owned ordered SpreadLink[] [{id,type,refId}] — JSONB, not normalized (only ever read forward off its spread). refIds are soft (no FK).';
COMMENT ON COLUMN magazine_spreads.owner_id   IS 'Soft ref to a MagazineTeamMember id (no FK). '''' when unset.';
COMMENT ON COLUMN magazine_spreads.sort_order IS 'Mirrors local Spread.order (Date.now()-based) — BIGINT to fit.';
