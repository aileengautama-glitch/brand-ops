/**
 * DEV-ONLY access parity harness — NOT imported by the app (tree-shaken out).
 *
 * Why "logic parity" and not a live query: querying the live RLS "as a person"
 * needs either Supabase Auth (deferred) or the service-role key (forbidden in
 * any project file). So this compares, over the SAME data the repos return:
 *   • the CLIENT resolver result (mirror of useCurrentUser), vs
 *   • a faithful TS port of the RLS policy logic (supabase/migrations/0003).
 * for every (account × project × section), and reports divergences.
 *
 * It reads grants/members through the repositories, so when isSupabaseEnabled it
 * compares against DB-sourced data (true parity); when local, it's logic parity.
 *
 * Run from the browser console (dev):
 *   const m = await import('/src/repositories/_devParity.ts'); await m.runAccessParity();
 *
 * Expected outcome after the 0003 module-gate patch:
 *   • view + section-view mismatches  → 0 (full parity)
 *   • edit divergences → all categorized EXPECTED (RLS drops the legacy
 *     ROLE_PERMISSIONS-based edit; decision #1). UNEXPECTED should be 0.
 * Manual people are excluded (no login ⇒ dormant under RLS).
 */
import { PeopleRepository, AccessRepository, ProjectMembersRepository } from '@/repositories'
import { useUserStore } from '@/store/useUserStore'
import { useEventStore } from '@/store/useEventStore'
import { useShootStore } from '@/store/useShootStore'
import { useMagazineStore } from '@/store/useMagazineStore'
import { APP_USERS, type UserRole } from '@/auth/users'
import { canEdit as roleCanEdit, type SectionKey } from '@/auth/permissions'
import {
  MODULE_SECTIONS, sectionModule, hasModuleGrants, findGrant,
  grantSectionLevel, grantProjectLevel, ACCESS_RANK,
  type AccessModule, type ProjectGrant,
} from '@/auth/access'

type Ctx = {
  isAdmin: boolean
  role: UserRole | null
  allowedModules: AccessModule[] | null   // null = all
  grants: ProjectGrant[]
  isMember: (projectId: string) => boolean
}

function moduleAllowed(allowed: AccessModule[] | null, m: AccessModule): boolean {
  return allowed === null ? true : allowed.includes(m)
}

// ─── CLIENT model (mirror of useCurrentUser) ─────────────────────────────────
function clientCanView(c: Ctx, m: AccessModule, projectId: string): boolean {
  if (c.isAdmin) return true
  if (!moduleAllowed(c.allowedModules, m)) return false
  if (hasModuleGrants(c.grants, m)) return ACCESS_RANK[grantProjectLevel(findGrant(c.grants, m, projectId))] >= ACCESS_RANK.view
  return m === 'magazine' ? true : c.isMember(projectId)
}
function clientCanViewSection(c: Ctx, section: SectionKey, projectId: string): boolean {
  const m = sectionModule(section)
  if (c.isAdmin) return true
  if (!moduleAllowed(c.allowedModules, m)) return false
  if (hasModuleGrants(c.grants, m)) return ACCESS_RANK[grantSectionLevel(findGrant(c.grants, m, projectId), section)] >= ACCESS_RANK.view
  return m === 'magazine' ? true : c.isMember(projectId)
}
function clientCanEdit(c: Ctx, section: SectionKey, projectId: string): boolean {
  const m = sectionModule(section)
  if (c.isAdmin) return true
  if (hasModuleGrants(c.grants, m)) return grantSectionLevel(findGrant(c.grants, m, projectId), section) === 'edit'
  return c.role ? roleCanEdit(c.role, section) : false   // legacy ROLE_PERMISSIONS edit
}

