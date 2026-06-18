/**
 * People repository — the unified directory (login accounts + custom members).
 *
 * Dual-path, read-only (Phase 2):
 *   • Local    — buildDirectory(useUserStore.customMembers) + APP_USERS. Exactly
 *                today's behavior; the authoritative path while Supabase is off.
 *   • Supabase — SELECT * FROM people, mapped to DirectoryPerson.
 * Active impl chosen by isSupabaseEnabled (mirrors SessionRepository).
 *
 * Writes stay on the stores (useUserStore.addCustomMember, …) for now — Phase 3.
 */
import { useUserStore } from '@/store/useUserStore'
import { buildDirectory, customToPerson, type DirectoryPerson, type CustomMember } from '@/auth/members'
import { ROLE_LABELS, type UserRole } from '@/auth/users'
import { supabase } from '@/lib/supabase'
import type { PersonRow } from '@/lib/supabase.types'
import type { IPeopleRepository } from './_types'

// people row → app-facing DirectoryPerson
function rowToPerson(r: PersonRow): DirectoryPerson {
  const isAppUser = r.login_enabled || r.status === 'account'
  const roleLabel = isAppUser
    ? (r.role ? (ROLE_LABELS[r.role as UserRole] ?? r.role) : '')
    : (r.role || 'Collaborator')
  return {
    id:          r.id,
    name:        r.name,
    roleLabel,
    email:       r.email ?? '',
    phone:       r.phone ?? undefined,
    initials:    r.initials || '?',
    avatarColor: r.avatar_color || '#566246',
    isAppUser,
    isAdmin:     r.is_admin,
    // status is meaningful only for custom/manual members (never 'account' there)
    status:      isAppUser ? undefined : (r.status as DirectoryPerson['status']),
    // canonical linked-login truth (set server-side by the 0017 trigger)
    linked:      !!r.auth_user_id,
  }
}

// People directory — LOCAL-authoritative (APP_USERS + custom members from the store),
// ENRICHED by the Supabase people table when configured. Never remote-only: locally-
// created, seed, or not-yet-authorized people must never vanish under RLS. This is the
// Option-A central fix for the recurring "Supabase-first read with no local fallback"
// bug — consolidated here so every PeopleRepository caller is safe by default. (People
// reads have no remote-diff consumer, so a repo-level union is safe; cf. magazineProjects,
// whose list() must stay raw for the Phase-5A bootstrap.)
export const PeopleRepository: IPeopleRepository = {
  async list() {
    const local = buildDirectory(useUserStore.getState().customMembers) // authoritative existence
    if (!supabase) return local
    const { data, error } = await supabase.from('people').select('*').order('name')
    if (error) { console.warn('[PeopleRepo] remote enrich failed:', error.message); return local }
    const byId = new Map(local.map((p) => [p.id, p]))                   // local wins for existence
    for (const r of data ?? []) {
      const m = rowToPerson(r)
      const existing = byId.get(m.id)
      if (existing) existing.linked = m.linked                          // adopt canonical remote link state (local wins for the rest)
      else byId.set(m.id, m)                                            // append remote-only people
    }
    return [...byId.values()]
  },
  async getById(id) {
    const local = buildDirectory(useUserStore.getState().customMembers).find((p) => p.id === id)
    if (local) return local                                            // local-first
    if (!supabase) return null
    const { data, error } = await supabase.from('people').select('*').eq('id', id).maybeSingle()
    if (error) { console.warn('[PeopleRepo] getById failed:', error.message); return null }
    return data ? rowToPerson(data) : null
  },
}

// ─── Supabase sync helper (called by useCustomMemberSync only) ────────────────
// Pattern mirrors magazineProjects.ts and access.ts supabase* helpers.
// Not on IPeopleRepository — fire-and-forget write helper, not a read interface.

/**
 * Upsert a custom member into the Supabase people table.
 * Used for both addCustomMember (INSERT path) and updateCustomMember (UPDATE path).
 * On conflict (id already exists), updates all non-auth fields with latest values.
 *
 * Derived fields (initials, avatar_color) are recomputed from the current member data
 * using the same functions as customToPerson, keeping the DB consistent with the directory.
 *
 * removeCustomMember is intentionally NOT synced to Supabase — the people row is
 * preserved for the invite-reuse design (same id reused when the member is later invited).
 * Access grant cleanup is handled by useMagazineGrantSync (Phase 4B).
 *
 * App-user rows (user-sarah-chen etc.) are seeded via the import migration and never
 * go through addCustomMember, so this function only ever sees UUID-based custom members.
 */
export async function supabasePushCustomMember(member: CustomMember): Promise<void> {
  if (!supabase) return

  const derived = customToPerson(member)

  // Preserve the server-managed link: read any existing auth_user_id so the upsert below
  // doesn't clobber it (the 0017 trigger owns this column; writing null would unlink an
  // already-invited member on the next admin re-sync).
  const { data: existing } = await supabase
    .from('people').select('auth_user_id').eq('id', member.id).maybeSingle()

  const { error } = await supabase
    .from('people')
    .upsert(
      {
        id:              member.id,
        name:            member.name,
        email:           member.email || null,   // '' → null (citext; optional)
        phone:           member.phone || null,   // '' → null
        role:            member.role  || null,   // '' → null
        notes:           member.notes,
        // 'active' is a LOCAL lifecycle marker; the canonical linked truth is
        // auth_user_id (set server-side by the link trigger). Coerce it to a valid
        // PersonStatus so we don't widen the DB enum/CHECK here.
        status:          member.status === 'active' ? 'internal' : member.status,
        is_admin:        false,                  // custom members are never admin
        allowed_modules: null,                   // null = all modules; access governed by grants
        initials:        derived.initials,       // same derivation as customToPerson
        avatar_color:    derived.avatarColor,    // same derivation as customToPerson
        login_enabled:   false,                  // no login account yet
        // auth_user_id is SERVER-managed (0017 link trigger). Pass the EXISTING value through
        // instead of null so a re-sync upsert never clobbers/unlinks an invited member.
        auth_user_id:    existing?.auth_user_id ?? null,
      },
      { onConflict: 'id' }
    )
  if (error) {
    console.warn('[CustomMemberSync] push failed:', member.id, error.message)
  }
}
