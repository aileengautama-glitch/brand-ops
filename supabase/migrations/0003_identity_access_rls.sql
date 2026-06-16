-- ============================================================================
-- Phase 1 · 0003 — Row-Level Security for the identity / access core
-- ----------------------------------------------------------------------------
-- These policies REPLACE the client-side resolver (useCurrentUser) at the DB
-- boundary. They are written for the AUTHENTICATED state (the auth phase wires
-- people.auth_user_id ↔ auth.uid()). Until then auth.uid() is null, so
-- current_person_id() returns null and EVERY policy denies — i.e. anonymous
-- access is closed by construction. There is no `to anon` policy anywhere.
--
-- Resolver parity (mirrors useCurrentUser):
--   • admin           → full access (is_app_admin()).
--   • scoped (has any grant in a module) → deny-by-default; only granted
--     projects/pages, at the granted level.
--   • legacy (no grants in a module) → TRANSITION fallback (VIEW only):
--       magazine → all (matches current client); event/shoot → membership.
--   • guest/anonymous → DENIED (the client's "not logged in ⇒ full access" is a
--     dev convenience that MUST NOT survive to the backend).
--
-- NOTE ON EDIT: server-side EDIT requires admin OR an explicit 'edit' grant. The
-- client's legacy ROLE_PERMISSIONS-based edit is intentionally NOT replicated
-- here (deny-by-default for writes). Flagged for approval.
--
-- The helpers are SELF-SCOPED: they derive the current person from auth.uid()
-- internally and take NO person parameter, so an authenticated user can only
-- ever ask about THEIR OWN access — there is no way to probe another person's
-- grants by calling a helper with a different id.
-- ============================================================================

-- ─── Helper functions (SECURITY DEFINER to avoid recursive RLS) ──────────────
-- STABLE + run as owner so they can read people/access_grants without tripping
-- those tables' own RLS. auth.uid() still reflects the real request inside a
-- SECURITY DEFINER function (it reads a per-request GUC, not the role).

create or replace function public.current_person_id()
returns text language sql stable security definer set search_path = public as $$
  select id from public.people where auth_user_id = auth.uid() limit 1
$$;
comment on function public.current_person_id() is
  'people.id of the authenticated user (auth_user_id = auth.uid()); null when not logged in → all policies deny.';

create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.people where id = public.current_person_id()), false)
$$;

-- Module-level gate — mirrors useCurrentUser.allowedModules.
-- null allowed_modules = all modules (the client default).
create or replace function public.module_allowed(p_module text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p_module = any(allowed_modules)
       from public.people
      where id = public.current_person_id() and allowed_modules is not null),
    true
  )
$$;

-- Does the current person hold any grant in this module? (→ scoped mode)
create or replace function public.has_module_grants(p_module text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.access_grants
     where person_id = public.current_person_id() and module = p_module
  )
$$;

-- Highest level the current person holds anywhere on a project (for "can view").
create or replace function public.my_project_level(p_module text, p_project uuid)
returns access_level language sql stable security definer set search_path = public as $$
  select coalesce(
    (select level
       from public.access_grants
      where person_id = public.current_person_id() and module = p_module and project_id = p_project
      order by case level when 'edit' then 3 when 'view' then 2 else 1 end desc
      limit 1),
    'none'
  )
$$;

-- Effective level for a specific page: explicit section → '*' default → none.
-- (Used by Phase 3 content-table policies; defined now for completeness.)
create or replace function public.my_section_level(p_module text, p_project uuid, p_section text)
returns access_level language sql stable security definer set search_path = public as $$
  select coalesce(
    (select level from public.access_grants
       where person_id = public.current_person_id() and module = p_module
         and project_id = p_project and section_key = p_section),
    (select level from public.access_grants
       where person_id = public.current_person_id() and module = p_module
         and project_id = p_project and section_key = '*'),
    'none'
  )
$$;

