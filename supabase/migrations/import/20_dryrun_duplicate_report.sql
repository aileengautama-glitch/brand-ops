-- ============================================================================
-- Phase 1 · import/20 — Duplicate-merge DRY RUN (read-only)
-- ----------------------------------------------------------------------------
-- Creates a report view of LIKELY duplicate people. It changes NOTHING.
-- Review it, then merge confirmed pairs manually with stg.merge_person()
-- (import/40). Run import/10 first so the people table is populated.
--
-- Confidence:
--   high   — exact email, or a self-claimed membership link (userId ↔ memberId).
--   medium — same normalized name, or same phone (review before merging).
-- ============================================================================

create or replace view stg.duplicate_report as
-- exact email
select least(a.id, b.id) as person_a,
       greatest(a.id, b.id) as person_b,
       a.name as name_a, b.name as name_b,
       'exact_email'::text as reason, 'high'::text as confidence
from public.people a
join public.people b
  on a.email is not null and a.email = b.email and a.id < b.id

union
-- same normalized name
select least(a.id, b.id), greatest(a.id, b.id), a.name, b.name, 'same_name', 'medium'
from public.people a
join public.people b
  on stg.norm_name(a.name) is not null
 and stg.norm_name(a.name) = stg.norm_name(b.name)
 and a.id < b.id

union
-- same phone (digits only)
select least(a.id, b.id), greatest(a.id, b.id), a.name, b.name, 'same_phone', 'medium'
from public.people a
join public.people b
  on stg.norm_phone(a.phone) is not null
 and stg.norm_phone(a.phone) = stg.norm_phone(b.phone)
 and a.id < b.id

union
-- KNOWN link: a magazine membership where a login user self-claimed a roster
-- member ⇒ the login account and the promoted teamMember are the SAME human.
select least(m.uid, l->>'memberId'),
       greatest(m.uid, l->>'memberId'),
       (select name from public.people where id = m.uid),
       (select name from public.people where id = l->>'memberId'),
       'known_link_membership', 'high'
from stg.import_blob b2,
     jsonb_each(b2.data->'memberships') as m(uid, links),
     jsonb_array_elements(m.links) as l
where (l->>'module') = 'magazine'
  and m.uid <> (l->>'memberId')
  and exists (select 1 from public.people where id = m.uid)
  and exists (select 1 from public.people where id = l->>'memberId');

comment on view stg.duplicate_report is
  'READ-ONLY. Likely duplicate people for manual review before stg.merge_person().';

-- ─── Review query (run this; nothing is modified) ────────────────────────────
-- For each pair, decide a survivor (usually the login account) and merge the
-- other INTO it: select stg.merge_person('<from_id>', '<into_id>');
select person_a, person_b, name_a, name_b, reason, confidence
from stg.duplicate_report
order by case confidence when 'high' then 0 else 1 end, reason, name_a;
