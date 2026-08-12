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

/**
 * Sign-off sits with ONE person. Concentrating it is the point: an approval that
 * three different roles could grant isn't really an approval.
 *
 * 'head_of_marketing' is not in the app's UserRole union yet — people.role is free
 * text and migration 0022 already allows the value server-side, so it's matched as a
 * raw string and starts working the moment the role is set on a person.
 */
const HEAD_OF_MARKETING_KEYS = ['head_of_marketing']

/** Roles that may raise an approval for the Head of Marketing to decide. */
export const RAISER_ROLES: UserRole[] = ['art_director', 'producer']

/** Roles that may approve, decline or send back. Head of Marketing only. */
export const APPROVER_ROLE_KEYS = HEAD_OF_MARKETING_KEYS

export interface ApprovalAbility {
  /** False → the Approvals page is not shown at all, and neither is its nav entry. */
  canAccess: boolean
  canRaise: boolean
  canApprove: boolean
  /** Has access, but can only read. */
  readOnly: boolean
  /** Short sentence explaining the current user's standing, shown in the UI. */
  explanation: string
}

const NO_ACCESS: ApprovalAbility = {
  canAccess: false, canRaise: false, canApprove: false, readOnly: true,
  explanation: 'Approvals are not part of your role.',
}

export function approvalAbility(
  role: UserRole | string | undefined,
  isAdmin: boolean,
  /** Guests / logged-out keep the app's permissive pre-login behaviour. */
  isLoggedIn: boolean,
): ApprovalAbility {
  if (!isLoggedIn) {
    return {
      canAccess: true, canRaise: true, canApprove: true, readOnly: false,
      explanation: 'Not signed in — no role applied, so nothing is restricted.',
    }
  }

  const key = String(role ?? '')

  // Head of Marketing — the only approver. Can also raise.
  if (HEAD_OF_MARKETING_KEYS.includes(key)) {
    return {
      canAccess: true, canRaise: true, canApprove: true, readOnly: false,
      explanation: 'You are the approver: you can raise approvals and sign them off.',
    }
  }

  // Art Director / Producer — raise, but never decide.
  if (RAISER_ROLES.includes(key as UserRole)) {
    return {
      canAccess: true, canRaise: true, canApprove: false, readOnly: false,
      explanation: 'You can raise approvals. Sign-off is the Head of Marketing’s.',
    }
  }

  // Admin / founder — oversight without sign-off. Deliberately view-only here:
  // admin bypasses most gates in this app, and approvals are the one place where
  // that would defeat the purpose.
  if (isAdmin) {
    return {
      canAccess: true, canRaise: false, canApprove: false, readOnly: true,
      explanation: 'Admin view — you can see every approval and its log. Sign-off is the Head of Marketing’s.',
    }
  }

  return NO_ACCESS
}

/** Human labels for the matrix shown in the UI. */
export const ROLE_MATRIX: { who: string; raise: boolean; approve: boolean; note?: string }[] = [
  { who: 'Head of Marketing', raise: true,  approve: true  },
  { who: 'Art Director',      raise: true,  approve: false },
  { who: 'Producer',          raise: true,  approve: false },
  { who: 'Admin / founder',   raise: false, approve: false, note: 'view only' },
  { who: 'Everyone else',     raise: false, approve: false, note: 'no access' },
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