-- Project visibility — mirrors useCurrentUser.canView (incl. legacy fallback).
create or replace function public.can_view_project(p_module text, p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when public.current_person_id() is null then false
    -- module gate (mirrors the client's allowedModules) — applies to non-admins
    when not public.module_allowed(p_module) then false
    when public.has_module_grants(p_module)
      then public.my_project_level(p_module, p_project) in ('view', 'edit')
    -- Legacy TRANSITION fallback (remove once all access is grant-based):
    when p_module = 'magazine' then true
    else exists (
      select 1 from public.project_members
       where project_id = p_project and person_id = public.current_person_id()
    )
  end
$$;

-- Project-level edit (for meta) — admin OR an 'edit' grant somewhere on it.
create or replace function public.can_edit_project(p_module text, p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_app_admin()
      or public.my_project_level(p_module, p_project) = 'edit'
$$;

-- ============================================================================
-- Enable RLS + policies.  All policies target the `authenticated` role only —
-- the `anon` role matches no policy and is therefore denied.
-- ============================================================================

-- ─── people ──────────────────────────────────────────────────────────────────
alter table public.people enable row level security;

-- Read: admins see everyone; a person can read their own row.
-- (A broader "directory read for assignment pickers" policy can be added later.)
create policy people_select on public.people
  for select to authenticated
  using ( public.is_app_admin() or id = public.current_person_id() );

-- Write: admin only (identity management is an admin action).
create policy people_insert on public.people
  for insert to authenticated with check ( public.is_app_admin() );
create policy people_update on public.people
  for update to authenticated using ( public.is_app_admin() ) with check ( public.is_app_admin() );
create policy people_delete on public.people
  for delete to authenticated using ( public.is_app_admin() );

-- ─── projects ────────────────────────────────────────────────────────────────
alter table public.projects enable row level security;

create policy projects_select on public.projects
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project(module, id) );

-- INSERT is admin-only here. NOTE: the current client lets any logged-in user
-- create a project; that authority isn't expressed by the scoped model. Left
-- admin-only (deny-by-default) — FLAGGED for approval; relax in a later phase
-- if non-admin project creation must be preserved.
create policy projects_insert on public.projects
  for insert to authenticated with check ( public.is_app_admin() );

create policy projects_update on public.projects
  for update to authenticated
  using ( public.is_app_admin() or public.can_edit_project(module, id) )
  with check ( public.is_app_admin() or public.can_edit_project(module, id) );

create policy projects_delete on public.projects
  for delete to authenticated using ( public.is_app_admin() );

-- ─── magazine_project_meta ───────────────────────────────────────────────────
alter table public.magazine_project_meta enable row level security;

create policy mag_meta_select on public.magazine_project_meta
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

create policy mag_meta_insert on public.magazine_project_meta
  for insert to authenticated with check ( public.is_app_admin() );

create policy mag_meta_update on public.magazine_project_meta
  for update to authenticated
  using ( public.is_app_admin() or public.can_edit_project('magazine', project_id) )
  with check ( public.is_app_admin() or public.can_edit_project('magazine', project_id) );

create policy mag_meta_delete on public.magazine_project_meta
  for delete to authenticated using ( public.is_app_admin() );

-- ─── project_members ─────────────────────────────────────────────────────────
alter table public.project_members enable row level security;

-- Read: admins all; otherwise visible if you can view the parent project.
create policy project_members_select on public.project_members
  for select to authenticated
  using (
    public.is_app_admin()
    or exists (
      select 1 from public.projects pr
       where pr.id = project_members.project_id
         and public.can_view_project(pr.module, pr.id)
    )
  );

-- Write: admin only (roster/assignment is managed on the admin-only Team Access UI).
create policy project_members_insert on public.project_members
  for insert to authenticated with check ( public.is_app_admin() );
create policy project_members_update on public.project_members
  for update to authenticated using ( public.is_app_admin() ) with check ( public.is_app_admin() );
create policy project_members_delete on public.project_members
  for delete to authenticated using ( public.is_app_admin() );

-- ─── access_grants ───────────────────────────────────────────────────────────
alter table public.access_grants enable row level security;

-- Read: admins all; a person can read their OWN grants.
create policy access_grants_select on public.access_grants
  for select to authenticated
  using ( public.is_app_admin() or person_id = public.current_person_id() );

-- Write: admin only (grants are edited on admin-only surfaces).
create policy access_grants_insert on public.access_grants
  for insert to authenticated with check ( public.is_app_admin() );
create policy access_grants_update on public.access_grants
  for update to authenticated using ( public.is_app_admin() ) with check ( public.is_app_admin() );
create policy access_grants_delete on public.access_grants
  for delete to authenticated using ( public.is_app_admin() );
