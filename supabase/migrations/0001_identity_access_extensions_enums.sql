-- ============================================================================
-- Phase 1 · 0001 — Extensions + enums for the identity / access core
-- ----------------------------------------------------------------------------
-- Additive and idempotent. Safe to run repeatedly. No app code references these
-- objects yet; the app continues to run entirely on localStorage.
--
-- Apply out-of-band via the Supabase SQL editor or `supabase db push`.
-- Contains NO secrets.
-- ============================================================================

-- uuid_generate_v5() — deterministic remap of non-UUID seed project ids on import
create extension if not exists "uuid-ossp";
-- gen_random_uuid() — default PKs for projects / grants / members
create extension if not exists "pgcrypto";
-- citext — case-insensitive email matching for de-duplication
create extension if not exists "citext";

-- ─── Enums (idempotent create) ───────────────────────────────────────────────

do $$ begin
  create type person_status as enum ('account', 'internal', 'external', 'manual', 'pending_invite');
exception when duplicate_object then null; end $$;
comment on type person_status is
  'account = real login user (APP_USERS today). internal/external/manual/pending_invite = custom/manual people with no login yet.';

do $$ begin
  create type access_level as enum ('none', 'view', 'edit');
exception when duplicate_object then null; end $$;

-- NOTE: there is intentionally NO `access_module` enum and NO `project_lifecycle`
-- enum. Reconciliation (0004) reuses the EXISTING `projects` table, whose `module`
-- and `status` are `text` + CHECK. To keep the composite FK
-- (access tables → projects(id, module)) type-compatible, module is `text`
-- everywhere. The app-side AccessModule type (src/auth/access.ts) is unaffected.