// ─── RLS model (TS port of supabase/migrations/0003 + the Phase-3 content policy intent) ──
function rlsCanView(c: Ctx, m: AccessModule, projectId: string): boolean {
  if (c.isAdmin) return true
  if (!moduleAllowed(c.allowedModules, m)) return false           // module_allowed()
  if (hasModuleGrants(c.grants, m)) return ACCESS_RANK[grantProjectLevel(findGrant(c.grants, m, projectId))] >= ACCESS_RANK.view
  return m === 'magazine' ? true : c.isMember(projectId)          // legacy fallback
}
function rlsCanViewSection(c: Ctx, section: SectionKey, projectId: string): boolean {
  const m = sectionModule(section)
  if (c.isAdmin) return true
  if (!moduleAllowed(c.allowedModules, m)) return false
  if (hasModuleGrants(c.grants, m)) return ACCESS_RANK[grantSectionLevel(findGrant(c.grants, m, projectId), section)] >= ACCESS_RANK.view
  return m === 'magazine' ? true : c.isMember(projectId)
}
function rlsCanEdit(c: Ctx, section: SectionKey, projectId: string): boolean {
  const m = sectionModule(section)
  if (c.isAdmin) return true
  return grantSectionLevel(findGrant(c.grants, m, projectId), section) === 'edit'  // NO legacy role fallback
}

type Mismatch = { person: string; module?: AccessModule; section?: string; project: string; client: boolean; rls: boolean }

export async function runAccessParity() {
  const overrides = useUserStore.getState().userAccessOverrides
  const projects: { module: AccessModule; id: string }[] = [
    ...useEventStore.getState().projects.map((p) => ({ module: 'event' as const, id: p.id })),
    ...useShootStore.getState().projects.map((p) => ({ module: 'shoot' as const, id: p.id })),
    ...useMagazineStore.getState().projects.map((p) => ({ module: 'magazine' as const, id: p.id })),
  ]

  const directory = await PeopleRepository.list()
  const accounts  = directory.filter((p) => p.isAppUser)

  let checks = 0
  const viewMismatch: Mismatch[]    = []
  const sectionMismatch: Mismatch[] = []
  let editExpected = 0
  const editUnexpected: Mismatch[]  = []

  for (const person of accounts) {
    const app       = APP_USERS.find((u) => u.id === person.id)
    const ov        = overrides[person.id] ?? {}
    const grants    = await AccessRepository.getGrants(person.id)
    const memberIds = new Set(await ProjectMembersRepository.listProjectIdsForPerson(person.id))
    const ctx: Ctx = {
      isAdmin:        ov.isAdmin ?? app?.isAdmin ?? false,
      role:           (ov.role ?? app?.role ?? null) as UserRole | null,
      allowedModules: ov.allowedModules ?? null,
      grants,
      isMember:       (pid: string) => memberIds.has(pid),
    }

    for (const proj of projects) {
      const cv = clientCanView(ctx, proj.module, proj.id)
      const rv = rlsCanView(ctx, proj.module, proj.id)
      checks++
      if (cv !== rv) viewMismatch.push({ person: person.name, module: proj.module, project: proj.id, client: cv, rls: rv })

      for (const sec of MODULE_SECTIONS[proj.module]) {
        const csv = clientCanViewSection(ctx, sec.key, proj.id)
        const rsv = rlsCanViewSection(ctx, sec.key, proj.id)
        checks++
        if (csv !== rsv) sectionMismatch.push({ person: person.name, section: sec.key, project: proj.id, client: csv, rls: rsv })

        const ce = clientCanEdit(ctx, sec.key, proj.id)
        const re = rlsCanEdit(ctx, sec.key, proj.id)
        checks++
        if (ce !== re) {
          const legacyEdit = !hasModuleGrants(ctx.grants, proj.module) && !!ctx.role && roleCanEdit(ctx.role, sec.key)
          if (ce && !re && legacyEdit) editExpected++
          else editUnexpected.push({ person: person.name, section: sec.key, project: proj.id, client: ce, rls: re })
        }
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `[AccessParity] ${checks} checks · ${accounts.length} accounts × ${projects.length} projects\n` +
    `  view mismatches (expect 0):         ${viewMismatch.length}\n` +
    `  section-view mismatches (expect 0): ${sectionMismatch.length}\n` +
    `  edit · EXPECTED (legacy role-edit tightened by RLS): ${editExpected}\n` +
    `  edit · UNEXPECTED (investigate, expect 0):           ${editUnexpected.length}`
  )
  /* eslint-disable no-console */
  if (viewMismatch.length)    console.table(viewMismatch)
  if (sectionMismatch.length) console.table(sectionMismatch)
  if (editUnexpected.length)  console.table(editUnexpected)
  /* eslint-enable no-console */

  return { checks, accounts: accounts.length, projects: projects.length, viewMismatch, sectionMismatch, editExpected, editUnexpected }
}
