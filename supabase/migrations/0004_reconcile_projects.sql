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
