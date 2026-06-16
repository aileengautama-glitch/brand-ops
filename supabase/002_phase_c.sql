-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase C: tasks + comments sync support
-- Migration: 002_phase_c
--
-- Paste into Supabase SQL Editor → Run.
--
-- What this adds:
--   1. author_local_id column on comments — lets us store the local APP_USERS
--      id (e.g. "user-001") alongside the nullable Supabase profiles FK.
--      Once Supabase Auth is wired (Phase E), author_id is populated and
--      author_local_id is deprecated.
--
-- Nothing in 001_initial_schema.sql needs to change.
-- The tasks table already has assigned_to text which accepts local member IDs.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── comments: add author_local_id ─────────────────────────────────────────────

alter table comments
  add column if not exists author_local_id text not null default '';

comment on column comments.author_local_id is
  'Local APP_USERS id (e.g. "user-001").  Used for author attribution '
  'until Supabase Auth is live and author_id (uuid FK) can be populated. '
  'Deprecated after Phase E.';
