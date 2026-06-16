-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5H: magazine visual projects content table
-- Migration: 0009_magazine_visual_projects
--
-- Paste into Supabase SQL Editor → Run.
--
-- Fifth magazine content slice (after outreach 0005, spreads 0006, graphics 0007,
-- articles 0008). Visual projects are compact shoot-style productions nested under
-- a magazine issue. One row per visual project, project-scoped, cascade-deleted.
--
-- Two owned arrays stored as JSONB (read forward off their own visual project,
-- never reverse-queried), mirroring graphics:
--   • shots        — VisualShot[]        [{id,title,description,status,order,createdAt}]
--   • result_links — VisualResultLink[]  [{id,label,url}]
--
-- updatedAt handling: VisualProject carries its OWN updatedAt (the app entity's
-- last-edit time, bumped by updateVisualProject). It is persisted in a DEDICATED
-- column app_updated_at. The DB row's updated_at is the write marker (bumped on
-- every push). The two are never overloaded for one another.
--
-- Read-first + dual-write (same pattern as 0005–0008). Empty table → reads fall
-- back to the local store.
--
-- Notes:
--   • id reuses the local VisualProject.id (UUID for app-created; seed/legacy
--     non-UUID ids stay local-only and are skipped by the sync).
--   • project_id FKs projects(id) ON DELETE CASCADE (same as the sibling tables).
--   • status is text + CHECK, pinned to the VisualProjectStatus domain.
--   • assigned_to / article_id are NULLABLE text soft refs (no FK); '' ↔ NULL.
--   • shoot_date is TEXT: it carries a meaningful '' sentinel, preserved exactly.
--   • sort_order is BIGINT: VisualProject.order is Date.now()-based (~1.7e12) > int4 max.
--   • created_at / app_updated_at / updated_at are timestamptz.
--   • RLS intentionally deferred (consistent with the other content tables).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_visual_projects (
  id             uuid        PRIMARY KEY,
  project_id     uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name           text        NOT NULL DEFAULT '',
  concept        text        NOT NULL DEFAULT '',     -- short brief / concept line
  status         text        NOT NULL DEFAULT 'planning'
                   CHECK (status IN ('planning', 'scheduled', 'shot', 'delivered')),
  shoot_date     text        NOT NULL DEFAULT '',     -- ISO date string, '' if unset
  location       text        NOT NULL DEFAULT '',
  assigned_to    text,                                -- soft ref to MagazineTeamMember, nullable (no FK)
  article_id     text,                                -- soft backlink to an Article, nullable (no FK)
  shots          jsonb       NOT NULL DEFAULT '[]'::jsonb,  -- VisualShot[]
  result_links   jsonb       NOT NULL DEFAULT '[]'::jsonb,  -- VisualResultLink[] [{id,label,url}]
  notes          text        NOT NULL DEFAULT '',
  sort_order     bigint      NOT NULL DEFAULT 0,      -- mirrors VisualProject.order (Date.now()-based)
  app_updated_at timestamptz NOT NULL DEFAULT now(),  -- app entity's VisualProject.updatedAt
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()   -- DB write marker (distinct from app_updated_at)
);

CREATE INDEX IF NOT EXISTS magazine_visual_projects_project_idx ON magazine_visual_projects (project_id);

COMMENT ON TABLE  magazine_visual_projects                IS 'Magazine visual projects / shoot-style productions (Phase 5H). One row per visual project; project-scoped, cascade-deleted.';
COMMENT ON COLUMN magazine_visual_projects.shots          IS 'Owned ordered VisualShot[] — JSONB, not normalized (only read forward off its project).';
COMMENT ON COLUMN magazine_visual_projects.app_updated_at IS 'The app entity VisualProject.updatedAt (last-edit time). DISTINCT from updated_at (the DB write marker).';
COMMENT ON COLUMN magazine_visual_projects.sort_order     IS 'Mirrors local VisualProject.order (Date.now()-based) — BIGINT to fit.';
