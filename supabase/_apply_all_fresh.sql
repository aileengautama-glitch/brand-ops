-- =====================================================================
-- Brand Ops -- full schema apply for a FRESH Supabase project
-- Run ONCE in the Supabase SQL Editor. Applies base schema + 0001..0020 in order.
-- (migrations/import/ is a data-migration toolkit -- NOT needed for a fresh DB.)
-- =====================================================================

-- ########## supabase/001_initial_schema.sql ##########

-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Initial Schema
-- Migration: 001_initial_schema
--
-- Paste this entire file into the Supabase SQL Editor and click Run.
-- Dashboard → SQL Editor → New query → paste → Run
--
-- This creates the Phase A/B/C foundation tables:
--   profiles, projects, project_memberships, tasks, comments
--
-- RLS policies are PERMISSIVE for Phase A (allow all authenticated + anon).
-- They will be tightened in a later migration once Supabase Auth is wired in.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Profiles ──────────────────────────────────────────────────────────────────
-- One row per team member. Created automatically when a user signs up via
-- Supabase Auth (trigger added later). Seeded manually for Phase A testing.

create table if not exists profiles (
  id           uuid primary key,
  name         text         not null,
  email        text         unique,
  role         text         not null default 'viewer',
  initials     text         not null default '',
  avatar_color text         not null default '#566246',
  created_at   timestamptz  not null default now()
);

comment on table profiles is
  'Team member profiles. Maps 1:1 with Supabase auth.users once Auth is wired.';


-- ── Projects ──────────────────────────────────────────────────────────────────

create table if not exists projects (
  id          uuid         primary key default gen_random_uuid(),
  module      text         not null,
  name        text         not null,
  description text         not null default '',
  status      text         not null default 'active',
  created_by  uuid         references profiles(id) on delete set null,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now(),

  constraint projects_module_check  check (module in ('event', 'shoot')),
  constraint projects_status_check  check (status in ('active', 'archived'))
);

comment on table projects is
  'Top-level project records, split by module (event | shoot).';

-- Keep updated_at current automatically
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_updated_at on projects;
create trigger projects_updated_at
  before update on projects
  for each row execute function set_updated_at();


-- ── Project memberships ───────────────────────────────────────────────────────
-- Links a profile to a project. member_record_id stores the local
-- TeamMember / CrewMember ID so "My Tasks" can match assignedTo.

create table if not exists project_memberships (
  id               uuid         primary key default gen_random_uuid(),
  project_id       uuid         not null references projects(id) on delete cascade,
  user_id          uuid         not null references profiles(id) on delete cascade,
  member_record_id text,
  created_at       timestamptz  not null default now(),

  constraint project_memberships_unique unique (project_id, user_id)
);

comment on table project_memberships is
  'Maps which profiles belong to which projects. Enforces visibility rules.';

create index if not exists project_memberships_user_idx
  on project_memberships (user_id);

create index if not exists project_memberships_project_idx
  on project_memberships (project_id);


-- ── Tasks ─────────────────────────────────────────────────────────────────────

create table if not exists tasks (
  id          uuid         primary key default gen_random_uuid(),
  project_id  uuid         not null references projects(id) on delete cascade,
  title       text         not null default '',
  description text         not null default '',
  status      text         not null default 'todo',
  priority    text         not null default 'normal',
  due_date    date,
  assigned_to text         not null default '',   -- project member record ID
  sort_order  integer      not null default 0,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now(),

  constraint tasks_status_check   check (status   in ('todo', 'in_progress', 'done')),
  constraint tasks_priority_check check (priority in ('low', 'normal', 'high'))
);

comment on table tasks is
  'Per-project tasks. Realtime-enabled for live collaboration.';

drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

create index if not exists tasks_project_id_idx  on tasks (project_id);
create index if not exists tasks_status_idx      on tasks (project_id, status);
create index if not exists tasks_assigned_to_idx on tasks (project_id, assigned_to);


-- ── Comments ──────────────────────────────────────────────────────────────────

create table if not exists comments (
  id          uuid         primary key default gen_random_uuid(),
  project_id  uuid         not null references projects(id) on delete cascade,
  entity_type text         not null,
  entity_id   text         not null,
  author_id   uuid         references profiles(id) on delete set null,
  body        text         not null,
  created_at  timestamptz  not null default now(),

  constraint comments_entity_type_check check (entity_type in ('task', 'shot', 'collateral'))
);

comment on table comments is
  'Threaded comments on tasks, shots, and collaterals. Realtime-enabled.';

create index if not exists comments_entity_idx    on comments (entity_type, entity_id);
create index if not exists comments_project_idx   on comments (project_id);
create index if not exists comments_author_idx    on comments (author_id);


-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Enable Postgres Replication for the tables that need live sync.
-- (projects + tasks + comments are highest priority for Phase B/C)



-- ── Row Level Security ────────────────────────────────────────────────────────
-- Phase A: permissive policies so the app works before real Auth is wired.
-- Every operation is allowed for both authenticated and anonymous callers.
-- Phase B will replace these with proper user-scoped policies.

alter table profiles            enable row level security;
alter table projects            enable row level security;
alter table project_memberships enable row level security;
alter table tasks               enable row level security;
alter table comments            enable row level security;

-- Profiles: allow all (will tighten: users can only update their own row)
create policy "profiles_phase_a"
  on profiles for all
  using (true) with check (true);

-- Projects: allow all (will tighten: broad-visibility roles OR membership)
create policy "projects_phase_a"
  on projects for all
  using (true) with check (true);

-- Memberships: allow all
create policy "memberships_phase_a"
  on project_memberships for all
  using (true) with check (true);

-- Tasks: allow all (will tighten: visible if project is visible)
create policy "tasks_phase_a"
  on tasks for all
  using (true) with check (true);

-- Comments: allow all
create policy "comments_phase_a"
  on comments for all
  using (true) with check (true);


-- ########## supabase/migrations/0001_identity_access_extensions_enums.sql ##########

-- ============================================================================
-- Phase 1 · 0001 — Extensions + enums for the identity / access core
-- ----------------------------------------------------------------------------
-- Additive and idempotent. Safe to run repeatedly. No app code references these
-- objects yet; the app continues to run entirely on localStorage.
--
-- Apply out-of-band via the Supabase SQL editor or `supabase db push`.
-- Contains NO secrets.
-- ============================================================================

-- uuid_generate_v5() — deterministic remap of non-UUID seed project ids on import
create extension if not exists "uuid-ossp";
-- gen_random_uuid() — default PKs for projects / grants / members
create extension if not exists "pgcrypto";
-- citext — case-insensitive email matching for de-duplication
create extension if not exists "citext";

