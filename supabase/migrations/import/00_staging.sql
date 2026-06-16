-- ============================================================================
-- Phase 1 · import/00 — Staging schema + transform helpers
-- ----------------------------------------------------------------------------
-- The client state is exported to a single JSON blob (see IMPORT_MAPPING.md)
-- and loaded into stg.import_blob. The 10/20/30 scripts transform it into the
-- public.* tables. Everything is idempotent and re-runnable.
--
-- This `stg` schema is a MIGRATION TOOL — drop it after a successful cutover.
-- ============================================================================

create schema if not exists stg;

create table if not exists stg.import_blob (
  id        int primary key default 1,
  data      jsonb not null,
  loaded_at timestamptz not null default now(),
  constraint stg_import_singleton check (id = 1)
);
comment on table stg.import_blob is 'Single-row holder for the exported client JSON. See IMPORT_MAPPING.md for the export snippet.';

-- ─── Deterministic project-id remap ──────────────────────────────────────────
-- In-app project ids are already UUIDs (preserved). Non-UUID seed ids
-- (e.g. seed-mag-001) are mapped to a STABLE v5 UUID so re-runs are consistent
-- and every project reference resolves the same way. People ids stay text.
create or replace function stg.map_project_id(p text) returns uuid language sql immutable as $$
  select case
    when p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then p::uuid
    else uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, p)  -- fixed DNS namespace
  end
$$;

-- ─── Value coercion helpers ──────────────────────────────────────────────────
create or replace function stg.safe_date(p text) returns date language plpgsql immutable as $$
begin
  if p is null or btrim(p) = '' then return null; end if;
  return left(btrim(p), 10)::date;     -- accepts 'YYYY-MM-DD' or an ISO datetime prefix
exception when others then
  return null;                          -- unparseable → null (flagged in the report)
end $$;

create or replace function stg.norm_email(p text) returns text language sql immutable as $$
  select nullif(lower(btrim(coalesce(p, ''))), '')
$$;

create or replace function stg.norm_name(p text) returns text language sql immutable as $$
  select nullif(lower(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g')), '')
$$;

create or replace function stg.norm_phone(p text) returns text language sql immutable as $$
  select nullif(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '')
$$;

-- ─── Display helpers for promoted people (no stored initials/colour) ──────────
create or replace function stg.initials_of(p text) returns text language sql immutable as $$
  select upper(coalesce(nullif(string_agg(left(w.word, 1), '' order by w.rn), ''), '?'))
  from (
    select word, row_number() over () as rn
    from unnest(regexp_split_to_array(btrim(coalesce(p, '')), '\s+')) as word
    where word <> ''
  ) w
  where w.rn <= 2
$$;

create or replace function stg.color_of(p text) returns text language sql immutable as $$
  -- (((h % 7) + 7) % 7) keeps the index in 0..6 without abs() (avoids abs(INT_MIN)).
  select (array['#7A5C52','#566246','#4A5568','#6B5E4F','#8B5C4A','#2C4A3E','#1C3D2E'])[
    (((hashtext(coalesce(p, '')) % 7) + 7) % 7) + 1
  ]
$$;
