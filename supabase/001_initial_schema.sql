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

alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table comments;


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
