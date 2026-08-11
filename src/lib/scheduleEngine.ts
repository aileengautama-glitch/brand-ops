/**
 * scheduleEngine — anchor + offset milestone scheduling.
 *
 * A milestone (gate) stores an ANCHOR ('shoot' | 'launch' | 'event') and an OFFSET
 * in days before it — "28 days before the shoot". Its deadline is DERIVED from the
 * project's anchor dates, never typed. Set one date on the project and every
 * dependent deadline moves with it.
 *
 * Anchor rule (from the production brief):
 *   pre-production counts back from the shoot / event date;
 *   post-production and offline work count back from the launch date.
 *
 * Legacy-safe: a milestone with no anchor (anchorType undefined or 'none') keeps
 * using its manually typed `date`, so existing projects are unchanged. Nothing is
 * recomputed into storage — dates are derived at render time, so moving an anchor
 * can never corrupt stored data.
 */
import type { MilestoneAnchor, TimelineMilestone } from '@/types/common'

/** The project's anchor dates (ISO yyyy-mm-dd). Any may be unset. */
export interface ProjectAnchors {
  shoot?: string
  launch?: string
  event?: string
}

export const ANCHOR_LABELS: Record<MilestoneAnchor, string> = {
  none:   'Manual date',
  shoot:  'Before shoot date',
  launch: 'Before launch date',
  event:  'Before event date',
}

/** Anchor options offered for a module (events have no shoot date, and vice versa). */
export function anchorOptions(module: 'shoot' | 'event'): MilestoneAnchor[] {
  return module === 'shoot'
    ? ['none', 'shoot', 'launch']
    : ['none', 'event', 'launch']
}

// ─── Date helpers (UTC-safe, ISO yyyy-mm-dd in / out) ────────────────────────

function parseISO(iso?: string): Date | null {
  if (!iso) return null
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Whole days from today (UTC) until `iso` — negative when in the past. */
export function daysUntil(iso: string): number | null {
  const target = parseISO(iso)
  if (!target) return null
  const today = parseISO(toISO(new Date()))!
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

// ─── Resolution ──────────────────────────────────────────────────────────────

export interface ResolvedMilestone {
  /** The deadline to show: computed from the anchor, else the manual date. */
  date: string
  /** True when the date came from anchor + offset (not typed by hand). */
  computed: boolean
  /** Set when an anchor is chosen but the project hasn't got that date yet. */
  missingAnchor: boolean
  anchorType: MilestoneAnchor
  offsetDays: number
}

const anchorDate = (anchors: ProjectAnchors, a: MilestoneAnchor): string | undefined =>
  a === 'shoot' ? anchors.shoot : a === 'launch' ? anchors.launch : a === 'event' ? anchors.event : undefined

/**
 * Resolve one milestone's effective deadline.
 * anchor + offset wins; otherwise the stored manual date is returned unchanged.
 */
export function resolveMilestone(m: TimelineMilestone, anchors: ProjectAnchors): ResolvedMilestone {
  const anchorType = m.anchorType ?? 'none'
  const offsetDays = m.offsetDays ?? 0

  if (anchorType === 'none') {
    return { date: m.date, computed: false, missingAnchor: false, anchorType, offsetDays }
  }

  const base = parseISO(anchorDate(anchors, anchorType))
  if (!base) {
    // Anchor selected but the project date isn't set yet — fall back to any manual date.
    return { date: m.date, computed: false, missingAnchor: true, anchorType, offsetDays }
  }

  base.setUTCDate(base.getUTCDate() - offsetDays)
  return { date: toISO(base), computed: true, missingAnchor: false, anchorType, offsetDays }
}

/** Sort key: effective date first (undated last), then manual order. */
export function compareByResolvedDate(anchors: ProjectAnchors) {
  return (a: TimelineMilestone, b: TimelineMilestone) => {
    const da = resolveMilestone(a, anchors).date
    const db = resolveMilestone(b, anchors).date
    if (da && db && da !== db) return da < db ? -1 : 1
    if (da && !db) return -1
    if (!da && db) return 1
    return a.order - b.order
  }
}

// ─── Status + lead-time warnings ─────────────────────────────────────────────

export type MilestoneUrgency = 'none' | 'overdue' | 'due-soon' | 'upcoming'

export function milestoneUrgency(dateISO: string): MilestoneUrgency {
  if (!dateISO) return 'none'
  const d = daysUntil(dateISO)
  if (d === null) return 'none'
  if (d < 0) return 'overdue'
  if (d <= 7) return 'due-soon'
  return 'upcoming'
}

/**
 * Lead times that were missed in real projects (from the brief). Matched against a
 * milestone title so the warning appears on the gate it belongs to — the app should
 * say "this can no longer physically be produced in the time remaining" BEFORE it's
 * too late, not after.
 */
export const LEAD_TIMES: { match: RegExp; label: string; days: number }[] = [
  { match: /\bvenue\b/i,                          label: 'Venue booking',        days: 56  },   //  8–12 weeks
  { match: /\binvit(e|es|ation)/i,                label: 'Event invites',        days: 28  },   //  4 weeks
  { match: /\b(hero\s*vm|fabricat)/i,             label: 'Hero VM fabrication',  days: 70  },   // 10–12 weeks
  { match: /\b(large[- ]format|print|artwork)\b/i, label: 'Large-format print',  days: 15  },   // 10–15 working days
]

export interface LeadTimeWarning {
  label: string
  requiredDays: number
  actualDays: number
}

/**
 * Warn when a dated gate sits inside its own production lead time.
 * Returns null when the title matches no known lead time, or there's still room.
 */
export function leadTimeWarning(title: string, dateISO: string): LeadTimeWarning | null {
  if (!dateISO) return null
  const rule = LEAD_TIMES.find((r) => r.match.test(title))
  if (!rule) return null
  const actual = daysUntil(dateISO)
  if (actual === null || actual >= rule.days) return null
  return { label: rule.label, requiredDays: rule.days, actualDays: actual }
}