-- ─── Enums (idempotent create) ───────────────────────────────────────────────

do $$ begin
  create type person_status as enum ('account', 'internal', 'external', 'manual', 'pending_invite');
exception when duplicate_object then null; end $$;
comment on type person_status is
  'account = real login user (APP_USERS today). internal/external/manual/pending_invite = custom/manual people with no login yet.';

do $$ begin
  create type access_level as enum ('none', 'view', 'edit');
exception when duplicate_object then null; end $$;

-- NOTE: there is intentionally NO `access_module` enum and NO `project_lifecycle`
-- enum. Reconciliation (0004) reuses the EXISTING `projects` table, whose `module`
-- and `status` are `text` + CHECK. To keep the composite FK
-- (access tables → projects(id, module)) type-compatible, module is `text`
-- everywhere. The app-side AccessModule type (src/auth/access.ts) is unaffected.


-- ########## supabase/migrations/0002_identity_access_tables.sql ##########

-- ============================================================================
-- Phase 1 · 0002 — Identity / access core tables
-- ----------------------------------------------------------------------------
-- Tables: people, magazine_project_meta, project_members, access_grants.
-- The `projects` table is NOT created here — it is the EXISTING table from
-- 001_initial_schema.sql, extended by 0004 (module check + UNIQUE(id, module)).
-- The composite FKs (magazine_project_meta / access_grants → projects(id, module))
-- are therefore added in 0004, after that UNIQUE target exists.
-- Additive & idempotent (create-if-not-exists). RLS is enabled in 0003.
--
-- Identity model (locked decisions):
--   • people.id is a TEXT primary key, preserving existing string ids
--     (APP_USERS 'user-*', custom-member UUIDs, promoted magazine roster ids).
--   • The magazine roster unifies INTO people; the project-scoped role/credit
--     lives on project_members (not on people).
--   • Invite/upgrade later sets people.auth_user_id + login_enabled on the SAME
--     row — the id never changes, so grants/members/assignments carry over.
-- ============================================================================

