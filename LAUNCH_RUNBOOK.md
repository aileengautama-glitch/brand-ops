# Brand Ops — Production Launch & Live Verification Runbook

**Purpose.** Take Brand Ops from **Conditional GO** to **full GO** by deploying to Vercel
and running the one gate an agent cannot: a live, multi-user Supabase test with real
sign-in, a real email invite, two real devices, and server-enforced access.

**Who runs this.** A human (the admin) with: the Vercel account, the Supabase project
(Dashboard access), an admin email + password, a **second** email inbox, and a **second**
browser / device.

**The gate this proves**
1. Real admin sign-in + identity link
2. Email invite round-trip (admin invites → member accepts → auto-linked)
3. Cross-device sync
4. Server-side RLS enforcement (scoped denial)
5. Offline remote → local fallback

**Time:** ~45–60 min. **Stop rule:** fix only *real* hosted / auth / RLS blockers surfaced
here — do not refactor or reopen settled work.

---

## Pre-flight — already verified in code (no action needed)

- ✓ Migrations `0001`–`0020` present
- ✓ No service-role / secret key anywhere in `src/` (anon key only)
- ✓ `.env.local` gitignored (`*.local`); `dist` gitignored — not a git repo yet
- ✓ `vercel.json` ships an SPA rewrite, so deep-link refreshes won't 404
- ✓ `npm run build` green (2104 modules, tsc clean, ~3.4s) — only the known cosmetic
  chunk-size warning

---

## Part A — Deploy to Vercel

Mechanics are in [README_DEPLOYMENT.md](./README_DEPLOYMENT.md); the essentials:

1. `git init` the `brand-ops/` folder, commit, push to GitHub.
   **Confirm `.env.local` is NOT staged** — `git status` must not list it.
2. Import the repo at vercel.com; accept the Vite preset (build `npm run build`, output `dist`).
3. **Project Settings → Environment Variables**, for **Production**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`  (anon / public key)

   These bake at build time — set them **before** the first build, or redeploy after.
4. Deploy. Note the production origin, e.g. `https://brand-ops.vercel.app` → called
   **ORIGIN** below.

**☐ Check A.** Open ORIGIN: the app loads and the login screen offers the
**"Sign in to sync"** path (not just the local name picker). If it's stuck local-only,
the env vars didn't bake → fix step 3 and **redeploy**.

---

## Part B — Supabase configuration

### B1 · Apply migrations (in order)
SQL Editor (or `supabase db push`): apply **0001 → 0020** in numeric order. The
identity/RLS chain (`0003, 0017, 0018, 0019, 0020`) and the 12 content tables
(`0005`–`0016`) must all be applied.

**☐ Check B1.**
```sql
select count(*) from public.access_grants;                    -- runs without error
select proname from pg_proc where proname = 'current_person_id';  -- returns 1 row
```

### B2 · Auth URL configuration
**Authentication → URL Configuration:**
- **Site URL** = `ORIGIN`
- **Redirect URLs** (allowlist) — add:
  - `ORIGIN` and `ORIGIN/*`
  - *(optional, Vercel preview builds)* `https://*.vercel.app`
  - *(optional, local dev)* `http://localhost:5173`, `http://localhost:4173`

**Why it matters:** the invite magic link redirects to `window.location.origin` (= ORIGIN).
If ORIGIN isn't allow-listed, the link bounces and the member never authenticates.

### B3 · Email provider
**Authentication → Providers → Email**: enabled, "Confirm email" on. The built-in email is
fine for a low-volume pilot; for production volume configure custom SMTP (Auth → Emails).
Optionally customize the **Magic Link** template.

### B4 · Bootstrap the first admin (the crux)
There is no admin yet, and `people` writes are admin-only under RLS — so the first admin is
seeded server-side, in two steps.

