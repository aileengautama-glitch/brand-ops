import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getUserById, DEFAULT_PIN } from '@/auth/users'
import type { UserRole } from '@/auth/users'
import type { SectionKey } from '@/auth/permissions'
import type { AccessModule, AccessLevel, ProjectGrant } from '@/auth/access'
import type { CustomMember } from '@/auth/members'
import { generateId, now } from '@/lib/utils'

// ─── User access override ─────────────────────────────────────────────────────
// Admin-configurable, store-persisted overrides that sit on top of the static
// APP_USERS definitions.  useCurrentUser reads these before APP_USERS, so
// changing them in the Settings page affects the app immediately without any
// code changes.

export interface UserAccessOverride {
  /** Override the static role in APP_USERS.  Drives ROLE_PERMISSIONS-based edit rights. */
  role?: UserRole
  /** Override the static isAdmin flag.  Gives all-project visibility + full edit bypass. */
  isAdmin?: boolean
  /**
   * Which modules this user may enter.  undefined = all modules (default).
   * [] = no modules.  ['event'] = Events only.
   */
  allowedModules?: ('event' | 'shoot' | 'magazine')[]
}

// ─── Member link ──────────────────────────────────────────────────────────────
// Connects a global AppUser to a project-local member (TeamMember or CrewMember).
// This is how "My Tasks" knows which task assignedTo IDs belong to you.

