-- ============================================================================
-- Phase 6D · 0020 — projects INSERT policy: admin-only (locked decision)
-- ----------------------------------------------------------------------------
-- Re-affirms, explicitly and idempotently, the 0003 stance: only an authenticated
-- app-admin may create (INSERT) a project. General authenticated users are DENIED
-- (anon matches no policy at all). This is a deliberate Phase 6D decision, NOT a
-- change of behavior — it documents the choice as its own migration so it can be
-- revisited later.
--
-- TO REVISIT (later phase): if non-admin users must create their own magazine issues,
-- relax the WITH CHECK below (e.g. allow any authenticated user to insert a project
-- they will own / be granted), and reconcile with how the magazine dual-write pushes
-- the projects row. Not done here.
--
-- Apply in the Supabase SQL Editor, after 0003. Idempotent (drop policy if exists).
-- ============================================================================

alter table public.projects enable row level security;  -- already enabled in 0003; harmless

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert to authenticated
  with check ( public.is_app_admin() );
