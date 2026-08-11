-- ============================================================================
-- 0022 — project creation: allow the roles that actually create projects,
--         and give the creator access to what they just created.
-- ----------------------------------------------------------------------------
-- WHY
-- Until now projects_insert was admin-only (0003, re-affirmed in 0020), so a
-- Producer / Art Director / Head of Marketing creating a project was denied by
-- the server. Two different failures looked the same in the client:
--
--   401  no valid JWT reached PostgREST (not signed in to Supabase Auth, or the
--        session expired) — every `to authenticated` policy is unreachable.
--   403  signed in, but is_app_admin() was false, so the WITH CHECK failed
--        (42501 "new row violates row-level security policy").
--
-- is_app_admin() → current_person_id() → people.auth_user_id = auth.uid(), so a
-- signed-in user whose people row was never linked (0017 trigger requires a
-- confirmed email that matches) also lands in the 403 branch.
--
-- WHAT THIS DOES
-- 1. can_create_projects() — admin OR an explicitly allowed role.
-- 2. projects_insert now uses it.
-- 3. AFTER INSERT trigger grants the creator '*' = 'edit' on the new project.
--    Without this the insert succeeds but the creator cannot SELECT their own
--    project back (projects_select needs admin or a grant), which reads to the
--    client as a failed create.
--
-- The trigger writes through the EXISTING access model (access_grants with
-- section_key '*'), so nothing else has to change and the app's access UI shows
-- the grant like any other.
--
-- NOTE ON ROLES: 'head_of_marketing' is included because it was asked for, but
-- the app's UserRole union does not currently emit it (producer | art_director |
-- stylist | hmu | retail_lead | assistant | viewer). people.role is free text, so
-- the value works if set directly; add it to UserRole when the app needs it.
--
-- Idempotent. Apply in the Supabase SQL Editor after 0003 (and 0020 if applied).
-- ============================================================================

-- ── 1. Who may create a project ──────────────────────────────────────────────
create or replace function public.can_create_projects()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p.is_admin
         or p.role in ('producer', 'art_director', 'head_of_marketing')
       from public.people p
      where p.id = public.current_person_id()),
    false
  )
$$;

comment on function public.can_create_projects() is
  'True for app admins and for roles that legitimately create projects. Null person (unlinked or unauthenticated) → false.';

-- ── 2. Replace the admin-only INSERT policy ──────────────────────────────────
alter table public.projects enable row level security;  -- already on; harmless

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert to authenticated
  with check ( public.can_create_projects() );

-- ── 3. Creator gets access to their own project ──────────────────────────────
-- SECURITY DEFINER so it can write access_grants regardless of that table's RLS.
create or replace function public.grant_creator_project_access()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  creator text := public.current_person_id();
begin
  if creator is null then
    return new;                      -- service-role / migration inserts: nothing to grant
  end if;

  insert into public.access_grants (person_id, module, project_id, section_key, level)
  values (creator, new.module, new.id, '*', 'edit')
  on conflict (person_id, module, project_id, section_key) do nothing;

  return new;
end
$$;

comment on function public.grant_creator_project_access() is
  'After a project is created, give its creator whole-project edit access so they can read back and work on it.';

drop trigger if exists projects_grant_creator on public.projects;
create trigger projects_grant_creator
  after insert on public.projects
  for each row execute function public.grant_creator_project_access();
