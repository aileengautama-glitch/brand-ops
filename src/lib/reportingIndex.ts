/**
 * reportingIndex — gates and approvals flattened into rows you can query.
 *
 * Gates live in two places by design (milestones on the timeline, gate-flagged items
 * on the checklist) and approvals live per project. Cross-project reporting needs one
 * flat shape with the project and season attached, dates already resolved, and status
 * normalised — which is exactly what this produces.
 *
 * The field list mirrors the reporting schema (see migration 0023): projectId, season,
 * type, anchorType, offsetDays, computedDueDate, status, owner for gates; projectId,
 * season, category, neededBy, status, decidedBy, decidedOn, costImpact for approvals.
 * The same shape is what the sync hooks push to Supabase, so a server-side query and
 * this client projection answer identically.
 */
import type { ShootProject } from '@/types/shoot'
import type { EventProject } from '@/types/event'
import type { Approval, MilestoneAnchor, TimelineMilestone } from '@/types/common'
import type { ChecklistItem } from '@/types/checklist'
import { resolveMilestone, daysUntil, leadTimeWarning, type ProjectAnchors } from '@/lib/scheduleEngine'
import { isResolved } from '@/lib/approvalEngine'

export type ReportModule = 'shoot' | 'event'
/** Normalised progress — deliberately maps onto not-started / in-progress / complete. */
export type GateStatus = 'not_started' | 'in_progress' | 'complete'
export type GateSource = 'milestone' | 'checklist'

export interface GateRow {
  id: string
  projectId: string
  projectName: string
  module: ReportModule
  season: string
  /** Where it came from, so the UI can link to the right editor. */
  source: GateSource
  /** 'gate' rows are dated and reportable; 'checkbox' rows are same-day only. */
  type: 'gate' | 'checkbox'
  title: string
  owner: string
  anchorType: MilestoneAnchor
  offsetDays: number
  /** Resolved from anchor + offset, or the manual date. '' when undatable. */
  computedDueDate: string
  status: GateStatus
  /** Negative = overdue by n days. null when undated. */
  daysRemaining: number | null
  /** Set when the gate sits inside its own production lead time. */
  leadTimeLabel: string | null
}

export interface ApprovalRow {
  id: string
  projectId: string
  projectName: string
  module: ReportModule
  season: string
  title: string
  category: string
  neededBy: string
  status: Approval['status']
  decidedBy: string
  decidedOn: string
  costImpact: string
  recommendation: string
  daysRemaining: number | null
  /** How many field updates this approval applied, for the log column. */
  appliedChanges: number
}

// ─── Gate extraction ──────────────────────────────────────────────────────────

const milestoneStatus = (m: TimelineMilestone): GateStatus =>
  m.completed ? 'complete' : 'not_started'

function gateFromMilestone(
  m: TimelineMilestone, anchors: ProjectAnchors, base: Omit<GateRow, keyof ReturnType<typeof gateShape>>,
): GateRow {
  const resolved = resolveMilestone(m, anchors)
  const warn = leadTimeWarning(m.title, resolved.date)
  return {
    ...base,
    ...gateShape({
      id: m.id,
      source: 'milestone',
      type: (m.anchorType ?? 'none') === 'none' && !m.date ? 'checkbox' : 'gate',
      title: m.title,
      owner: m.owner ?? '',
      anchorType: resolved.anchorType,
      offsetDays: resolved.offsetDays,
      computedDueDate: resolved.date,
      status: milestoneStatus(m),
      leadTimeLabel: warn?.label ?? null,
    }),
  }
}

function gateFromChecklist(
  c: ChecklistItem, anchors: ProjectAnchors, base: Omit<GateRow, keyof ReturnType<typeof gateShape>>,
): GateRow {
  const resolved = resolveMilestone(
    { id: c.id, title: c.label, date: '', description: '', notes: '', relatedTaskIds: [], order: c.order,
      anchorType: c.anchorType, offsetDays: c.offsetDays },
    anchors,
  )
  const warn = leadTimeWarning(c.label, resolved.date)
  return {
    ...base,
    ...gateShape({
      id: c.id,
      source: 'checklist',
      type: c.isGate ? 'gate' : 'checkbox',
      title: c.label,
      owner: c.owner,
      anchorType: resolved.anchorType,
      offsetDays: resolved.offsetDays,
      computedDueDate: c.isGate ? resolved.date : '',
      status: c.done ? 'complete' : 'not_started',
      leadTimeLabel: warn?.label ?? null,
    }),
  }
}

