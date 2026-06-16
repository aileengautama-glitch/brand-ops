-- ============================================================================
-- Manual live-RLS verification (run in the Supabase SQL editor, out of band)
-- ----------------------------------------------------------------------------
-- The client cannot do this: querying "as a person" through RLS needs a JWT for
-- that person, and the service-role key must never live in a project file. So
-- this is a MANUAL check, run with elevated privileges in the SQL editor, to
-- confirm the live policies behave like the client resolver / the TS parity
-- harness (src/repositories/_devParity.ts).
--
-- Prereqs: 0001–0003 applied; identity/access tables populated (import/*).
-- Auth is NOT required — we simulate a person by setting the JWT-sub GUC that
-- auth.uid() reads, then querying as the `authenticated` role.
-- ============================================================================

-- 1) Pick a test person and give them an auth_user_id to impersonate.
--    (In the real auth phase this is set by the invite/login flow.)
--    Use any uuid; it only needs to match what we set in request.jwt.claims below.
--    Example for Sarah Chen:
--      update public.people set auth_user_id = '00000000-0000-0000-0000-0000000000aa'
--       where id = 'user-sarah-chen';

-- 2) Impersonate that person for the rest of the transaction.
--    Run these together (a single transaction in the SQL editor):

begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000aa"}';

  -- Who am I, per the policies?
  select public.current_person_id() as person_id, public.is_app_admin() as is_admin;

  -- Project visibility through RLS (only rows this person may SEE are returned):
  select id, module, name
    from public.projects
   order by module, name;

  -- Spot-check a specific project/section against the resolver logic:
  --   replace <PROJECT_UUID> with a real id.
  select public.can_view_project('magazine', '<PROJECT_UUID>')        as can_view,
         public.my_section_level('magazine', '<PROJECT_UUID>', 'magazine.writing') as writing_level,
         public.module_allowed('magazine')                            as magazine_allowed;
rollback;   -- rollback so the impersonation + any test writes leave no trace

-- 3) Compare the returned visibility against runAccessParity() output for the
--    same person. They should agree on VIEW + SECTION-VIEW. EDIT will differ by
--    design (RLS has no legacy ROLE_PERMISSIONS fallback — decision #1).

-- 4) Anonymous check — confirm NOTHING is readable without a person:
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999"}'; -- unknown sub
  select count(*) as should_be_zero from public.projects;        -- expect 0
  select count(*) as should_be_zero_people from public.people;   -- expect 0
rollback;
