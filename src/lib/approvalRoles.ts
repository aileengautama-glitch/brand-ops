/**
 * Who can do what with approvals.
 *
 * The old page gave everyone the same buttons, so it was impossible to tell who was
 * supposed to raise something versus who was supposed to sign it off. This is the
 * single place that answers that, and the UI states it out loud rather than just
 * hiding controls.
 *
 * Enforced through the existing role logic — no new permission model, no RLS change.
 * Admin is treated as an approver because that's how the rest of the app treats it.
 */
import type { UserRole } from '@/auth/users'

/** Roles that may raise an approval for someone else to decide. */
export const RAISER_ROLES: UserRole[] = ['producer', 'art_director']

/** Roles that may approve, decline or send back. */
export const APPROVER_ROLES: UserRole[] = ['art_director']

/**
 * 'head_of_marketing' isn't in the app's UserRole union yet (see migration 0022,
 * which allows it server-side because people.role is free text). Matching on the
 * raw string keeps the intent working the moment the role exists.
 */
const EXTRA_APPROVER_ROLE_KEYS = ['head_of_marketing', 'founder']
const EXTRA_RAISER_ROLE_KEYS = ['head_of_marketing']

export interface ApprovalAbility {
  canRaise: boolean
  canApprove: boolean
  /** Neither — the page is a read-only record for this person. */
  readOnly: boolean
  /** Short sentence explaining the current user's standing, shown in the UI. */
  explanation: string
}

export function approvalAbility(
  role: UserRole | string | undefined,
  isAdmin: boolean,
  /** Guests / logged-out keep the app's permissive pre-login behaviour. */
  isLoggedIn: boolean,
): ApprovalAbility {
  if (!isLoggedIn) {
    return {
      canRaise: true, canApprove: true, readOnly: false,
      explanation: 'Not signed in — no role applied, so nothing is restricted.',
    }
  }
  if (isAdmin) {
    return {
      canRaise: true, canApprove: true, readOnly: false,
      explanation: 'You are an admin: you can raise approvals and sign them off.',
    }
  }

  const key = String(role ?? '')
  const canApprove = APPROVER_ROLES.includes(key as UserRole) || EXTRA_APPROVER_ROLE_KEYS.includes(key)
  const canRaise = canApprove
    || RAISER_ROLES.includes(key as UserRole)
    || EXTRA_RAISER_ROLE_KEYS.includes(key)

  if (canApprove) {
    return { canRaise, canApprove, readOnly: false, explanation: 'You can raise approvals and sign them off.' }
  }
  if (canRaise) {
    return {
      canRaise, canApprove: false, readOnly: false,
      explanation: 'You can raise approvals. Sign-off is done by the Head of Marketing or an admin.',
    }
  }
  return {
    canRaise: false, canApprove: false, readOnly: true,
    explanation: 'Your role has read-only access here — you can see decisions and their outcomes.',
  }
}

/** Human labels for the matrix shown in the UI. */
export const ROLE_MATRIX: { who: string; raise: boolean; approve: boolean }[] = [
  { who: 'Head of Marketing', raise: true,  approve: true  },
  { who: 'Admin / founder',   raise: true,  approve: true  },
  { who: 'Art Director',      raise: true,  approve: true  },
  { who: 'Producer',          raise: true,  approve: false },
  { who: 'Everyone else',     raise: false, approve: false },
]

// ─── Categories ───────────────────────────────────────────────────────────────

export type ApprovalCategory =
  | 'Budget' | 'Quote' | 'Allocation' | 'Model' | 'Venue' | 'Supplier' | 'Other'

export const APPROVAL_CATEGORIES: ApprovalCategory[] = [
  'Budget', 'Quote', 'Allocation', 'Model', 'Venue', 'Supplier', 'Other',
]

/** Categories whose approval moves money — these link to budget lines. */
export const MONEY_CATEGORIES: ApprovalCategory[] = ['Budget', 'Quote', 'Allocation']

export const isMoneyCategory = (c: string) => MONEY_CATEGORIES.includes(c as ApprovalCategory)

/**
 * Pull a number out of a free-text cost impact ("+$450", "-1,200", "no change").
 * Returns 0 when there's no number, so totals never NaN.
 */
export function parseCostImpact(text: string): number {
  if (!text) return 0
  const cleaned = text.replace(/[,\s]/g, '')
  const m = /-?\$?\d+(\.\d+)?/.exec(cleaned)
  if (!m) return 0
  const n = Number(m[0].replace('$', ''))
  if (Number.isNaN(n)) return 0
  // A leading minus anywhere before the number means a saving.
  return /^-|\(-/.test(cleaned) ? -Math.abs(n) : n
}
