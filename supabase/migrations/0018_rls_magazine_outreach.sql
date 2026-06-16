-- ============================================================================
-- Phase 6B · 0018 — Row-Level Security for magazine_outreach (first content table)
-- ----------------------------------------------------------------------------
-- The FIRST Phase-5 content table to get RLS. Mirrors the 0003 design: all policies
-- target the `authenticated` role only, so `anon` matches nothing → denied. Helpers
-- (is_app_admin, can_view_project, my_section_level) are defined in 0003 — apply 0003
-- (and 0017 linking) BEFORE this.
--
-- Access model (mirrors useCurrentUser):
--   • READ  — admin OR can_view_project('magazine', project_id)  [project-level view,
--             incl. the legacy magazine→view-all transition fallback in 0003].
--   • WRITE — admin OR edit on the outreach section. The section key is the FULL dotted
--             key 'magazine.outreach' (exactly what access_grants.section_key stores;
--             my_section_level falls back to the '*' project default).
--
-- This does NOT flip any client read authority: the Outreach page stays `remote ?? local`.
-- It only makes the remote side return AUTHORIZED rows once a user is signed in + linked.
-- Anonymous/unlinked → denied → the page falls back to the local store (unchanged).
--
-- Write reminder: a magazine_outreach row FKs projects(id); end-to-end writes still need
-- the parent projects row to exist (and projects_insert is admin-only in 0003 — a
-- separate, deferred decision). Reads are this slice's focus.
--
-- Apply in the Supabase SQL Editor. Idempotent-ish (drop policy if exists guards reruns).
-- ============================================================================

alter table public.magazine_outreach enable row level security;

drop policy if exists mag_outreach_select on public.magazine_outreach;
create policy mag_outreach_select on public.magazine_outreach
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_outreach_insert on public.magazine_outreach;
create policy mag_outreach_insert on public.magazine_outreach
  for insert to authenticated
  with check (
    public.is_app_admin()
    or public.my_section_level('magazine', project_id, 'magazine.outreach') = 'edit'
  );

drop policy if exists mag_outreach_update on public.magazine_outreach;
create policy mag_outreach_update on public.magazine_outreach
  for update to authenticated
  using (
    public.is_app_admin()
    or public.my_section_level('magazine', project_id, 'magazine.outreach') = 'edit'
  )
  with check (
    public.is_app_admin()
    or public.my_section_level('magazine', project_id, 'magazine.outreach') = 'edit'
  );

drop policy if exists mag_outreach_delete on public.magazine_outreach;
create policy mag_outreach_delete on public.magazine_outreach
  for delete to authenticated
  using (
    public.is_app_admin()
    or public.my_section_level('magazine', project_id, 'magazine.outreach') = 'edit'
  );
