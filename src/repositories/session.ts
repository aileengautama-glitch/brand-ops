/**
 * Session repository — who is currently logged in, and profile lookup.
 *
 * Phase A: reads from the static APP_USERS list + useUserStore.
 *
 * Phase B swap:
 *   1. Replace getCurrentProfile() to call supabase.auth.getUser()
 *      then join to the profiles table.
 *   2. Replace listProfiles() to SELECT * FROM profiles.
 *   3. getProfileById() → SELECT * FROM profiles WHERE id = $1.
 *   The ISessionRepository interface stays identical; only this file changes.
 */
import { APP_USERS } from '@/auth/users'
import { useUserStore } from '@/store/useUserStore'
import type { ISessionRepository, SessionProfile } from './_types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSessionProfile(user: (typeof APP_USERS)[number]): SessionProfile {
  return {
    id:          user.id,
    name:        user.name,
    email:       user.email,
    role:        user.role,
    initials:    user.initials,
    avatarColor: user.avatarColor,
    // supabaseId: undefined — set in Phase B once auth is wired
  }
}

// ─── Implementation ───────────────────────────────────────────────────────────

export const SessionRepository: ISessionRepository = {
  /**
   * Returns the profile of the currently selected user, or null if no one
   * is logged in.
   *
   * Phase A: reads currentUserId from useUserStore then looks up APP_USERS.
   * Phase B: returns the authenticated Supabase user mapped to a profile row.
   */
  async getCurrentProfile(): Promise<SessionProfile | null> {
    const { currentUserId } = useUserStore.getState()
    if (!currentUserId) return null
    const user = APP_USERS.find((u) => u.id === currentUserId)
    return user ? toSessionProfile(user) : null
  },

  /**
   * Returns a single profile by ID, or null if not found.
   */
  async getProfileById(id: string): Promise<SessionProfile | null> {
    const user = APP_USERS.find((u) => u.id === id)
    return user ? toSessionProfile(user) : null
  },

  /**
   * Returns all known profiles.
   * Phase A: returns APP_USERS.
   * Phase B: SELECT * FROM profiles ORDER BY name.
   */
  async listProfiles(): Promise<SessionProfile[]> {
    return APP_USERS.map(toSessionProfile)
  },
}
