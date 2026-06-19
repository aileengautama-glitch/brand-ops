// ─── Role type ────────────────────────────────────────────────────────────────

export type UserRole =
  | 'producer'
  | 'art_director'
  | 'stylist'
  | 'hmu'
  | 'retail_lead'
  | 'assistant'
  | 'viewer'

export const ROLE_LABELS: Record<UserRole, string> = {
  producer:     'Producer',
  art_director: 'Art Director',
  stylist:      'Stylist',
  hmu:          'Hair & Make-Up',
  retail_lead:  'Retail Lead',
  assistant:    'Assistant',
  viewer:       'Viewer',
}

// ─── User interface ───────────────────────────────────────────────────────────

export interface AppUser {
  id: string
  name: string
  role: UserRole
  initials: string
  /** Background colour for the avatar circle — must be dark enough for white text. */
  avatarColor: string
  email?: string
  /**
   * Base 4-digit PIN.  The effective PIN may be overridden per-device via
   * useUserStore.pinOverrides (so users can change it without editing code).
   *
   * Default is '0000' — users are prompted to change it on first login.
   * Not cryptographic — for shared devices only.
   * Future: replace PIN validation in SelectProfileView with Auth0/Clerk.
   */
  pin?: string
  /**
   * Admin flag — user-ID-specific, not role-based.
   *
   * Admin users can:
   *   - view ALL projects across both modules regardless of project membership
   *   - edit every section (bypasses ROLE_PERMISSIONS entirely)
   *   - see admin-only UI affordances (e.g. "All projects" toggle)
   *
   * Compatible with the future invite-only account model: when invite flows are
   * added, admin is the one who sends invites and assigns project memberships.
   * Membership rules for non-admins remain unchanged.
   *
   * To grant admin: set `isAdmin: true` on the user record below.
   * To revoke: remove the flag (or set false).  Never derived from role.
   */
  isAdmin?: boolean
}

// ─── Default PIN ──────────────────────────────────────────────────────────────
// Every user starts with this.  Changing it stores a local override in
// useUserStore.pinOverrides.  Matches against the override first, then this.

export const DEFAULT_PIN = '0000'

// ─── Configurable user roster ──────────────────────────────────────────────────
// Edit this list to add, remove, or update team members.
// IDs must be stable — they are stored in localStorage memberships.
// Colours use the app's design-token palette where possible.
//
// Admin designation: set isAdmin: true on the owner's record.
// Only user-ID-specific — never granted by role assignment.

export const APP_USERS: AppUser[] = [
  // ── Admin (workspace owner) ──────────────────────────────────────────────
  // The built-in demo roster (Sarah Chen, Marcus Williams, …) was removed — they were
  // seed people, not real users. Real collaborators are added via Settings → People &
  // Invites (invited by email) and resolve through Supabase, not this static list.
  { id: 'user-aileen', name: 'Aileen', role: 'producer', initials: 'A', avatarColor: '#2C4A3E', isAdmin: true, pin: DEFAULT_PIN },
]

export function getUserById(id: string): AppUser | undefined {
  return APP_USERS.find((u) => u.id === id)
}

/**
 * True only for users with `isAdmin: true` on their record.
 * Never derived from role — must be explicitly set per user.
 */
export function isAdminUser(userId: string): boolean {
  return APP_USERS.find((u) => u.id === userId)?.isAdmin === true
}
