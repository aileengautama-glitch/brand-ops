-- ============================================================================
-- Phase 1 · import/10 — Build the people directory
-- ----------------------------------------------------------------------------
-- Sources (in order; later steps never overwrite an earlier, higher-trust row):
--   1. APP_USERS        → seeded as LITERALS here (static code, not in the blob).
--   2. userAccessOverrides → folded onto the matching account rows.
--   3. customMembers    → from the blob.
--   4. magazine teamMembers → promoted to manual people, preserving id.
--
-- NO auto-merge across sources. Likely duplicates are surfaced by import/20 and
-- merged manually via stg.merge_person() (import/40).
-- Idempotent. Run after 0001–0003 and after stg.import_blob is loaded.
-- ============================================================================

-- ─── 1. APP_USERS (login accounts) ───────────────────────────────────────────
-- Mirrors src/auth/users.ts. APP_USERS have no email today (login is by PIN).
insert into public.people (id, name, role, is_admin, initials, avatar_color, status, login_enabled)
values
  ('user-aileen',          'Aileen',          'producer',     true,  'A',  '#2C4A3E', 'account', true),
  ('user-sarah-chen',      'Sarah Chen',      'producer',     false, 'SC', '#566246', 'account', true),
  ('user-marcus-williams', 'Marcus Williams', 'art_director', false, 'MW', '#4A5568', 'account', true),
  ('user-priya-patel',     'Priya Patel',     'producer',     false, 'PP', '#7A5C52', 'account', true),
  ('user-tom-anderson',    'Tom Anderson',    'retail_lead',  false, 'TA', '#2C4A3E', 'account', true),
  ('user-leila-rodriguez', 'Leila Rodriguez', 'assistant',    false, 'LR', '#6B5E4F', 'account', true),
  ('user-yuki-tanaka',     'Yuki Tanaka',     'art_director', false, 'YT', '#1C3D2E', 'account', true),
  ('user-marco-rossi',     'Marco Rossi',     'art_director', false, 'MR', '#1C1C1E', 'account', true),
  ('user-amara-osei',      'Amara Osei',      'stylist',      false, 'AO', '#8B5C4A', 'account', true),
  ('user-jade-kim',        'Jade Kim',        'hmu',          false, 'JK', '#A0784C', 'account', true)
on conflict (id) do update set
  name = excluded.name, role = excluded.role, is_admin = excluded.is_admin,
  initials = excluded.initials, avatar_color = excluded.avatar_color,
  status = 'account', login_enabled = true;

-- ─── 2. userAccessOverrides → account rows ───────────────────────────────────
-- role / isAdmin / allowedModules overrides become columns on the people row.
--   allowedModules: absent → keep; present+items → array; present+[] → '{}' (= none).
update public.people p
set role            = coalesce(ov.value->>'role', p.role),
    is_admin        = coalesce((ov.value->>'isAdmin')::boolean, p.is_admin),
    allowed_modules = case
      when ov.value ? 'allowedModules'
        then coalesce(
               (select array_agg(x) from jsonb_array_elements_text(ov.value->'allowedModules') x),
               '{}'::text[]
             )
      else p.allowed_modules
    end
from stg.import_blob b,
     jsonb_each(b.data->'userAccessOverrides') as ov(uid, value)
where p.id = ov.uid;

-- ─── 3. customMembers ────────────────────────────────────────────────────────
insert into public.people (id, name, email, phone, notes, status, initials, avatar_color, login_enabled, created_at, updated_at)
select
  m->>'id',
  coalesce(m->>'name', ''),
  stg.norm_email(m->>'email'),
  nullif(m->>'phone', ''),
  coalesce(m->>'notes', ''),
  coalesce((m->>'status')::person_status, 'manual'),
  stg.initials_of(m->>'name'),
  stg.color_of(m->>'id'),
  false,
  coalesce((m->>'createdAt')::timestamptz, now()),
  coalesce((m->>'updatedAt')::timestamptz, now())
from stg.import_blob b, jsonb_array_elements(b.data->'customMembers') m
on conflict (id) do update set
  name = excluded.name, email = excluded.email, phone = excluded.phone,
  notes = excluded.notes, status = excluded.status,
  initials = excluded.initials, avatar_color = excluded.avatar_color;

-- ─── 4. magazine teamMembers → promoted manual people (preserve id) ──────────
-- The editorial role is project-scoped → it goes to project_members (import/30),
-- NOT to people.role. `do nothing` so we never clobber an account/custom member
-- that happens to share an id; cross-id duplicates are handled by merge.
insert into public.people (id, name, email, status, initials, avatar_color, login_enabled, created_at)
select
  tm->>'id',
  coalesce(tm->>'name', ''),
  stg.norm_email(tm->>'email'),
  'manual',
  stg.initials_of(tm->>'name'),
  stg.color_of(tm->>'id'),
  false,
  coalesce((tm->>'createdAt')::timestamptz, now())
from stg.import_blob b,
     jsonb_array_elements(b.data->'magazineProjects') p,
     jsonb_array_elements(coalesce(p->'teamMembers', '[]'::jsonb)) tm
on conflict (id) do nothing;
