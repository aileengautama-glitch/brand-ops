-- ============================================================================
-- Phase 1 · import/40 — Manual person-merge function
-- ----------------------------------------------------------------------------
-- MANUAL use only, AFTER reviewing stg.duplicate_report (import/20).
-- Merges a duplicate person (p_from) INTO the survivor (p_into), repointing
-- access_grants + project_members, then deletes the source row.
--
-- Survivor guidance: keep the LOGIN ACCOUNT (status 'account') as the target so
-- the merged human can log in; merge the promoted/manual record into it.
--
--   select stg.merge_person('<from_id>', '<into_id>');
-- ============================================================================

create or replace function stg.merge_person(p_from text, p_into text)
returns void language plpgsql as $$
begin
  if p_from = p_into then
    raise notice 'merge_person: source = target, nothing to do'; return;
  end if;
  if not exists (select 1 from public.people where id = p_from) then
    raise exception 'merge_person: source person % not found', p_from;
  end if;
  if not exists (select 1 from public.people where id = p_into) then
    raise exception 'merge_person: target person % not found', p_into;
  end if;

  -- access_grants: move rows that don't collide with the target's existing grant
  -- (same module/project/section); drop the rest (target wins).
  update public.access_grants g
     set person_id = p_into
   where g.person_id = p_from
     and not exists (
       select 1 from public.access_grants t
        where t.person_id = p_into
          and t.module = g.module
          and t.project_id = g.project_id
          and t.section_key = g.section_key
     );
  delete from public.access_grants where person_id = p_from;

  -- project_members: move rows that don't collide (same project); drop the rest.
  -- If the survivor lacks a project_role but the source had one, carry it over.
  update public.project_members m
     set person_id = p_into
   where m.person_id = p_from
     and not exists (
       select 1 from public.project_members t
        where t.person_id = p_into and t.project_id = m.project_id
     );
  update public.project_members t
     set project_role = s.project_role
  from public.project_members s
   where s.person_id = p_from and t.person_id = p_into
     and s.project_id = t.project_id
     and coalesce(t.project_role, '') = '' and coalesce(s.project_role, '') <> '';
  delete from public.project_members where person_id = p_from;

  -- PHASE 3 TODO: repoint magazine content assignment fields
  --   (assigned_writer_id, approver_id, owner_id, writer_id, task assignee, …)
  --   from p_from → p_into once those content tables exist. Until then, run
  --   merges BEFORE importing content so the content import lands on the survivor.

  delete from public.people where id = p_from;
  raise notice 'merge_person: merged % into %', p_from, p_into;
end $$;

comment on function stg.merge_person(text, text) is
  'MANUAL: merge duplicate person p_from into survivor p_into (repoints grants + members, deletes source). Review stg.duplicate_report first. Content refs repointed in Phase 3.';