**(i) Seed the admin `people` row** — SQL Editor (runs as owner, bypasses RLS). Use the
admin's real email; keep `id = 'user-aileen'` so the **local** and **Supabase** identities
resolve to the *same* person (it's the `isAdmin` entry in `src/auth/users.ts`):
```sql
insert into public.people (id, name, email, is_admin, login_enabled)
values ('user-aileen', 'Aileen', 'YOUR_ADMIN_EMAIL', true, true)
on conflict (id) do update
  set is_admin = true, login_enabled = true,
      email = excluded.email, name = excluded.name;
```
*(`status` defaults to `manual`; RLS authorizes on `is_admin` + `auth_user_id`, not status.)*

**(ii) Create the admin auth user** — **Authentication → Users → Add user**: same email,
set a password, **check "Auto Confirm User."** Auto-confirm sets `email_confirmed_at`,
firing the `0017` trigger, which sets `people.auth_user_id` on the row from (i) by matching
email. The admin can now sign in by password.

**☐ Check B4.**
```sql
select id, email, is_admin, auth_user_id
from public.people where id = 'user-aileen';
```
`auth_user_id` must be **non-null** (linked). If it's null, the emails didn't match — fix
the typo/whitespace and re-run the `0017` backfill:
```sql
update public.people p set auth_user_id = u.id
  from auth.users u
 where u.email = p.email and u.email_confirmed_at is not null and p.auth_user_id is null;
```

---

## Part C — Bundle secret sanity (1 min)
Confirm the **anon** key is present (expected — it's public) and **no service-role key**
leaked. On the deployed bundle or local `dist/`:
```bash
# from brand-ops/
grep -rIl "service_role" dist/ && echo "FAIL: investigate" || echo "OK: no service-role marker"
```
The Supabase URL + anon JWT *will* appear in `dist/assets/*.js` — correct and safe.

---

## Part D — Live smoke test (the gate)

**Device 1** = admin (you). **Device 2** = a different browser / profile / device with
access to the **second inbox**.

### D1 · Real admin sign-in + identity
Device 1: open ORIGIN → sign in with the admin email + password (B4).
**Expected:** lands in the app as **Aileen** (top-right), not the login gate; admin
affordances (e.g. "All projects") appear; an `sb-…` key now exists in `localStorage`.
**☐ PASS ☐ FAIL** — notes:

### D2 · Email invite round-trip
Device 1: **Settings → People & Invites** → create a member (name + the **second** inbox
email) → **Send invite**. Status → "Pending invite."
Device 2: open the second inbox → click the Brand Ops magic link → it lands on ORIGIN and
authenticates.
**Expected:**
- Device 2 is signed in as that member and reaches the app (not the "account not linked"
  dead-end).
- Device 1: refresh **Settings → People & Invites** → the member shows **Active** (green);
  the invite button is gone.
- DB: `select email, auth_user_id from public.people where email = 'SECOND_EMAIL';` →
  `auth_user_id` non-null.

**☐ PASS ☐ FAIL** — notes:

> "Account not linked"? The people row didn't exist with that email *before* the click
> (the custom-member dual-write needs the admin signed in at create time), or the emails
> mismatch. Verify the people row, then **Resend invite**.

### D3 · Cross-device sync
Pre-req: as admin (Device 1), grant the member access to one magazine project + a section
— **view** to read, **edit** for the reverse write test.
- Admin (Device 1): open that project → add/rename a task (or outreach/article item).
- Member (Device 2): open the same project/section → **reload**.

**Expected:** the change appears on Device 2 (served from Supabase, not just Device 1's
local storage). If the member has **edit**, have them make a change and confirm it shows
for the admin after reload.
**☐ PASS ☐ FAIL** — notes:

### D4 · Server-side RLS enforcement (scoped denial)
The member should hold a grant to **only** the D3 project/section — nothing else.
- Member (Device 2): the project list shows only granted projects (e.g. "1 of N");
  ungranted sections redirect to the first allowed one.
- **Prove it's server-side, not just UI:** with the member signed in (Device 2), open
  DevTools → Network and try to load an **ungranted** project's content. The Supabase
  request returns **empty / no rows** (RLS filtered) — not the data.
- *Optional hard proof* (SQL Editor, impersonate the member):
  ```sql
  select set_config('request.jwt.claims',
    json_build_object(
      'sub', (select auth_user_id from public.people where email = 'SECOND_EMAIL'),
      'role', 'authenticated')::text, true);
  set role authenticated;
  select id, name from public.projects;   -- only granted projects appear
  reset role;
  ```

**Expected:** ungranted content is invisible/denied at the API, not merely hidden by the
client.
**☐ PASS ☐ FAIL** — notes:

> The Network-tab check is the authoritative proof. The impersonation SQL is a bonus —
> exact JWT-claim GUC keys can vary by Supabase version.

### D5 · Offline remote → local fallback
Device 1: DevTools → Network → **Offline** (or block the `*.supabase.co` host), then
navigate.
**Expected:** the app keeps working from local data — no white screen / uncaught crash;
reads fall back to local (`remote ?? local`). Restore network afterward.
**☐ PASS ☐ FAIL** — notes:

---

## Results

| # | Check | Pass? | Notes |
|---|-------|:-----:|-------|
| A | Deploy + env baked | ☐ | |
| B1 | Migrations applied | ☐ | |
| B4 | Admin linked (`auth_user_id`) | ☐ | |
| C | No service-role in bundle | ☐ | |
| D1 | Admin sign-in | ☐ | |
| D2 | Invite round-trip → Active | ☐ | |
| D3 | Cross-device sync | ☐ | |
| D4 | Server-side RLS denial | ☐ | |
| D5 | Offline fallback | ☐ | |

**All D-checks pass → flip Conditional GO to full GO.** Record the date + who ran it in the
project memory (`…/memory/project_brand_ops.md`).

---

## Troubleshooting quick map

| Symptom | Likely cause | Fix |
|---|---|---|
| App has no sync, only local picker | env vars not baked at build | set both `VITE_*` in Vercel → **redeploy** |
| Magic link opens but doesn't sign in / "redirect not allowed" | ORIGIN missing from Auth Redirect URLs | add `ORIGIN` + `ORIGIN/*` (B2) |
| Member stuck "account not linked" | no people row with that email before accept, or email typo | seed/verify the people row; resend invite |
| Admin can't sign in | no password auth user, or not auto-confirmed | dashboard **Add user** w/ password + **Auto Confirm** (B4 ii) |
| Signed in but sees nothing remote / RLS errors | migrations not fully applied, or admin not linked | apply `0001`–`0020`; re-check B4 `auth_user_id` |
| Deep-link refresh 404s | host rewrite missing (shouldn't happen — `vercel.json` present) | confirm `vercel.json` deployed |

---

This runbook is the **only** remaining launch gate. Everything else — build, secret
hygiene, migrations present, SPA config, local QA — is already verified.