export interface MemberLink {
  module: 'event' | 'shoot' | 'magazine'
  projectId: string
  memberId: string    // TeamMember.id or CrewMember.id within that project
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface UserStoreState {
  /** The currently "logged in" user's ID, or null if no one is selected. */
  currentUserId: string | null
  /** Maps userId → list of project member links. */
  memberships: Record<string, MemberLink[]>
  /**
   * When true the login gate is skipped for this session even without a user.
   * Used only in dev/setup mode — reset to false on explicit sign-out.
   */
  guestMode: boolean
  /**
   * Locally-stored PIN overrides.  When a user changes their PIN after first
   * login, the new PIN is stored here keyed by userId.  `getEffectivePin`
   * resolves: override → base user.pin → DEFAULT_PIN.
   *
   * NOT cryptographic — for shared devices only.
   * Future: replace PIN validation in SelectProfileView with Auth0/Clerk.
   */
  pinOverrides: Record<string, string>

  setCurrentUser: (userId: string | null) => void
  /** Sign out: clears user AND resets guestMode so the gate reappears. */
  clearUser: () => void
  /** Skip the login gate without selecting a user (dev / setup only). */
  enableGuestMode: () => void
  /** Adds or replaces the link for a given user in a given project+module. */
  addMembership: (userId: string, link: MemberLink) => void
  /** Removes the link for a given user in a given project+module. */
  removeMembership: (userId: string, module: 'event' | 'shoot' | 'magazine', projectId: string) => void
  /** Persists a user-chosen PIN, overriding the default '0000'. */
  setPinOverride: (userId: string, pin: string) => void
  /** Returns the effective PIN: override → base pin → DEFAULT_PIN. */
  getEffectivePin: (userId: string) => string

  // ── Access overrides (admin-managed) ─────────────────────────────────────────
  /**
   * Admin-managed per-user access overrides.
   * keyed by userId; each entry overrides a subset of the static APP_USERS record.
   */
  userAccessOverrides: Record<string, UserAccessOverride>
  /**
   * Merge a partial override into the existing override for a user.
   * Pass `{ allowedModules: ['event'] }` to restrict module access, for example.
   */
  setUserAccessOverride: (userId: string, patch: Partial<UserAccessOverride>) => void
  /**
   * Remove all access overrides for a user, restoring their static APP_USERS defaults.
   */
  resetUserAccessOverride: (userId: string) => void

  // ── Scoped access grants (project + page level, view/edit) ───────────────────
  /**
   * Admin-managed per-user, per-project access grants.  keyed by userId.
   * A user with any grant in a module is governed by grants in that module
   * (deny-by-default); no grants in a module → legacy behaviour. See auth/access.ts.
   */
  accessGrants: Record<string, ProjectGrant[]>
  /**
   * Set one section's level within a project grant. Pass 'inherit' to clear the
   * explicit section level (it then falls back to the project-wide '*' default).
   * Creates the grant if needed and prunes it when it has no remaining sections.
   */
  setSectionAccess: (
    userId: string, module: AccessModule, projectId: string,
    section: SectionKey, level: AccessLevel | 'inherit'
  ) => void
  /** Set the project-wide default ('*') level for a project grant. */
  setProjectAccessDefault: (
    userId: string, module: AccessModule, projectId: string, level: AccessLevel
  ) => void
  /** Remove a whole project grant for a user (reverts that project to legacy/none). */
  removeProjectGrant: (userId: string, module: AccessModule, projectId: string) => void

  // ── Custom members (lightweight, admin-created collaborators) ────────────────
  /**
   * Admin-created people who are not (yet) login accounts. They join APP_USERS in
   * the people directory (auth/members.ts) and can be assigned to projects/pages
   * exactly like real users — grants key by the member id. Reused on later invite.
   */
  customMembers: CustomMember[]
  /** Create a custom member; returns the new id so the caller can assign grants immediately. */
  addCustomMember: (data: Omit<CustomMember, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateCustomMember: (id: string, patch: Partial<CustomMember>) => void
  /** Delete a custom member and any access grants keyed by their id. */
  removeCustomMember: (id: string) => void

  // ── Project-deletion cleanup ─────────────────────────────────────────────────
  /** Remove every user's grant + membership for a deleted project (prevents orphans). */
  purgeProjectAccess: (module: AccessModule, projectId: string) => void
  /** Remove every user's grant + membership for an entire module (clear-all). */
  purgeModuleAccess: (module: AccessModule) => void
}

export const useUserStore = create<UserStoreState>()(
  persist(
    (set, get) => ({
      currentUserId: null,
      memberships: {},
      guestMode: false,
      pinOverrides: {},
      userAccessOverrides: {},
      accessGrants: {},
      customMembers: [],

      setCurrentUser: (userId) => set({ currentUserId: userId, guestMode: false }),
      clearUser: () => set({ currentUserId: null, guestMode: false }),
      enableGuestMode: () => set({ guestMode: true }),

      addMembership: (userId, link) =>
        set((s) => {
          const existing = s.memberships[userId] ?? []
          const filtered = existing.filter(
            (l) => !(l.module === link.module && l.projectId === link.projectId)
          )
          return {
            memberships: { ...s.memberships, [userId]: [...filtered, link] },
          }
        }),

      removeMembership: (userId, module, projectId) =>
        set((s) => ({
          memberships: {
            ...s.memberships,
            [userId]: (s.memberships[userId] ?? []).filter(
              (l) => !(l.module === module && l.projectId === projectId)
            ),
          },
        })),

      setPinOverride: (userId, pin) =>
        set((s) => ({
          pinOverrides: { ...s.pinOverrides, [userId]: pin },
        })),

      getEffectivePin: (userId) => {
        const overrides = get().pinOverrides
        if (overrides[userId]) return overrides[userId]
        return getUserById(userId)?.pin ?? DEFAULT_PIN
      },

      setUserAccessOverride: (userId, patch) =>
        set((s) => ({
          userAccessOverrides: {
            ...s.userAccessOverrides,
            [userId]: { ...(s.userAccessOverrides[userId] ?? {}), ...patch },
          },
        })),

      resetUserAccessOverride: (userId) =>
        set((s) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [userId]: _removed, ...rest } = s.userAccessOverrides
          return { userAccessOverrides: rest }
        }),

      setSectionAccess: (userId, module, projectId, section, level) =>
        set((s) => {
          const list   = s.accessGrants[userId] ?? []
          const grant  = list.find((g) => g.module === module && g.projectId === projectId)
          const others = list.filter((g) => !(g.module === module && g.projectId === projectId))
          const sections: Record<string, AccessLevel> = { ...(grant?.sections ?? {}) }
          if (level === 'inherit') delete sections[section]
          else sections[section] = level
          const nextList = Object.keys(sections).length === 0
            ? others
            : [...others, { module, projectId, sections }]
          return { accessGrants: { ...s.accessGrants, [userId]: nextList } }
        }),

      setProjectAccessDefault: (userId, module, projectId, level) =>
        set((s) => {
          const list   = s.accessGrants[userId] ?? []
          const grant  = list.find((g) => g.module === module && g.projectId === projectId)
          const others = list.filter((g) => !(g.module === module && g.projectId === projectId))
          const sections: Record<string, AccessLevel> = { ...(grant?.sections ?? {}), '*': level }
          return { accessGrants: { ...s.accessGrants, [userId]: [...others, { module, projectId, sections }] } }
        }),

      removeProjectGrant: (userId, module, projectId) =>
        set((s) => ({
          accessGrants: {
            ...s.accessGrants,
            [userId]: (s.accessGrants[userId] ?? []).filter(
              (g) => !(g.module === module && g.projectId === projectId)
            ),
          },
        })),

      addCustomMember: (data) => {
        const id = generateId()
        const member: CustomMember = { ...data, id, createdAt: now(), updatedAt: now() }
        set((s) => ({ customMembers: [...s.customMembers, member] }))
        return id
      },
      updateCustomMember: (id, patch) =>
        set((s) => ({
          customMembers: s.customMembers.map((m) =>
            m.id === id ? { ...m, ...patch, updatedAt: now() } : m
          ),
        })),
      removeCustomMember: (id) =>
        set((s) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [id]: _grants, ...restGrants } = s.accessGrants
          return {
            customMembers: s.customMembers.filter((m) => m.id !== id),
            accessGrants: restGrants,
          }
        }),

      purgeProjectAccess: (module, projectId) =>
        set((s) => {
          const accessGrants: Record<string, ProjectGrant[]> = {}
          for (const [uid, grants] of Object.entries(s.accessGrants)) {
            const kept = grants.filter((g) => !(g.module === module && g.projectId === projectId))
            if (kept.length) accessGrants[uid] = kept
          }
          const memberships: Record<string, MemberLink[]> = {}
          for (const [uid, links] of Object.entries(s.memberships)) {
            const kept = links.filter((l) => !(l.module === module && l.projectId === projectId))
            if (kept.length) memberships[uid] = kept
          }
          return { accessGrants, memberships }
        }),

      purgeModuleAccess: (module) =>
        set((s) => {
          const accessGrants: Record<string, ProjectGrant[]> = {}
          for (const [uid, grants] of Object.entries(s.accessGrants)) {
            const kept = grants.filter((g) => g.module !== module)
            if (kept.length) accessGrants[uid] = kept
          }
          const memberships: Record<string, MemberLink[]> = {}
          for (const [uid, links] of Object.entries(s.memberships)) {
            const kept = links.filter((l) => l.module !== module)
            if (kept.length) memberships[uid] = kept
          }
          return { accessGrants, memberships }
        }),
    }),
    { name: 'brand-ops-users-v1' }
  )
)
