# Phase 1 — Identity / Access import mapping

This document describes how current **client (localStorage) state** maps into the
new `public.*` tables, the run order, and the caveats. Nothing here is wired into
the app; the app keeps running on localStorage throughout Phase 1.

> Apply DDL + run these scripts **out of band** (Supabase SQL editor / `supabase db push`).
> No secrets live in any file — the anon key stays in `.env.local`.

---

## Run order

```
001_initial_schema.sql                      -- EXISTING base (projects/tasks/comments) — already applied
0001_identity_access_extensions_enums.sql   -- extensions + enums (no access_module/project_lifecycle)
0002_identity_access_tables.sql             -- people/meta/members/grants (projects REUSED, not created)
0003_identity_access_rls.sql                -- helpers + RLS policies
0004_reconcile_projects.sql                 -- extend projects.module→magazine, UNIQUE(id,module), composite FKs
import/00_staging.sql                       -- stg schema + transform helpers
-- → load stg.import_blob with the exported JSON (snippet below)
import/10_transform_people.sql              -- APP_USERS + overrides + customMembers + roster → people
import/20_dryrun_duplicate_report.sql       -- REVIEW likely duplicates (read-only)
import/40_merge_person_function.sql         -- (defines stg.merge_person)
-- → run stg.merge_person(from, into) for each CONFIRMED duplicate
import/30_transform_projects_grants_members.sql  -- projects, meta, grants, members
-- → run the verification queries (bottom of this doc)
```

