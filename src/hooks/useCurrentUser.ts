import { useUserStore } from '@/store/useUserStore'
import { getUserById } from '@/auth/users'
import { customMemberToAppUser } from '@/auth/members'
import { canEdit as canEditFn } from '@/auth/permissions'
import type { SectionKey } from '@/auth/permissions'
import {
  sectionModule, hasModuleGrants, findGrant, grantSectionLevel, grantProjectLevel, ACCESS_RANK,
  type AccessModule,
} from '@/auth/access'

/**
 * Returns the current user's effective identity, permission helpers, and
 * project membership lookup.
 *
 * "Effective" means admin-set overrides (stored in useUserStore.userAccessOverrides)
 * are applied on top of the static APP_USERS record before anything is returned.
 * This means: changing a user's role or admin status in the Settings → Team Access
 * panel takes effect immediately everywhere without a page reload or code change.
 *
 * Access model:
 *   - Admin (isAdmin === true):
 *       • sees ALL projects in both modules
 *       • can edit every section (bypasses ROLE_PERMISSIONS)
 *       • no project membership required
 *   - Normal logged-in user:
 *       • sees ONLY projects they have an explicit MemberLink for
 *       • edit rights determined by ROLE_PERMISSIONS[effectiveRole]
 *       • zero memberships → empty project list (no free-pass fallback)
 *       • allowedModules restricts which module tabs + home pages are visible
 *   - Not logged in:
 *       • canEdit() returns true (preserves pre-login / guest-mode behaviour)
 *       • getMemberId() returns null
 *
 * Compatible with future invite-only accounts: invite flow populates the
 * memberships map for the invited user.  The visibility rule (isAdmin ? all :
 * linked only) remains the same.
 */
export function useCurrentUser() {
  const currentUserId       = useUserStore((s) => s.currentUserId)
  const memberships         = useUserStore((s) => s.memberships)
  const userAccessOverrides = useUserStore((s) => s.userAccessOverrides)
  const accessGrants        = useUserStore((s) => s.accessGrants)
  const customMembers       = useUserStore((s) => s.customMembers)

  // Resolve identity: a seed AppUser, else an admin-created custom member (an
  // invited/linked member's currentUserId === their people.id === customMember.id).
  // This is what makes a linked member a real, usable identity (not just APP_USERS).
  const baseUser = currentUserId
    ? (getUserById(currentUserId)
        ?? (() => { const m = customMembers.find((c) => c.id === currentUserId); return m ? customMemberToAppUser(m) : null })())
    : null
  const override = currentUserId ? (userAccessOverrides[currentUserId] ?? {}) : {}

  // Build the effective user — override fields take precedence over APP_USERS.
  // Spreading onto a new object means user.role and user.isAdmin are always the
  // effective values, so all display code (name, role label, avatar) is correct.
  const user = baseUser
    ? ({
        ...baseUser,
        role:    override.role    ?? baseUser.role,
        isAdmin: override.isAdmin !== undefined
          ? override.isAdmin
          : (baseUser.isAdmin ?? false),
      } as typeof baseUser)
    : null

  const isAdmin = user?.isAdmin ?? false

  /**
   * Which modules this user is allowed to enter.
   * - undefined in the override → all modules (default for everyone)
   * - ['event']  → Events only
   * - []         → no modules (admin can lock someone out entirely)
   * Admin always has access to all modules regardless of this value.
   */
  const allowedModules: ('event' | 'shoot' | 'magazine')[] = isAdmin
    ? ['event', 'shoot', 'magazine']
    : (override.allowedModules ?? ['event', 'shoot', 'magazine'])

  // ── Scoped access grants (project + page level) ─────────────────────────────
  const grants = currentUserId ? (accessGrants[currentUserId] ?? []) : []

  /** Legacy project visibility (pre-grants): magazine = all; events/shoots = membership. */
  const legacyProjectVisible = (module: AccessModule, projectId: string): boolean => {
    if (module === 'magazine') return true
    if (!currentUserId) return true
    return (memberships[currentUserId] ?? []).some(
      (l) => l.module === module && l.projectId === projectId
    )
  }

  return {
    user,
    isLoggedIn: user !== null,

    /**
     * True only for the designated admin user (or a user whose override sets isAdmin: true).
     * Use this — not role — to gate "see all projects" and admin affordances.
     */
    isAdmin,

    /**
     * @deprecated Use `isAdmin` instead.
     * Kept for gradual migration; resolves to the same value.
     */
    canSeeAllProjects: isAdmin,

    /**
     * Which modules this user may navigate to.
     * Admin always returns ['event', 'shoot'].
     * Use this to gate the module tabs in TopBar and the module home pages.
     */
    allowedModules,

    /**
     * True if the current user may EDIT this section.
     * Admin / not-logged-in (guest) always true.
     *
     * Pass `projectId` to enforce the scoped model:
     *   • If the user has any grant in the section's module → deny-by-default;
     *     edit requires an 'edit' grant on this project+section.
     *   • Otherwise (no grants in module) → legacy role-based edit (transition).
     * Omitting `projectId` keeps the legacy global behaviour (back-compat).
     */
    canEdit: (section: SectionKey, projectId?: string): boolean => {
      if (!user) return true
      if (isAdmin) return true
      if (!projectId) return canEditFn(user.role, section)
      const module = sectionModule(section)
      if (hasModuleGrants(grants, module)) {
        return grantSectionLevel(findGrant(grants, module, projectId), section) === 'edit'
      }
      return canEditFn(user.role, section)
    },

    /**
     * True if the current user may SEE this project at all.
     * Admin / guest always true. Scoped users: needs ≥ view somewhere in the project.
     * Legacy users: membership (events/shoots) or all (magazine).
     */
    canView: (module: AccessModule, projectId: string): boolean => {
      if (!user) return true
      if (isAdmin) return true
      if (!allowedModules.includes(module)) return false
      if (hasModuleGrants(grants, module)) {
        return ACCESS_RANK[grantProjectLevel(findGrant(grants, module, projectId))] >= ACCESS_RANK.view
      }
      return legacyProjectVisible(module, projectId)
    },

    /**
     * True if the current user may SEE a specific page/section within a project.
     * Used to hide section tabs a scoped user has no access to.
     */
    canViewSection: (section: SectionKey, projectId: string): boolean => {
      if (!user) return true
      if (isAdmin) return true
      const module = sectionModule(section)
      if (!allowedModules.includes(module)) return false
      if (hasModuleGrants(grants, module)) {
        return ACCESS_RANK[grantSectionLevel(findGrant(grants, module, projectId), section)] >= ACCESS_RANK.view
      }
      return legacyProjectVisible(module, projectId)
    },

    /** Returns the project-local member ID for the current user in the given
     *  project, or null if they haven't linked themselves to it yet. */
    getMemberId: (module: 'event' | 'shoot' | 'magazine', projectId: string): string | null => {
      if (!currentUserId) return null
      const link = (memberships[currentUserId] ?? []).find(
        (l) => l.module === module && l.projectId === projectId
      )
      return link?.memberId ?? null
    },
  }
}
