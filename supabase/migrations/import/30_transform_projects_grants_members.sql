-- ============================================================================
-- Phase 1 · import/30 — Projects, magazine meta, grants, and members
-- ----------------------------------------------------------------------------
-- Upserts into the EXISTING public.projects (module text, reconciled by 0004 to
-- allow 'magazine'). Run AFTER 0004 (projects has the extended module CHECK +
-- UNIQUE(id, module) + the composite FKs), AFTER import/10 (people exist), and
-- after any confirmed merges (import/40). Idempotent. Every project reference
-- goes through stg.map_project_id() so non-UUID seed ids map consistently.
-- (created_by is left null — populated in the auth phase.)
--
-- Rows are guarded so a missing person/project is SKIPPED (never an FK error);
-- anything skipped is surfaced by import/IMPORT_MAPPING.md's verification query.
-- ============================================================================

-- ─── projects (base) — magazine ──────────────────────────────────────────────
insert into public.projects (id, module, name, description, status, created_at, updated_at)
select stg.map_project_id(p->>'id'), 'magazine',
       coalesce(p->>'name', ''), coalesce(p->>'description', ''), 'active',
       coalesce((p->>'createdAt')::timestamptz, now()),
       coalesce((p->>'updatedAt')::timestamptz, now())
from stg.import_blob b, jsonb_array_elements(b.data->'magazineProjects') p
on conflict (id) do update set
  name = excluded.name, description = excluded.description, updated_at = excluded.updated_at;

-- ─── projects (base) — events / shoots (summary only) ────────────────────────
-- Needed so event/shoot memberships and grants have a project to reference.
-- Their content + per-module detail tables come in later phases.
insert into public.projects (id, module, name, description, status, created_at, updated_at)
select stg.map_project_id(p->>'id'), 'event',
       coalesce(p->>'name', ''), coalesce(p->>'description', ''), 'active',
       coalesce((p->>'createdAt')::timestamptz, now()),
       coalesce((p->>'updatedAt')::timestamptz, now())
from stg.import_blob b, jsonb_array_elements(coalesce(b.data->'eventProjects', '[]'::jsonb)) p
on conflict (id) do update set
  name = excluded.name, description = excluded.description, updated_at = excluded.updated_at;

insert into public.projects (id, module, name, description, status, created_at, updated_at)
select stg.map_project_id(p->>'id'), 'shoot',
       coalesce(p->>'name', ''), coalesce(p->>'description', ''), 'active',
       coalesce((p->>'createdAt')::timestamptz, now()),
       coalesce((p->>'updatedAt')::timestamptz, now())
from stg.import_blob b, jsonb_array_elements(coalesce(b.data->'shootProjects', '[]'::jsonb)) p
on conflict (id) do update set
  name = excluded.name, description = excluded.description, updated_at = excluded.updated_at;

-- ─── magazine_project_meta (1:1 detail) ──────────────────────────────────────
insert into public.magazine_project_meta
  (project_id, edition_number, publication_date, theme, total_budget, editorial_status, notes)
select stg.map_project_id(p->>'id'),
       coalesce(p->>'editionNumber', ''),
       stg.safe_date(p->>'publicationDate'),
       coalesce(p->>'theme', ''),
       coalesce((p->>'totalBudget')::numeric, 0),
       coalesce(p->>'status', 'planning'),
       coalesce(p->>'notes', '')
from stg.import_blob b, jsonb_array_elements(b.data->'magazineProjects') p
on conflict (project_id) do update set
  edition_number = excluded.edition_number, publication_date = excluded.publication_date,
  theme = excluded.theme, total_budget = excluded.total_budget,
  editorial_status = excluded.editorial_status, notes = excluded.notes;

-- ─── access_grants (sections map → rows) ─────────────────────────────────────
-- '*' and explicit section keys both become rows; 'inherit' never appears in the
-- client map (the store deletes inherited keys), so nothing to skip.
insert into public.access_grants (person_id, module, project_id, section_key, level)
select ag.pid,
       g->>'module',
       stg.map_project_id(g->>'projectId'),
       s.key,
       (s.value #>> '{}')::access_level
from stg.import_blob b,
     jsonb_each(b.data->'accessGrants') as ag(pid, grants),
     jsonb_array_elements(ag.grants) as g,
     jsonb_each(g->'sections') as s(key, value)
where exists (select 1 from public.people pe where pe.id = ag.pid)
  and exists (
        select 1 from public.projects pr
         where pr.id = stg.map_project_id(g->>'projectId')
           and pr.module = g->>'module'
      )
on conflict (person_id, module, project_id, section_key) do update set level = excluded.level;

-- ─── project_members — magazine roster (person_id = teamMember, role kept) ────
insert into public.project_members (project_id, person_id, project_role)
select stg.map_project_id(p->>'id'), tm->>'id', coalesce(tm->>'role', '')
from stg.import_blob b,
     jsonb_array_elements(b.data->'magazineProjects') p,
     jsonb_array_elements(coalesce(p->'teamMembers', '[]'::jsonb)) tm
where exists (select 1 from public.people pe where pe.id = tm->>'id')
  and exists (select 1 from public.projects pr where pr.id = stg.map_project_id(p->>'id'))
on conflict (project_id, person_id) do update set project_role = excluded.project_role;

-- ─── project_members — memberships (person_id = login user, no role) ─────────
-- For magazine, a confirmed merge will have already collapsed userId↔teamMember
-- to one person; this just ensures the login person is recorded on the project.
-- For event/shoot, person_id is the LOGIN user (their roster ids are NOT yet
-- people — deferred to the event/shoot unification phase). `do nothing` so a
-- role set by the roster import is preserved.
insert into public.project_members (project_id, person_id, project_role)
select stg.map_project_id(l->>'projectId'), m.uid, ''
from stg.import_blob b,
     jsonb_each(b.data->'memberships') as m(uid, links),
     jsonb_array_elements(m.links) as l
where exists (select 1 from public.people pe where pe.id = m.uid)
  and exists (
        select 1 from public.projects pr
         where pr.id = stg.map_project_id(l->>'projectId')
           and pr.module = l->>'module'
      )
on conflict (project_id, person_id) do nothing;
