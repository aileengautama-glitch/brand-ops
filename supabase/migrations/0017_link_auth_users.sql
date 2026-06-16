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
