# Brand Ops — Deployment Guide

> **Going live?** For the full go-live + multi-user verification procedure (the one
> remaining gate before a full GO), follow **[LAUNCH_RUNBOOK.md](./LAUNCH_RUNBOOK.md)**.
> This guide covers the general build/deploy mechanics.

## Local development

```bash
npm install
npm run dev
```

Starts at **http://localhost:5173** (Vite default); HMR is on.

Without Supabase env vars the app runs **local-only** — per-browser `localStorage`, no
cross-device sync, no email invites, no server-side access enforcement. That is the
default and is fine for UI work. To exercise auth/sync locally, add `.env.local` (below).

---

## Production build

```bash
npm run build     # tsc -b && vite build  →  dist/
npm run preview   # serve dist/ at http://localhost:4173
```

`dist/` is a fully static bundle (HTML + JS + CSS), no server required.

---

## Environment variables (REQUIRED for the hosted pilot)

The app integrates **Supabase** for cross-device sync, email invites, and server-side
access (Row-Level Security). Two build-time variables drive it:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon** (public) key — designed to ship in browser code |

Three facts that bite if missed:

- **Build-time, not runtime.** Vite inlines `VITE_*` at build. Set them in Vercel
  **before** the build runs; if you add or change them later, **redeploy**.
- **The anon key is public by design.** It is meant to live in the client bundle; data
  is protected by RLS, not by hiding this key. **Never** put the Supabase *service-role*
  key in this project or any `VITE_*` variable.
- **Missing/blank → local-only fallback.** If either var is absent the Supabase client is
  `null` (`isSupabaseEnabled === false`) and the app silently runs per-device with no
  sync/auth. (This is why the old "no env vars required" note was a launch trap.)

Local: create `.env.local` (gitignored via `*.local`):

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...        # anon / public key ONLY
```

Vercel: **Project Settings → Environment Variables** → add both for **Production**
(and **Preview** if preview deploys should reach Supabase).

---

## Deploying to Vercel

### First deploy

1. Put the project under git and push (it is **not** a repo yet):
   ```bash
   cd brand-ops
   git init && git add -A && git commit -m "Brand Ops"
   git remote add origin <repo-url> && git push -u origin main
   ```
   `.env.local` is gitignored (`*.local`) — confirm it is **not** listed by `git status`
   before pushing.
2. [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Accept the auto-detected Vite settings:
   - **Framework:** Vite · **Build:** `npm run build` · **Output:** `dist` · **Install:** `npm install`
4. Add the two env vars (above) **before** deploying.
5. **Deploy.** Vercel assigns `https://<project>.vercel.app`; add a custom domain in
   Project Settings → Domains if desired.

### Re-deploys

Every push to the Production branch auto-redeploys. Changed an env var? Trigger a
redeploy — env is baked at build time.

### SPA routing

React Router deep links (e.g. `/magazine/<id>/board`) must fall back to `index.html` or
they 404 on refresh. This repo ships an explicit **`vercel.json`**:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

(On Netlify instead, add `public/_redirects` containing `/*  /index.html  200`.)

---

## Identity & access (current model)

Two sign-in paths coexist:

- **Local name/PIN picker** (`LoginGate`) — the original per-device identity; no server
  needed. Default PIN `0000`.
- **Supabase email sign-in + admin invites** — real accounts with cross-device sync and
  server-side RLS. An admin invites a member by email (**Settings → People & Invites →
  Send invite**), which sends a magic link; on click the member's auth user is created and
  linked to their existing person record (so grants carry over). Scoped access (per
  project / per section) is enforced server-side by RLS.

Bootstrapping the **first admin** and the full live verification are in
**[LAUNCH_RUNBOOK.md](./LAUNCH_RUNBOOK.md)**.

---

## Roster & permissions in code

- `src/auth/users.ts → APP_USERS` — seed/local identities and the local PIN picker. Keep
  `id`s stable (used as localStorage keys for assignments). The admin is `user-aileen`
  (`isAdmin: true`).
- Ongoing members are added at runtime via **Settings → People & Invites** — no code
  change needed.
- `src/auth/permissions.ts → ROLE_PERMISSIONS` — legacy role→section map (client-side
  fallback only). Authoritative access is grant-based and enforced by RLS.

---

## Database migrations

SQL lives in `supabase/migrations/` (`0001`–`0020`). Apply them in numeric order via the
Supabase **SQL Editor** (or `supabase db push`). The identity/RLS chain is
`0003 → 0017 → 0018 → 0019 → 0020`; the 12 magazine content tables are `0005`–`0016`. See
the runbook for the apply checklist and verification queries.