/** Keeps the two extractors honest about which fields they own. */
function gateShape(x: {
  id: string; source: GateSource; type: 'gate' | 'checkbox'; title: string; owner: string
  anchorType: MilestoneAnchor; offsetDays: number; computedDueDate: string
  status: GateStatus; leadTimeLabel: string | null
}) {
  return {
    ...x,
    daysRemaining: x.computedDueDate ? daysUntil(x.computedDueDate) : null,
  }
}

function anchorsOf(p: ShootProject | EventProject, module: ReportModule): ProjectAnchors {
  return module === 'shoot'
    ? { shoot: (p as ShootProject).shootDateISO, launch: p.launchDate }
    : { event: (p as EventProject).eventDate, launch: p.launchDate }
}

/** Every gate across every supplied project, milestones and checklist gates alike. */
export function buildGateRows(
  shoots: ShootProject[], events: EventProject[],
): GateRow[] {
  const out: GateRow[] = []

  const push = (p: ShootProject | EventProject, module: ReportModule) => {
    const anchors = anchorsOf(p, module)
    const base = {
      projectId: p.id,
      projectName: p.name,
      module,
      season: p.season?.trim() ?? '',
    } as Omit<GateRow, keyof ReturnType<typeof gateShape>>

    for (const m of p.milestones) out.push(gateFromMilestone(m, anchors, base))
    for (const c of p.checklistItems ?? []) out.push(gateFromChecklist(c, anchors, base))
  }

  for (const p of shoots) push(p, 'shoot')
  for (const p of events) push(p, 'event')
  return out
}

/** Every approval across every supplied project. */
export function buildApprovalRows(
  shoots: ShootProject[], events: EventProject[],
): ApprovalRow[] {
  const out: ApprovalRow[] = []

  const push = (p: ShootProject | EventProject, module: ReportModule) => {
    for (const a of p.decisions ?? []) {
      out.push({
        id: a.id,
        projectId: p.id,
        projectName: p.name,
        module,
        season: p.season?.trim() ?? '',
        title: a.title,
        category: a.category,
        neededBy: a.neededBy,
        status: a.status,
        decidedBy: a.decidedBy,
        decidedOn: a.decidedOn,
        costImpact: a.costImpact,
        recommendation: a.recommendation,
        daysRemaining: a.neededBy ? daysUntil(a.neededBy) : null,
        appliedChanges: (a.changeLog ?? []).length,
      })
    }
  }

  for (const p of shoots) push(p, 'shoot')
  for (const p of events) push(p, 'event')
  return out
}

// ─── Query helpers (the same predicates the server-side views use) ────────────

/** Dated, incomplete gates due within `days` — the "this week" question. */
export function gatesDueWithin(rows: GateRow[], days: number): GateRow[] {
  return rows
    .filter((g) => g.type === 'gate' && g.status !== 'complete' && g.daysRemaining !== null)
    .filter((g) => g.daysRemaining! >= 0 && g.daysRemaining! <= days)
    .sort((a, b) => a.daysRemaining! - b.daysRemaining!)
}

/** Past due and not complete, most overdue first. */
export function gatesOverdue(rows: GateRow[]): GateRow[] {
  return rows
    .filter((g) => g.type === 'gate' && g.status !== 'complete' && g.daysRemaining !== null && g.daysRemaining! < 0)
    .sort((a, b) => a.daysRemaining! - b.daysRemaining!)
}

/** How bad is late — drives the severity colour. */
export function overdueSeverity(daysRemaining: number): 'slipping' | 'late' | 'critical' {
  const late = Math.abs(daysRemaining)
  if (late <= 3) return 'slipping'
  if (late <= 14) return 'late'
  return 'critical'
}

export const SEVERITY_META: Record<'slipping' | 'late' | 'critical', { label: string; chip: string }> = {
  slipping: { label: 'Slipping', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  late:     { label: 'Late',     chip: 'bg-orange-50 text-orange-700 border-orange-200' },
  critical: { label: 'Critical', chip: 'bg-red-50 text-red-700 border-red-200' },
}

export function pendingApprovals(rows: ApprovalRow[]): ApprovalRow[] {
  return rows
    .filter((a) => !isResolved(a.status))
    .sort((a, b) => {
      if (a.neededBy && b.neededBy && a.neededBy !== b.neededBy) return a.neededBy < b.neededBy ? -1 : 1
      if (a.neededBy && !b.neededBy) return -1
      if (!a.neededBy && b.neededBy) return 1
      return 0
    })
}

export const GATE_STATUS_META: Record<GateStatus, { label: string; chip: string }> = {
  not_started: { label: 'Not started', chip: 'bg-white text-ink-muted border-surface-3' },
  in_progress: { label: 'In progress', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  complete:    { label: 'Complete',    chip: 'bg-accent/10 text-accent border-accent/30' },
}
