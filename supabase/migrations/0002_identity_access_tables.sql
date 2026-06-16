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
