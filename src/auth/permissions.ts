import type { UserRole } from './users'

// ─── Section keys ─────────────────────────────────────────────────────────────
// Each key identifies a guarded section of the app.
// Add new keys here as new sections are built; add them to ROLE_PERMISSIONS below.

export type SectionKey =
  // ── Events ──────────────────────────────────────────────────────────────
  | 'event.tasks'
  | 'event.timeline'
  | 'event.budget'
  | 'event.vendors'
  | 'event.teams'
  | 'event.creative'
  | 'event.collaterals'
  // ── Shoots ──────────────────────────────────────────────────────────────
  | 'shoot.checklist'
  | 'shoot.timeline'
  | 'shoot.budget'
  | 'shoot.vendors'
  | 'shoot.crew'
  | 'shoot.creative'
  | 'shoot.styling'
  | 'shoot.callsheet'
  | 'shoot.brief'
  | 'shoot.props'
  // ── Events (additional) ─────────────────────────────────────────────────
  | 'event.props'
  // ── Magazine ─────────────────────────────────────────────────────────────
  | 'magazine.tasks'
  | 'magazine.writing'
  | 'magazine.visual'
  | 'magazine.graphics'
  | 'magazine.spread'
  | 'magazine.outreach'
  | 'magazine.budget'

// ─── Role → section permissions ───────────────────────────────────────────────
// TO ADJUST: edit ONLY this object. Sections not listed for a role are read-only
// for that role. When no user is logged in, ALL sections remain editable.

export const ROLE_PERMISSIONS: Record<UserRole, SectionKey[]> = {
  producer: [
    // Full operations ownership
    'event.tasks', 'event.timeline', 'event.budget', 'event.vendors', 'event.teams',
    'event.props',
    'shoot.checklist', 'shoot.timeline', 'shoot.budget', 'shoot.vendors',
    'shoot.crew', 'shoot.callsheet', 'shoot.props',
    // Magazine — operations: tasks, writing plan, outreach, budget, spread planning
    'magazine.tasks', 'magazine.writing', 'magazine.spread', 'magazine.outreach', 'magazine.budget',
  ],
  art_director: [
    // Creative ownership across both modules
    'event.creative', 'event.collaterals', 'event.props',
    'shoot.creative', 'shoot.brief', 'shoot.styling', 'shoot.props',
    // Magazine — creative: tasks, visual mood board, graphics, writing, spread
    'magazine.tasks', 'magazine.writing', 'magazine.visual', 'magazine.graphics', 'magazine.spread',
  ],
  stylist: [
    'shoot.styling', 'shoot.brief',
  ],
  hmu: [
    'shoot.brief',
  ],
  retail_lead: [
    'event.teams', 'event.tasks',
  ],
  assistant: [
    // Can add tasks and update checklist statuses; no budget/vendor access
    'event.tasks', 'shoot.checklist',
  ],
  viewer: [
    // Read-only everywhere
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function canEdit(role: UserRole, section: SectionKey): boolean {
  return ROLE_PERMISSIONS[role].includes(section)
}

// NOTE: broad-visibility / "see all projects" access is no longer role-based.
// Use isAdminUser() from auth/users.ts instead.  Admin status is user-ID-specific
// and must be explicitly set on an AppUser record — it cannot be granted by role.