-- ─── Shared updated_at trigger ───────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─── people ──────────────────────────────────────────────────────────────────
-- One row per human. Login is OPTIONAL (login_enabled / auth_user_id). Account
-- attributes (role / is_admin / allowed_modules) only apply to login accounts;
-- they stay NULL/false/default for manual people.
create table if not exists public.people (
  id              text primary key,
  name            text not null default '',
  email           citext,                      -- null allowed (V1 flexibility); NOT unique in Phase 1 (see note)
  phone           text,
  status          person_status not null default 'manual',
  role            text,                         -- access role (UserRole) for accounts; null for manual people
  is_admin        boolean not null default false,
  allowed_modules text[],                       -- null = all modules (client default); '{}' = none; values: event|shoot|magazine
  initials        text not null default '',
  avatar_color    text not null default '#566246',
  notes           text not null default '',
  login_enabled   boolean not null default false,
  auth_user_id    uuid,                         -- → auth.users(id); FK added in the auth phase (kept loose now)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on column public.people.id is
  'Stable TEXT primary key. Preserves APP_USERS ids (user-*), custom-member UUIDs, and promoted magazine roster ids.';
comment on column public.people.auth_user_id is
  'Set in the auth phase to bridge to Supabase auth.users. people.id NEVER changes on invite/upgrade.';
comment on column public.people.email is
  'No UNIQUE constraint in Phase 1 — would break import + manual-merge. Uniqueness is enforced by the dup report + merge_person(), then a constraint can be added post-merge.';

-- Lookup index for de-duplication (non-unique on purpose; see note above).
create index if not exists people_email_idx on public.people (email) where email is not null;

drop trigger if exists trg_people_updated_at on public.people;
create trigger trg_people_updated_at before update on public.people
  for each row execute function public.set_updated_at();

-- ─── projects (base) — REUSED, not created here ──────────────────────────────
-- The existing public.projects (001_initial_schema.sql) is the single project
-- table. 0004 extends it: module CHECK → event|shoot|magazine, and adds
-- UNIQUE(id, module) as the composite-FK target.

-- ─── magazine_project_meta (1:1 detail) ──────────────────────────────────────
-- module is pinned to 'magazine' (DEFAULT + CHECK). The composite FK to
-- projects(id, module) is added in 0004 (after projects gains UNIQUE(id, module)),
-- guaranteeing this detail only ever attaches to a MAGAZINE project.
create table if not exists public.magazine_project_meta (
  project_id       uuid primary key,
  module           text not null default 'magazine' check (module = 'magazine'),
  edition_number   text not null default '',
  publication_date date,
  theme            text not null default '',
  total_budget     numeric(14,2) not null default 0,
  editorial_status text not null default 'planning'
                   check (editorial_status in ('planning', 'production', 'review', 'published')),
  notes            text not null default ''
  -- composite FK (project_id, module) → projects(id, module) added in 0004
);
comment on column public.magazine_project_meta.editorial_status is
  'Holds the existing MagazineProject.status. Added because the magazine editorial status has no home in the generic projects.status (active|archived).';

-- ─── project_members (roster / assignment layer) ─────────────────────────────
-- Who is ON a project + their project-scoped role/credit. Absorbs both the
-- legacy `memberships` map and the magazine `teamMembers` roster. person_id is
-- ALWAYS a people.id (single identity).
create table if not exists public.project_members (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  person_id    text not null references public.people (id)  on delete cascade,
  project_role text not null default '',
  created_at   timestamptz not null default now(),
  unique (project_id, person_id)
);
create index if not exists project_members_person_idx on public.project_members (person_id);

-- ─── access_grants (page-access layer) ───────────────────────────────────────
-- One row per EXPLICIT (person, project, section) access.
--   • section_key = '*'  → project-wide default
--   • section_key = 'magazine.writing' (etc.) → per-page override
--   • ABSENCE of a row  → inherit ('*' then none). 'inherit' is NEVER stored.
create table if not exists public.access_grants (
  id          uuid primary key default gen_random_uuid(),
  person_id   text not null references public.people (id) on delete cascade,
  module      text not null check (module in ('event', 'shoot', 'magazine')),
  project_id  uuid not null,
  section_key text not null,
  level       access_level not null,
  created_at  timestamptz not null default now(),
  unique (person_id, module, project_id, section_key)
  -- composite FK (project_id, module) → projects(id, module) added in 0004
  -- (pins the grant's module to its project's module — no mismatched grants).
);
create index if not exists access_grants_lookup_idx on public.access_grants (person_id, module, project_id);
comment on table public.access_grants is
  'Explicit access rows only. ''*'' = project default; missing row = inherit. Never materialize ''inherit''.';


-- ########## supabase/migrations/0003_identity_access_rls.sql ##########

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


-- ########## supabase/migrations/0004_reconcile_projects.sql ##########

-- ============================================================================
-- Phase 1 · 0004 — Reconcile the identity/access layer with the EXISTING projects
-- ----------------------------------------------------------------------------
-- The existing public.projects (001_initial_schema.sql) is the SINGLE project
-- table. This migration:
--   • extends its module CHECK to include 'magazine'
--   • adds UNIQUE(id, module) as the composite-FK target
--   • adds the composite FKs from magazine_project_meta + access_grants
--   • deprecates profiles / project_memberships (superseded by people /
--     project_members) — dormant, NOT dropped here.
--
-- Idempotent. Run AFTER 001_initial_schema.sql AND 0002. Safe to re-run.
-- Backward-compat: the existing event/shoot projects/tasks/comments/sync are
-- untouched; magazine is added at the module level + the new access tables only.
-- ============================================================================

-- ─── Extend projects.module to allow magazine ────────────────────────────────
alter table public.projects drop constraint if exists projects_module_check;
alter table public.projects
  add constraint projects_module_check check (module in ('event', 'shoot', 'magazine'));

-- ─── Composite-FK target: UNIQUE(id, module) ─────────────────────────────────
-- id is already unique via PK, so this is trivially satisfiable; it exists only
-- so child tables can PIN module via a composite FK.
alter table public.projects drop constraint if exists projects_id_module_key;
alter table public.projects add constraint projects_id_module_key unique (id, module);

-- ─── Composite FKs from the access layer → projects(id, module) ───────────────
alter table public.magazine_project_meta drop constraint if exists magazine_project_meta_project_fk;
alter table public.magazine_project_meta
  add constraint magazine_project_meta_project_fk
  foreign key (project_id, module) references public.projects (id, module) on delete cascade;

alter table public.access_grants drop constraint if exists access_grants_project_fk;
alter table public.access_grants
  add constraint access_grants_project_fk
  foreign key (project_id, module) references public.projects (id, module) on delete cascade;

-- ─── Deprecate the superseded uuid-centric identity tables (dormant) ─────────
-- NOT dropped: they are still referenced by projects.created_by /
-- comments.author_id and may hold no data yet. Retire them in the content/auth
-- phase; do not build new references to them.
comment on table public.profiles is
  'DEPRECATED — superseded by public.people (text id, optional login, preserves string ids). Dormant until the content/auth phase.';
comment on table public.project_memberships is
  'DEPRECATED — superseded by public.project_members (person_id → people, with project_role). Dormant; retire when memberships migrate.';

-- ─── Safety net (only if a PRE-reconciliation 0001/0002 was applied) ─────────
-- The revised 0001 no longer creates these enums, and module is `text` everywhere,
-- so they are unused. Drop if they linger — wrapped so a lingering dependency
-- (e.g. an old 0003 still using the enum) does not hard-fail this migration.
do $$ begin
  drop type if exists access_module;
exception when dependent_objects_still_exist then
  raise notice '[0004] access_module still has dependents — re-apply the revised 0003, then drop manually.';
end $$;
do $$ begin
  drop type if exists project_lifecycle;
exception when dependent_objects_still_exist then
  raise notice '[0004] project_lifecycle still has dependents — drop manually after reconciling.';
end $$;


-- ########## supabase/migrations/0005_magazine_outreach.sql ##########

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


-- ########## supabase/migrations/0006_magazine_spreads.sql ##########

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


-- ########## supabase/migrations/0007_magazine_graphics.sql ##########

-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5F: magazine graphics content table
-- Migration: 0007_magazine_graphics
--
-- Paste into Supabase SQL Editor → Run.
--
-- Third magazine content slice (after 0005 outreach, 0006 spreads). Graphics are
-- the design deliverables. One row per graphic, project-scoped, cascade-deleted.
--
-- Two owned arrays stored as JSONB (read forward off their own graphic, never
-- reverse-queried), mirroring spreads.links / products.usps:
--   • image_ids    — string[] of media/IndexedDB keys (SOFT refs to images)
--   • result_links — VisualResultLink[] [{id,label,url}]
--
-- IMAGE BOUNDARY: preview_image_id and image_ids are SOFT references (IndexedDB
-- keys) ONLY. Image BYTES are never stored here — they live in IndexedDB and sync
-- via the existing media table. This table holds keys, not blobs.
--
-- Read-first + dual-write (same pattern as 0005/0006). Empty table → reads fall
-- back to the local store.
--
-- Notes:
--   • id reuses the local Graphic.id (UUID for app-created graphics; seed/legacy
--     non-UUID ids stay local-only and are skipped by the sync).
--   • project_id FKs projects(id) ON DELETE CASCADE (same as products / outreach / spreads).
--   • status is text + CHECK, pinned to the GraphicStatus domain.
--   • preview_image_id / article_id / visual_project_id / mood_tile_id are NULLABLE
--     text soft refs (no FK); the app maps '' ↔ NULL.
--   • dropbox_link is the legacy single asset link (migrated into result_links);
--     persisted for round-trip fidelity.
--   • sort_order is BIGINT: Graphic.order is Date.now()-based (~1.7e12) > int4 max.
--   • RLS intentionally deferred (consistent with the other content tables).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_graphics (
  id                uuid        PRIMARY KEY,
  project_id        uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title             text        NOT NULL DEFAULT '',
  format_detail     text        NOT NULL DEFAULT '',     -- free text: "A4 portrait · Print", …
  assignee          text        NOT NULL DEFAULT '',
  status            text        NOT NULL DEFAULT 'brief'
                      CHECK (status IN ('brief', 'design', 'review', 'final')),
  preview_image_id  text,                                -- soft ref (media/IndexedDB key), nullable
  image_ids         jsonb       NOT NULL DEFAULT '[]'::jsonb,  -- string[] of media/IndexedDB keys (soft refs)
  brief             text        NOT NULL DEFAULT '',
  notes             text        NOT NULL DEFAULT '',
  article_id        text,                                -- soft backlink to an Article, nullable (no FK)
  visual_project_id text,                                -- soft backlink to a VisualProject, nullable (no FK)
  mood_tile_id      text,                                -- soft link to a MoodTile, nullable (no FK)
  dropbox_link      text        NOT NULL DEFAULT '',     -- legacy single asset link (migrated into result_links)
  result_links      jsonb       NOT NULL DEFAULT '[]'::jsonb,  -- VisualResultLink[] [{id,label,url}]
  sort_order        bigint      NOT NULL DEFAULT 0,      -- mirrors Graphic.order (Date.now()-based)
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS magazine_graphics_project_idx ON magazine_graphics (project_id);

COMMENT ON TABLE  magazine_graphics                  IS 'Magazine graphics / design deliverables (Phase 5F). One row per graphic; project-scoped, cascade-deleted with the project.';
COMMENT ON COLUMN magazine_graphics.preview_image_id IS 'SOFT reference to a media/IndexedDB image key (no FK). Image bytes live in IndexedDB / the media table — never here.';
COMMENT ON COLUMN magazine_graphics.image_ids        IS 'string[] of media/IndexedDB keys (SOFT refs) — JSONB. Bytes are not stored here.';
COMMENT ON COLUMN magazine_graphics.result_links     IS 'Owned ordered VisualResultLink[] [{id,label,url}] — JSONB, not normalized.';
COMMENT ON COLUMN magazine_graphics.sort_order       IS 'Mirrors local Graphic.order (Date.now()-based) — BIGINT to fit.';


-- ########## supabase/migrations/0008_magazine_articles.sql ##########

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


-- ########## supabase/migrations/0009_magazine_visual_projects.sql ##########

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


-- ########## supabase/migrations/0010_magazine_tasks.sql ##########

-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5I: magazine tasks content table
-- Migration: 0010_magazine_tasks
--
-- Paste into Supabase SQL Editor → Run.
--
-- Sixth magazine content slice. Magazine tasks (MagazineTask) are the per-issue task
-- board. One row per task, project-scoped, cascade-deleted with the project.
--
-- SEPARATE from the shared `tasks` table (events/shoots, synced by useTaskSync).
-- Magazine tasks live in the local MagazineProject.tasks array and get their own
-- table here. The shared Task TYPE is reused only for its enum VALUES (status,
-- priority) in the CHECK constraints below — nothing in the shared task system is touched.
--
-- Flat columns only. Read-first + dual-write (same pattern as 0005–0009). Empty
-- table → reads fall back to the local store.
--
-- Notes:
--   • id reuses the local MagazineTask.id (UUID for app-created; seed/legacy
--     non-UUID ids stay local-only and are skipped by the sync).
--   • project_id FKs projects(id) ON DELETE CASCADE (same as the sibling tables).
--   • status / priority / link_type are text + CHECK, pinned to the shared
--     TaskStatus / Priority and the MagazineTaskLinkType domains.
--   • section is free-ish text (usually one of MAGAZINE_TASK_SECTIONS, but the app
--     type is plain string) → no CHECK.
--   • assigned_to / link_id are NULLABLE text soft refs (no FK); '' ↔ NULL.
--   • due_date is TEXT: it carries a meaningful '' sentinel, preserved exactly.
--   • sort_order is BIGINT (mirrors MagazineTask.order).
--   • app_updated_at holds the app entity's MagazineTask.updatedAt — DISTINCT from
--     updated_at (the DB write marker).
--   • RLS intentionally deferred (consistent with the other content tables).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_tasks (
  id             uuid        PRIMARY KEY,
  project_id     uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title          text        NOT NULL DEFAULT '',
  description    text        NOT NULL DEFAULT '',
  status         text        NOT NULL DEFAULT 'todo'
                   CHECK (status IN ('todo', 'in_progress', 'done')),
  priority       text        NOT NULL DEFAULT 'normal'
                   CHECK (priority IN ('low', 'normal', 'high')),
  due_date       text        NOT NULL DEFAULT '',     -- ISO date string, '' if unset
  assigned_to    text,                                -- soft ref (team/crew member), nullable (no FK)
  section        text        NOT NULL DEFAULT '',     -- '' | one of MAGAZINE_TASK_SECTIONS (free-ish)
  link_type      text        NOT NULL DEFAULT 'none'
                   CHECK (link_type IN ('none', 'article', 'visual', 'graphic', 'spread')),
  link_id        text,                                -- soft ref to the linked entity, nullable (no FK)
  sort_order     bigint      NOT NULL DEFAULT 0,      -- mirrors MagazineTask.order
  app_updated_at timestamptz NOT NULL DEFAULT now(),  -- app entity's MagazineTask.updatedAt
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()   -- DB write marker (distinct from app_updated_at)
);

CREATE INDEX IF NOT EXISTS magazine_tasks_project_idx ON magazine_tasks (project_id);

COMMENT ON TABLE  magazine_tasks                IS 'Magazine task board (Phase 5I). One row per MagazineTask; project-scoped, cascade-deleted. Separate from the shared tasks table (events/shoots).';
COMMENT ON COLUMN magazine_tasks.link_id        IS 'Soft ref to the linked content entity (article/visual/graphic/spread) within the project (no FK). '''' when link_type=none.';
COMMENT ON COLUMN magazine_tasks.app_updated_at IS 'The app entity MagazineTask.updatedAt. DISTINCT from updated_at (the DB write marker).';


-- ########## supabase/migrations/0011_magazine_mood_tiles.sql ##########

-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5J: magazine mood tiles content table
-- Migration: 0011_magazine_mood_tiles
--
-- Paste into Supabase SQL Editor → Run.
--
-- Seventh magazine content slice. Mood tiles are the Visual moodboard tiles. One row
-- per tile, project-scoped, cascade-deleted with the project.
--
-- IMAGE BOUNDARY: image_id is a SOFT reference (IndexedDB/media key) ONLY. Image bytes
-- are never stored here — they live in IndexedDB and sync via the existing media table.
-- '' for color-swatch-only tiles.
--
-- Flat columns only; this entity has NO app-level updatedAt (only created_at). Read-
-- first + dual-write (same pattern as 0005–0010). Empty table → reads fall back to local.
--
-- Notes:
--   • id reuses the local MoodTile.id (UUID for app-created; seed/legacy non-UUID ids
--     stay local-only and are skipped by the sync).
--   • project_id FKs projects(id) ON DELETE CASCADE (same as the sibling tables).
--   • image_id is text, '' preserved exactly (no '' ↔ null mapping) — soft ref, no FK.
--   • color is a hex string, '' if not set.
--   • sort_order is BIGINT (mirrors MoodTile.order, Date.now()-based).
--   • RLS intentionally deferred (consistent with the other content tables).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_mood_tiles (
  id          uuid        PRIMARY KEY,
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  image_id    text        NOT NULL DEFAULT '',     -- soft ref (IndexedDB/media key); '' for color swatches
  caption     text        NOT NULL DEFAULT '',
  color       text        NOT NULL DEFAULT '',     -- hex string e.g. '#C4B5A3', '' if not set
  sort_order  bigint      NOT NULL DEFAULT 0,      -- mirrors MoodTile.order (Date.now()-based)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()   -- DB write marker (no app updatedAt on this entity)
);

CREATE INDEX IF NOT EXISTS magazine_mood_tiles_project_idx ON magazine_mood_tiles (project_id);

COMMENT ON TABLE  magazine_mood_tiles          IS 'Magazine Visual moodboard tiles (Phase 5J). One row per tile; project-scoped, cascade-deleted.';
COMMENT ON COLUMN magazine_mood_tiles.image_id IS 'SOFT reference to a media/IndexedDB image key (no FK). Image bytes live in IndexedDB / the media table — never here. '''' for color-swatch tiles.';
COMMENT ON COLUMN magazine_mood_tiles.sort_order IS 'Mirrors local MoodTile.order (Date.now()-based) — BIGINT to fit.';


-- ########## supabase/migrations/0012_magazine_graphics_inspo.sql ##########

-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5K: magazine graphics inspiration tiles content table
-- Migration: 0012_magazine_graphics_inspo
--
-- Paste into Supabase SQL Editor → Run.
--
-- Eighth magazine content slice. Graphics inspo items are the Graphics section's
-- inspiration board (kept separate from the graphics deliverables). One row per item,
-- project-scoped, cascade-deleted with the project. Near-identical to mood tiles (0011).
--
-- IMAGE BOUNDARY: image_id is a SOFT reference (IndexedDB/media key) ONLY. Image bytes
-- are never stored here — they live in IndexedDB and sync via the existing media table.
-- '' until an image is uploaded.
--
-- Flat columns only; this entity has NO app-level updatedAt (only created_at) and no
-- reorder action. Read-first + dual-write (same pattern as 0005–0011). Empty table →
-- reads fall back to the local store.
--
-- Notes:
--   • id reuses the local GraphicsInspoItem.id (UUID for app-created; seed/legacy
--     non-UUID ids stay local-only and are skipped by the sync).
--   • project_id FKs projects(id) ON DELETE CASCADE (same as the sibling tables).
--   • image_id is text, '' preserved exactly (no '' ↔ null) — soft ref, no FK.
--   • source_url is free text (optional link to where the inspiration came from).
--   • sort_order is BIGINT (mirrors GraphicsInspoItem.order, Date.now()-based).
--   • RLS intentionally deferred (consistent with the other content tables).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_graphics_inspo (
  id          uuid        PRIMARY KEY,
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  image_id    text        NOT NULL DEFAULT '',     -- soft ref (IndexedDB/media key); '' if not uploaded
  caption     text        NOT NULL DEFAULT '',
  source_url  text        NOT NULL DEFAULT '',     -- optional link to the inspiration source
  sort_order  bigint      NOT NULL DEFAULT 0,      -- mirrors GraphicsInspoItem.order (Date.now()-based)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()   -- DB write marker (no app updatedAt on this entity)
);

CREATE INDEX IF NOT EXISTS magazine_graphics_inspo_project_idx ON magazine_graphics_inspo (project_id);

COMMENT ON TABLE  magazine_graphics_inspo          IS 'Magazine Graphics inspiration board tiles (Phase 5K). One row per item; project-scoped, cascade-deleted.';
COMMENT ON COLUMN magazine_graphics_inspo.image_id IS 'SOFT reference to a media/IndexedDB image key (no FK). Image bytes live in IndexedDB / the media table — never here. '''' if not uploaded.';
COMMENT ON COLUMN magazine_graphics_inspo.sort_order IS 'Mirrors local GraphicsInspoItem.order (Date.now()-based) — BIGINT to fit.';


-- ########## supabase/migrations/0013_magazine_budget_items.sql ##########

-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5L: magazine budget items content table
-- Migration: 0013_magazine_budget_items
--
-- Paste into Supabase SQL Editor → Run.
--
-- Ninth magazine content slice. Budget line items (the shared BudgetItem shape) for a
-- magazine issue. One row per item, project-scoped, cascade-deleted with the project.
--
-- SEPARATE from any event/shoot budget handling. The shared BudgetItem TYPE is reused
-- only for its field shape + enum VALUES (status) in the CHECK below — nothing in the
-- shared/event/shoot budget code is touched. totalBudget is NOT here (it is a project
-- summary field, synced separately in Phase 5B via magazine_project_meta.total_budget).
--
-- BudgetItem has NO order and NO updatedAt fields, so there is intentionally no
-- sort_order and no app_updated_at column here.
--
-- BLOB BOUNDARY: invoice_file_id is a SOFT reference (IndexedDB key for the stored
-- invoice Blob) ONLY. The Blob bytes are never stored here — they live in IndexedDB.
-- invoice_file_name is just the display name.
--
-- Read-first + dual-write (same pattern as 0005–0012). Empty table → reads fall back
-- to the local store.
--
-- Notes:
--   • id reuses the local BudgetItem.id (UUID for app-created; seed/legacy non-UUID
--     ids stay local-only and are skipped by the sync).
--   • project_id FKs projects(id) ON DELETE CASCADE (same as the sibling tables).
--   • status is text + CHECK, pinned to the shared BudgetItemStatus domain.
--   • category is free text (no enum in the shared type) → no CHECK.
--   • estimated_cost / actual_cost are numeric (money).
--   • invoice_file_id is NULLABLE text soft ref (no FK); the app maps '' ↔ NULL.
--   • RLS intentionally deferred (consistent with the other content tables).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_budget_items (
  id                uuid        PRIMARY KEY,
  project_id        uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description       text        NOT NULL DEFAULT '',
  category          text        NOT NULL DEFAULT '',     -- free text (no enum)
  supplier          text        NOT NULL DEFAULT '',
  estimated_cost    numeric     NOT NULL DEFAULT 0,
  actual_cost       numeric     NOT NULL DEFAULT 0,
  status            text        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'paid')),
  notes             text        NOT NULL DEFAULT '',
  invoice_file_name text        NOT NULL DEFAULT '',     -- display name
  invoice_file_id   text,                                -- soft ref (IndexedDB blob key), nullable; bytes NOT stored
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()   -- DB write marker (no app updatedAt on this entity)
);

CREATE INDEX IF NOT EXISTS magazine_budget_items_project_idx ON magazine_budget_items (project_id);

COMMENT ON TABLE  magazine_budget_items                 IS 'Magazine budget line items (Phase 5L). One row per item; project-scoped, cascade-deleted. totalBudget is separate (magazine_project_meta, Phase 5B).';
COMMENT ON COLUMN magazine_budget_items.invoice_file_id IS 'SOFT reference to an IndexedDB blob key for the invoice (no FK). Blob bytes live in IndexedDB — never here. NULL when no invoice.';


-- ########## supabase/migrations/0014_magazine_writer_hours.sql ##########

-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5M: magazine writer hours content table
-- Migration: 0014_magazine_writer_hours
--
-- Paste into Supabase SQL Editor → Run.
--
-- Tenth magazine content slice — and the FIRST of the writing-workspace arrays. Writer
-- hours are a project-level time log (project.writerHours), each entry optionally linked
-- to an article. One row per entry, project-scoped, cascade-deleted with the project.
--
-- CRITICAL BOUNDARY: article_id is NOT a hard FK to magazine_articles. A writer-hours
-- entry can be general/unlinked (articleId === ''), which a FK would reject. So article_id
-- is a NULLABLE text soft ref ('' ↔ NULL), and ONLY project_id is a real foreign key.
-- writer_id is likewise a nullable text soft ref (MagazineTeamMember id, '' if unset).
--
-- Flat columns only; no order, no updatedAt on this entity. Read-first + dual-write
-- (same pattern as 0005–0013). Empty table → reads fall back to the local store.
--
-- Notes:
--   • id reuses the local WriterHoursEntry.id (UUID for app-created; seed/legacy
--     non-UUID ids stay local-only and are skipped by the sync).
--   • project_id FKs projects(id) ON DELETE CASCADE (the only FK here).
--   • date is TEXT (ISO date string), '' preserved exactly.
--   • hours is numeric.
--   • billable is boolean.
--   • RLS intentionally deferred (consistent with the other content tables).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_writer_hours (
  id          uuid        PRIMARY KEY,
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date        text        NOT NULL DEFAULT '',     -- ISO date string, '' if unset
  hours       numeric     NOT NULL DEFAULT 0,
  note        text        NOT NULL DEFAULT '',
  article_id  text,                                -- soft ref ('' = general/unlinked), nullable; NOT a hard FK
  writer_id   text,                                -- soft ref to MagazineTeamMember, nullable (no FK)
  billable    boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()   -- DB write marker (no app updatedAt on this entity)
);

CREATE INDEX IF NOT EXISTS magazine_writer_hours_project_idx ON magazine_writer_hours (project_id);

COMMENT ON TABLE  magazine_writer_hours            IS 'Magazine writer hours log (Phase 5M). One row per entry; project-scoped, cascade-deleted. First writing-workspace array.';
COMMENT ON COLUMN magazine_writer_hours.article_id IS 'Soft ref to an Article id within the project (no FK — entries may be general, articleId=''''). '''' ↔ NULL.';
COMMENT ON COLUMN magazine_writer_hours.writer_id  IS 'Soft ref to a MagazineTeamMember id (no FK). '''' ↔ NULL.';


-- ########## supabase/migrations/0015_magazine_article_versions.sql ##########

-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5N: magazine article versions content table
-- Migration: 0015_magazine_article_versions
--
-- Paste into Supabase SQL Editor → Run.
--
-- Eleventh magazine content slice — second writing-workspace array, and the FIRST with
-- a hard article FK. Article versions are readable snapshots of an article's body. One
-- row per version, project-scoped AND article-scoped, cascade-deleted with either parent.
--
-- DUAL FK (locked decision): every version belongs to a real article, so:
--   • article_id → magazine_articles(id) ON DELETE CASCADE  (NOT NULL)
--   • project_id → projects(id)          ON DELETE CASCADE  (NOT NULL)
-- The app push guard skips versions whose parent article id is a non-UUID SEED article
-- (those stay local-only, like the seed article itself), so this FK is always satisfiable.
-- Both FKs self-heal: project_id after the Phase 4 project push, article_id after the
-- Phase 5G article push (a 23503 on either is logged, then succeeds on the next change).
--
-- Versions are add/remove only (immutable once created — restore copies the body back
-- onto the ARTICLE, not the version). Flat columns only; no order, no updatedAt.
--
-- Notes:
--   • id reuses the local ArticleVersion.id (UUID for app-created; non-UUID seed ids
--     stay local-only and are skipped by the sync).
--   • author_id is a NULLABLE text soft ref (no FK); '' ↔ NULL. author_name is a snapshot.
--   • body may be large (a full snapshot of the article body) → text.
--   • RLS intentionally deferred (consistent with the other content tables).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_article_versions (
  id          uuid        PRIMARY KEY,
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  article_id  uuid        NOT NULL REFERENCES magazine_articles(id) ON DELETE CASCADE,
  label       text        NOT NULL DEFAULT '',     -- e.g. "v3" or "Draft sent to Sarah"
  body        text        NOT NULL DEFAULT '',     -- snapshot of the article body (may be large)
  word_count  integer     NOT NULL DEFAULT 0,      -- computed at snapshot time
  author_id   text,                                -- soft ref (app user), nullable (no FK)
  author_name text        NOT NULL DEFAULT '',     -- name snapshot
  note        text        NOT NULL DEFAULT '',     -- optional "what changed" note
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()   -- DB write marker (no app updatedAt on this entity)
);

CREATE INDEX IF NOT EXISTS magazine_article_versions_project_idx ON magazine_article_versions (project_id);
CREATE INDEX IF NOT EXISTS magazine_article_versions_article_idx ON magazine_article_versions (article_id);

COMMENT ON TABLE  magazine_article_versions           IS 'Magazine article body snapshots (Phase 5N). One row per version; FKs both project and article (CASCADE). Add/remove only.';
COMMENT ON COLUMN magazine_article_versions.article_id IS 'Hard FK to magazine_articles(id) CASCADE. Versions of non-UUID seed articles are skipped by the app sync (stay local-only).';
COMMENT ON COLUMN magazine_article_versions.author_id  IS 'Soft ref to the app user who snapshotted (no FK). '''' ↔ NULL.';


-- ########## supabase/migrations/0016_magazine_article_comments.sql ##########

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


-- ########## supabase/migrations/0017_link_auth_users.sql ##########

-- ============================================================================
-- Phase 6B · 0017 — Link Supabase Auth users ↔ app people rows
-- ----------------------------------------------------------------------------
-- Sets people.auth_user_id = auth.users.id by matching email, so that
-- current_person_id() (0003) resolves once a user signs in. This is the glue
-- that makes the 0003 RLS policies actually authorize a signed-in user.
--
-- WHY a trigger (not the client): under 0003 RLS, people writes are admin-only,
-- so the client cannot self-set auth_user_id. This SECURITY DEFINER trigger runs
-- as owner and links server-side. NO service-role key is involved.
--
-- Trust model: people.email is admin-seeded (controlled), and we only link once
-- auth.users.email_confirmed_at is set (the user proved control of that email).
-- An auth user whose email matches no people row simply isn't linked → treated as
-- anonymous by RLS → sees nothing remote → local fallback (safe).
--
-- NOTE: people.email is citext (case-insensitive) and NON-UNIQUE (0002). Duplicate
-- emails would link multiple people rows to one auth user — admin-controlled, so a
-- non-issue in practice; flagged for awareness.
--
-- Apply in the Supabase SQL Editor (which has the privileges to trigger auth.users),
-- AFTER 0003. Idempotent (create or replace / drop trigger if exists).
-- ============================================================================

create or replace function public.link_auth_user_to_person()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only link confirmed emails. Admin-created users are auto-confirmed → this fires
  -- on INSERT for them; self-signups link on the confirmation UPDATE.
  if new.email_confirmed_at is null then
    return new;
  end if;

  update public.people
     set auth_user_id = new.id
   where email = new.email                      -- citext: case-insensitive match
     and auth_user_id is distinct from new.id;   -- idempotent; skip if already linked to this id

  return new;
end;
$$;

comment on function public.link_auth_user_to_person() is
  'Links people.auth_user_id ↔ auth.users.id by confirmed email. SECURITY DEFINER so it can write people under RLS. No service-role key.';

-- Fire on new users (auto-confirmed admins) and on email confirmation of existing users.
drop trigger if exists on_auth_user_confirmed_link on auth.users;
create trigger on_auth_user_confirmed_link
  after insert or update of email_confirmed_at on auth.users
  for each row
  execute function public.link_auth_user_to_person();

-- ─── One-time backfill: link already-existing confirmed auth users ───────────
-- Safe to re-run (only fills rows where auth_user_id is still null).
update public.people p
   set auth_user_id = u.id
  from auth.users u
 where u.email = p.email
   and u.email_confirmed_at is not null
   and p.auth_user_id is null;


-- ########## supabase/migrations/0018_rls_magazine_outreach.sql ##########

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


-- ########## supabase/migrations/0019_rls_magazine_content.sql ##########

-- ============================================================================
-- Phase 6C · 0019 — Row-Level Security for the remaining magazine content tables
-- ----------------------------------------------------------------------------
-- Completes the content-table RLS rollout (outreach was 0018). Same proven pattern,
-- applied to the other 11 tables, grouped by access section. All policies target the
-- `authenticated` role only → `anon` matches nothing → denied. Helpers (is_app_admin,
-- can_view_project, my_section_level) are defined in 0003 — apply 0003 (+ 0017 linking,
-- + 0018) BEFORE this.
--
-- Per table:
--   • READ  — admin OR can_view_project('magazine', project_id)   [project-level view]
--   • WRITE — admin OR my_section_level('magazine', project_id, '<dotted key>') = 'edit'
--
-- Table → section_key map (verified against MODULE_SECTIONS + access_grants.section_key;
-- '*' project default is handled inside my_section_level). NOTE the section keys are the
-- FULL dotted keys, and SPREAD is SINGULAR ('magazine.spread') though the table is plural:
--   magazine_spreads             → magazine.spread
--   magazine_graphics            → magazine.graphics
--   magazine_graphics_inspo      → magazine.graphics
--   magazine_tasks               → magazine.tasks
--   magazine_budget_items        → magazine.budget
--   magazine_visual_projects     → magazine.visual
--   magazine_mood_tiles          → magazine.visual
--   magazine_articles            → magazine.writing
--   magazine_article_versions    → magazine.writing
--   magazine_article_comments    → magazine.writing
--   magazine_writer_hours        → magazine.writing
--
-- No client read-authority flip: every page stays `remote ?? local`. This only makes the
-- remote side return AUTHORIZED rows once signed in + linked; anon/unlinked → local fallback.
-- Apply in the Supabase SQL Editor. Idempotent (drop policy if exists guards reruns).
-- ============================================================================

-- ─── Section: magazine.spread ────────────────────────────────────────────────
alter table public.magazine_spreads enable row level security;

drop policy if exists mag_spreads_select on public.magazine_spreads;
create policy mag_spreads_select on public.magazine_spreads
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_spreads_insert on public.magazine_spreads;
create policy mag_spreads_insert on public.magazine_spreads
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.spread') = 'edit' );

drop policy if exists mag_spreads_update on public.magazine_spreads;
create policy mag_spreads_update on public.magazine_spreads
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.spread') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.spread') = 'edit' );

drop policy if exists mag_spreads_delete on public.magazine_spreads;
create policy mag_spreads_delete on public.magazine_spreads
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.spread') = 'edit' );

-- ─── Section: magazine.graphics (graphics + graphics inspiration) ────────────
alter table public.magazine_graphics enable row level security;

drop policy if exists mag_graphics_select on public.magazine_graphics;
create policy mag_graphics_select on public.magazine_graphics
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_graphics_insert on public.magazine_graphics;
create policy mag_graphics_insert on public.magazine_graphics
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.graphics') = 'edit' );

drop policy if exists mag_graphics_update on public.magazine_graphics;
create policy mag_graphics_update on public.magazine_graphics
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.graphics') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.graphics') = 'edit' );

drop policy if exists mag_graphics_delete on public.magazine_graphics;
create policy mag_graphics_delete on public.magazine_graphics
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.graphics') = 'edit' );

alter table public.magazine_graphics_inspo enable row level security;

drop policy if exists mag_gfx_inspo_select on public.magazine_graphics_inspo;
create policy mag_gfx_inspo_select on public.magazine_graphics_inspo
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_gfx_inspo_insert on public.magazine_graphics_inspo;
create policy mag_gfx_inspo_insert on public.magazine_graphics_inspo
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.graphics') = 'edit' );

drop policy if exists mag_gfx_inspo_update on public.magazine_graphics_inspo;
create policy mag_gfx_inspo_update on public.magazine_graphics_inspo
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.graphics') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.graphics') = 'edit' );

drop policy if exists mag_gfx_inspo_delete on public.magazine_graphics_inspo;
create policy mag_gfx_inspo_delete on public.magazine_graphics_inspo
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.graphics') = 'edit' );

-- ─── Section: magazine.tasks ─────────────────────────────────────────────────
alter table public.magazine_tasks enable row level security;

drop policy if exists mag_tasks_select on public.magazine_tasks;
create policy mag_tasks_select on public.magazine_tasks
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_tasks_insert on public.magazine_tasks;
create policy mag_tasks_insert on public.magazine_tasks
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.tasks') = 'edit' );

drop policy if exists mag_tasks_update on public.magazine_tasks;
create policy mag_tasks_update on public.magazine_tasks
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.tasks') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.tasks') = 'edit' );

drop policy if exists mag_tasks_delete on public.magazine_tasks;
create policy mag_tasks_delete on public.magazine_tasks
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.tasks') = 'edit' );

-- ─── Section: magazine.budget ────────────────────────────────────────────────
alter table public.magazine_budget_items enable row level security;

drop policy if exists mag_budget_select on public.magazine_budget_items;
create policy mag_budget_select on public.magazine_budget_items
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_budget_insert on public.magazine_budget_items;
create policy mag_budget_insert on public.magazine_budget_items
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.budget') = 'edit' );

drop policy if exists mag_budget_update on public.magazine_budget_items;
create policy mag_budget_update on public.magazine_budget_items
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.budget') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.budget') = 'edit' );

drop policy if exists mag_budget_delete on public.magazine_budget_items;
create policy mag_budget_delete on public.magazine_budget_items
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.budget') = 'edit' );

-- ─── Section: magazine.visual (visual projects + mood tiles) ─────────────────
alter table public.magazine_visual_projects enable row level security;

drop policy if exists mag_visual_select on public.magazine_visual_projects;
create policy mag_visual_select on public.magazine_visual_projects
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_visual_insert on public.magazine_visual_projects;
create policy mag_visual_insert on public.magazine_visual_projects
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.visual') = 'edit' );

drop policy if exists mag_visual_update on public.magazine_visual_projects;
create policy mag_visual_update on public.magazine_visual_projects
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.visual') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.visual') = 'edit' );

drop policy if exists mag_visual_delete on public.magazine_visual_projects;
create policy mag_visual_delete on public.magazine_visual_projects
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.visual') = 'edit' );

alter table public.magazine_mood_tiles enable row level security;

drop policy if exists mag_mood_select on public.magazine_mood_tiles;
create policy mag_mood_select on public.magazine_mood_tiles
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_mood_insert on public.magazine_mood_tiles;
create policy mag_mood_insert on public.magazine_mood_tiles
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.visual') = 'edit' );

drop policy if exists mag_mood_update on public.magazine_mood_tiles;
create policy mag_mood_update on public.magazine_mood_tiles
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.visual') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.visual') = 'edit' );

drop policy if exists mag_mood_delete on public.magazine_mood_tiles;
create policy mag_mood_delete on public.magazine_mood_tiles
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.visual') = 'edit' );

-- ─── Section: magazine.writing (articles + versions + comments + writer hours) ─
-- The article-workspace children (versions/comments/writer_hours) all gate on the
-- SAME writing section as the article itself (they live under the Writing tab).
alter table public.magazine_articles enable row level security;

drop policy if exists mag_articles_select on public.magazine_articles;
create policy mag_articles_select on public.magazine_articles
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_articles_insert on public.magazine_articles;
create policy mag_articles_insert on public.magazine_articles
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

drop policy if exists mag_articles_update on public.magazine_articles;
create policy mag_articles_update on public.magazine_articles
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

drop policy if exists mag_articles_delete on public.magazine_articles;
create policy mag_articles_delete on public.magazine_articles
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

alter table public.magazine_article_versions enable row level security;

drop policy if exists mag_art_versions_select on public.magazine_article_versions;
create policy mag_art_versions_select on public.magazine_article_versions
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_art_versions_insert on public.magazine_article_versions;
create policy mag_art_versions_insert on public.magazine_article_versions
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

drop policy if exists mag_art_versions_update on public.magazine_article_versions;
create policy mag_art_versions_update on public.magazine_article_versions
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

drop policy if exists mag_art_versions_delete on public.magazine_article_versions;
create policy mag_art_versions_delete on public.magazine_article_versions
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

alter table public.magazine_article_comments enable row level security;

drop policy if exists mag_art_comments_select on public.magazine_article_comments;
create policy mag_art_comments_select on public.magazine_article_comments
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_art_comments_insert on public.magazine_article_comments;
create policy mag_art_comments_insert on public.magazine_article_comments
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

drop policy if exists mag_art_comments_update on public.magazine_article_comments;
create policy mag_art_comments_update on public.magazine_article_comments
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

drop policy if exists mag_art_comments_delete on public.magazine_article_comments;
create policy mag_art_comments_delete on public.magazine_article_comments
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

alter table public.magazine_writer_hours enable row level security;

drop policy if exists mag_writer_hours_select on public.magazine_writer_hours;
create policy mag_writer_hours_select on public.magazine_writer_hours
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_writer_hours_insert on public.magazine_writer_hours;
create policy mag_writer_hours_insert on public.magazine_writer_hours
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

drop policy if exists mag_writer_hours_update on public.magazine_writer_hours;
create policy mag_writer_hours_update on public.magazine_writer_hours
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

drop policy if exists mag_writer_hours_delete on public.magazine_writer_hours;
create policy mag_writer_hours_delete on public.magazine_writer_hours
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );


-- ########## supabase/migrations/0020_projects_insert.sql ##########

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


-- ########## CLEANUP: drop Phase-A permissive policies (close the anon hole) ##########
-- 001_initial_schema created *_phase_a policies (USING(true), ALL roles incl anon).
-- 0003 tightened `projects` but never dropped them; permissive policies OR-combine, so
-- the open policy would override the scoped model and expose data to anon. Drop them:
--   projects                      -> governed by 0003's scoped policies
--   profiles/project_memberships  -> RLS-enabled, no policy = deny-all (app uses people/grants instead)
--   tasks/comments                -> RLS-enabled, no policy = deny-all (not synced by the client; local-only as before)
drop policy if exists "projects_phase_a"    on public.projects;
drop policy if exists "profiles_phase_a"    on public.profiles;
drop policy if exists "memberships_phase_a" on public.project_memberships;
drop policy if exists "tasks_phase_a"       on public.tasks;
drop policy if exists "comments_phase_a"    on public.comments;
