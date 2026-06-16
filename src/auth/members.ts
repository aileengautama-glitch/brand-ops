import { APP_USERS, ROLE_LABELS, type AppUser } from './users'

// ─────────────────────────────────────────────────────────────────────────────
// People directory + custom members.
//
// The app has one logical "person" per collaborator. Two record sources unify
// into a single directory:
//   • APP_USERS         — real login accounts (static, in code today)
//   • CustomMember[]     — lightweight, admin-created collaborators (no login yet)
//
// Access grants (auth/access.ts) key by a stable personId, which is an app-user
// id OR a custom-member id. So a custom member can be assigned to projects/pages
// exactly like a real user, and when later invited the SAME record/id is reused
// (no duplicate account) — their grants carry over untouched.
// ─────────────────────────────────────────────────────────────────────────────

export type MemberStatus = 'internal' | 'external' | 'manual' | 'pending_invite' | 'active'

export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  internal:       'Internal',
  external:       'External',
  manual:         'Manual',
  pending_invite: 'Pending invite',
  active:         'Active',
}

/**
 * A lightweight, admin-created collaborator (no login). The canonical person
 * record for someone not in APP_USERS. Upgradeable to a real invited account
 * later by reusing this id — see module header.
 */
export interface CustomMember {
  id: string
  name: string
  role: string          // free-text function / title
  email: string         // preferred; '' allowed for V1 flexibility
  phone: string
  notes: string
  status: MemberStatus
  createdAt: string
  updatedAt: string
}

/** Unified directory person — real app user or custom member, one shape. */
export interface DirectoryPerson {
  id: string
  name: string
  roleLabel: string
  email: string
  phone?: string          // custom members only
  initials: string
  avatarColor: string
  isAppUser: boolean      // true = real login account
  isAdmin: boolean
  status?: MemberStatus   // custom members only
  /**
   * Canonical "has a linked Supabase auth login" flag, derived from
   * people.auth_user_id (set server-side by the 0017 trigger on invite-accept).
   * Only populated from the Supabase people read; undefined for local-only data.
   */
  linked?: boolean
}

// ─── Directory construction ──────────────────────────────────────────────────

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?'
}
const PLACEHOLDER_COLORS = ['#7A5C52', '#566246', '#4A5568', '#6B5E4F', '#8B5C4A', '#2C4A3E', '#1C3D2E']
function colorFor(id: string): string {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PLACEHOLDER_COLORS[h % PLACEHOLDER_COLORS.length]
}

export function appUserToPerson(u: AppUser): DirectoryPerson {
  return {
    id: u.id, name: u.name, roleLabel: ROLE_LABELS[u.role], email: u.email ?? '',
    initials: u.initials, avatarColor: u.avatarColor,
    isAppUser: true, isAdmin: u.isAdmin ?? false,
  }
}
export function customToPerson(m: CustomMember): DirectoryPerson {
  return {
    id: m.id, name: m.name, roleLabel: m.role || 'Collaborator', email: m.email, phone: m.phone,
    initials: initialsOf(m.name), avatarColor: colorFor(m.id),
    isAppUser: false, isAdmin: false, status: m.status,
  }
}

/** The full people directory: real accounts + admin-created custom members. */
export function buildDirectory(customMembers: CustomMember[]): DirectoryPerson[] {
  return [...APP_USERS.map(appUserToPerson), ...customMembers.map(customToPerson)]
}

/**
 * Resolve a CustomMember into an AppUser-shaped identity so an invited/linked
 * member can be the current user (their people.id === customMember.id). Baseline
 * role is 'viewer' (least privilege); real access still comes from access grants +
 * admin overrides, which key by the same id. Pure — used by useCurrentUser/UserChip.
 */
export function customMemberToAppUser(m: CustomMember): AppUser {
  return {
    id: m.id,
    name: m.name,
    role: 'viewer',
    initials: initialsOf(m.name),
    avatarColor: colorFor(m.id),
    email: m.email,
    isAdmin: false,
  }
}

/** A member can be invited when they have an email and aren't already active. */
export function memberCanInvite(m: CustomMember): boolean {
  return !!normEmail(m.email) && m.status !== 'active'
}

// ─── Matching / duplicate-prevention ─────────────────────────────────────────

export function normName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}
export function normEmail(s: string): string {
  return s.trim().toLowerCase()
}
function normPhone(s: string): string {
  return s.replace(/\D/g, '')
}

/** Exact email match across the whole directory (case-insensitive, trimmed). */
export function findByEmail(dir: DirectoryPerson[], email: string): DirectoryPerson | undefined {
  const e = normEmail(email)
  if (!e) return undefined
  return dir.find((p) => p.email && normEmail(p.email) === e)
}

export interface SoftMatch { person: DirectoryPerson; reason: string }

/**
 * Softer likely-duplicate checks (used when there's no exact email match):
 *   • identical normalized name
 *   • ≥ 2 shared name tokens (e.g. first + last)
 *   • identical phone number (digits only)
 */
export function softMatches(
  dir: DirectoryPerson[],
  input: { name: string; phone: string },
): SoftMatch[] {
  const n  = normName(input.name)
  const ph = normPhone(input.phone)
  const out: SoftMatch[] = []
  for (const p of dir) {
    const pn = normName(p.name)
    if (n && pn === n) { out.push({ person: p, reason: 'same name' }); continue }
    if (ph && p.phone && normPhone(p.phone) === ph) { out.push({ person: p, reason: 'same phone' }); continue }
    if (n) {
      const a = new Set(n.split(' ').filter((t) => t.length > 1))
      const b = new Set(pn.split(' ').filter((t) => t.length > 1))
      const shared = [...a].filter((t) => b.has(t))
      if (shared.length >= 2) { out.push({ person: p, reason: 'similar name' }); continue }
    }
  }
  return out
}