Order rationale: extend the existing `projects` (0004) so it accepts the
`magazine` module and exposes the `UNIQUE(id, module)` composite-FK target
**before** any access rows reference it → build people → **review & merge
duplicates** → only then load grants/members so they land on the surviving
person ids. (Merge before content, which arrives in Phase 3.)
0004 must run after 0002/0003 and before import/30 (which upserts magazine
projects and the composite-FK'd grants/meta).

---

## Export snippet (run in the app's browser console)

Reads the persisted Zustand stores and copies a single JSON blob to the clipboard.
APP_USERS are **not** exported — they are static code, seeded as literals by `10_transform_people.sql`.

```js
const S = (k) => (JSON.parse(localStorage.getItem(k) || 'null')?.state ?? {});
const u   = S('brand-ops-users-v1');      // currentUser store
const mag = S('brand-ops-magazine-v1');
const ev  = S('brand-ops-events-v2');     // confirmed (useEventStore persist name)
const sh  = S('brand-ops-shoots-v3');     // confirmed (useShootStore persist name)

const blob = {
  userAccessOverrides: u.userAccessOverrides ?? {},
  customMembers:       u.customMembers ?? [],
  accessGrants:        u.accessGrants ?? {},
  memberships:         u.memberships ?? {},
  magazineProjects: (mag.projects ?? []).map(p => ({
    id: p.id, name: p.name, description: p.description,
    editionNumber: p.editionNumber, publicationDate: p.publicationDate,
    theme: p.theme, status: p.status, totalBudget: p.totalBudget, notes: p.notes,
    createdAt: p.createdAt, updatedAt: p.updatedAt,
    teamMembers: (p.teamMembers ?? []).map(m => ({
      id: m.id, name: m.name, role: m.role, email: m.email, createdAt: m.createdAt,
    })),
  })),
  eventProjects: (ev.projects ?? []).map(p => ({ id: p.id, name: p.name, description: p.description, createdAt: p.createdAt, updatedAt: p.updatedAt })),
  shootProjects: (sh.projects ?? []).map(p => ({ id: p.id, name: p.name, description: p.description, createdAt: p.createdAt, updatedAt: p.updatedAt })),
};
copy(JSON.stringify(blob));   // paste into the INSERT below
```

Load it:

```sql
insert into stg.import_blob (id, data) values (1, '<PASTE JSON HERE>'::jsonb)
on conflict (id) do update set data = excluded.data, loaded_at = now();
```

> Persist keys are confirmed against the stores: `brand-ops-users-v1`, `brand-ops-magazine-v1`,
> `brand-ops-events-v2`, `brand-ops-shoots-v3`. Zustand persist wraps state as `{ state, version }`,
> so the snippet reads `.state`.

---

## Field mapping

### people  (← APP_USERS + userAccessOverrides + customMembers + magazine teamMembers)
| people column | APP_USERS | customMember | teamMember (promoted) |
|---|---|---|---|
| `id` | `id` (e.g. `user-sarah-chen`) | `id` (uuid) | `id` (uuid / `seed-mag-tm-*`) |
| `name` | `name` | `name` | `name` |
| `email` | — (null) | `email` | `email` |
| `phone` | — | `phone` | — |
| `status` | `'account'` | `status` | `'manual'` |
| `role` | `role` (UserRole) ← override | — (null) | — (null; editorial role → project_members) |
| `is_admin` | `isAdmin` ← override | false | false |
| `allowed_modules` | override `allowedModules` (null=all) | null | null |
| `initials`/`avatar_color` | from code | derived | derived |
| `login_enabled` | true | false | false |
| `auth_user_id` | null (auth phase) | null | null |

### projects  (← magazine/event/shoot project summaries)
| projects column | source |
|---|---|
| `id` | `map_project_id(client id)` — uuid preserved, seed remapped |
| `module` | `'magazine' | 'event' | 'shoot'` |
| `name` / `description` | direct |
| `status` | `'active'` (base lifecycle; **editorial status → meta**) |
| `created_at` / `updated_at` | direct |

### magazine_project_meta  (← MagazineProject)
`edition_number←editionNumber` · `publication_date←safe_date(publicationDate)` ·
`theme←theme` · `total_budget←totalBudget` · **`editorial_status←status`** · `notes←notes`.

### access_grants  (← useUserStore.accessGrants)
`{ personId: [ { module, projectId, sections:{ '*':lvl, 'magazine.writing':lvl } } ] }`
→ one **row per section entry**: `(person_id, module, map_project_id(projectId), section_key, level)`.
`'*'` = project default; explicit keys = overrides; **`'inherit'` is never present** (the store deletes inherited keys).

### project_members  (← magazine teamMembers + memberships)
- magazine `teamMember` → `(project, person_id = teamMember.id, project_role = teamMember.role)`.
- `memberships[userId] = [{module, projectId, memberId}]` → `(project, person_id = userId, project_role = '')`.

---

## Caveats / data that needs special handling

1. **Seed / non-UUID project ids** (`seed-mag-001`, seed event/shoot ids) cannot live in a `uuid` PK → deterministically remapped via `uuid_generate_v5(ns, id)`. The **same** `map_project_id()` is applied to every project reference, so links stay consistent. In-app projects are already UUIDs and pass through unchanged.
2. **People `id` stays text** → `user-sarah-chen`, custom-member UUIDs, and `seed-mag-tm-*` all survive unchanged; grants/members/assignments keep pointing at them.
3. **No `UNIQUE(email)`** in Phase 1 (would block import + the manual-merge workflow). Uniqueness is enforced by **review (import/20) → merge (import/40)**; add a unique constraint in a later phase once people are clean.
4. **Roster ↔ account duplicates are NOT auto-merged.** A `teamMember` and an account/custom member can be the same human. They import as separate people; `stg.duplicate_report` flags them (`exact_email` / `same_name` / `same_phone`, plus the high-confidence `known_link_membership` where a user self-claimed a roster slot). Merge confirmed pairs with `stg.merge_person(from, into)` **before** running import/30.
5. **Event/shoot `memberships.memberId`** points at `TeamMember/CrewMember` ids that are **not promoted to people in Phase 1** (only the magazine roster is). Those memberships import with `person_id = the login userId`; the roster linkage is deferred to the event/shoot unification phase.
6. **APP_USERS have no email** today → email-based dedup against roster names won't fire for accounts; rely on `same_name` / `known_link_membership`.
7. **`graphic.assignee` stays free text** (not a person ref) — no mapping here; it's a credit label, addressed (if ever) in Phase 3.
8. **RLS replaces the client resolver.** The client's "not logged in ⇒ full access" is **dropped** — anon is denied. Server-side **edit** requires admin or an explicit `edit` grant (the legacy role-based edit fallback is intentionally not reproduced). Flagged for approval.
9. **Project-creation authority** is admin-only in the RLS as written (the scoped model doesn't express "who may create a project"). Relax later if non-admin creation must be preserved.

---

## Verification queries (after import/30)

```sql
-- counts
select 'people' t, count(*) from public.people
union all select 'projects', count(*) from public.projects
union all select 'magazine_project_meta', count(*) from public.magazine_project_meta
union all select 'access_grants', count(*) from public.access_grants
union all select 'project_members', count(*) from public.project_members;

-- grants that were SKIPPED because their person or project is missing
select ag.pid, g->>'module' module, g->>'projectId' project
from stg.import_blob b,
     jsonb_each(b.data->'accessGrants') ag(pid, grants),
     jsonb_array_elements(ag.grants) g
where not exists (select 1 from public.people where id = ag.pid)
   or not exists (select 1 from public.projects where id = stg.map_project_id(g->>'projectId'));

-- remaining likely duplicates (should be empty after merges you intend to do)
select * from stg.duplicate_report order by confidence, reason;
```

When clean, Phase 2 wires repositories behind `isSupabaseEnabled` and verifies RLS
parity against the client resolver before anything goes live. After cutover, `drop schema stg cascade;`.
