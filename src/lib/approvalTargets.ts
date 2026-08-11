/**
 * Approval targets — the project fields an approval can write when it's approved.
 *
 * One registry per module, each entry owning its own read + write. The approval
 * itself only stores a field KEY and a value, so nothing in the approval code has
 * to know the project shape, and adding a new approvable field is one entry here.
 *
 * Writes go through the normal store actions, so they dual-write and sync exactly
 * like a manual edit. Every write is captured as an ApprovalChange (old → new) by
 * the caller, so an automatic update is never silent.
 */
import { useShootStore } from '@/store/useShootStore'
import { useEventStore } from '@/store/useEventStore'
import type { ShootProject } from '@/types/shoot'
import type { EventProject } from '@/types/event'

export type ApprovalModule = 'shoot' | 'event'

export interface ApprovalTargetDef<P> {
  key: string
  label: string
  /** Short hint shown next to the field picker. */
  hint?: string
  read: (p: P) => string
  write: (projectId: string, value: string) => void
}

// ─── Shoot ────────────────────────────────────────────────────────────────────

const shootTargets: ApprovalTargetDef<ShootProject>[] = [
  {
    key: 'budget.total', label: 'Total budget', hint: 'Sets the approved budget envelope',
    read: (p) => String(p.totalBudget ?? 0),
    write: (id, v) => useShootStore.getState().updateTotalBudget(id, Number(v) || 0),
  },
  {
    key: 'brief.location', label: 'Location / studio',
    read: (p) => p.briefDetails.location ?? '',
    write: (id, v) => useShootStore.getState().updateBriefDetails(id, { location: v }),
  },
  {
    key: 'brief.shootType', label: 'Shoot type',
    read: (p) => p.briefDetails.shootType ?? '',
    write: (id, v) => useShootStore.getState().updateBriefDetails(id, { shootType: v }),
  },
  {
    key: 'brief.collection', label: 'Collection',
    read: (p) => p.briefDetails.collection ?? '',
    write: (id, v) => useShootStore.getState().updateBriefDetails(id, { collection: v }),
  },
  {
    key: 'brief.shootDate', label: 'Shoot date (display)',
    read: (p) => p.briefDetails.shootDate ?? '',
    write: (id, v) => useShootStore.getState().updateBriefDetails(id, { shootDate: v }),
  },
  {
    key: 'anchor.shootDate', label: 'Shoot date (schedule anchor)', hint: 'Moves every anchored gate',
    read: (p) => p.shootDateISO ?? '',
    write: (id, v) => useShootStore.getState().updateProject(id, { shootDateISO: v }),
  },
  {
    key: 'anchor.launchDate', label: 'Launch date (schedule anchor)', hint: 'Moves post-production gates',
    read: (p) => p.launchDate ?? '',
    write: (id, v) => useShootStore.getState().updateProject(id, { launchDate: v }),
  },
  {
    key: 'callsheet.onSiteContact', label: 'Owner of the day',
    read: (p) => p.callSheet?.onSiteContact ?? '',
    write: (id, v) => useShootStore.getState().updateCallSheet(id, { onSiteContact: v }),
  },
]

// ─── Event ────────────────────────────────────────────────────────────────────

const eventTargets: ApprovalTargetDef<EventProject>[] = [
  {
    key: 'budget.total', label: 'Total budget', hint: 'Sets the approved budget envelope',
    read: (p) => String(p.totalBudget ?? 0),
    write: (id, v) => useEventStore.getState().updateTotalBudget(id, Number(v) || 0),
  },
  {
    key: 'event.venue', label: 'Venue',
    read: (p) => p.venue ?? '',
    write: (id, v) => useEventStore.getState().updateProject(id, { venue: v }),
  },
  {
    key: 'anchor.eventDate', label: 'Event date (schedule anchor)', hint: 'Moves every anchored gate',
    read: (p) => p.eventDate ?? '',
    write: (id, v) => useEventStore.getState().updateProject(id, { eventDate: v }),
  },
  {
    key: 'anchor.launchDate', label: 'Launch date (schedule anchor)',
    read: (p) => p.launchDate ?? '',
    write: (id, v) => useEventStore.getState().updateProject(id, { launchDate: v }),
  },
  {
    key: 'event.runTime', label: 'Run time',
    read: (p) => p.runTime ?? '',
    write: (id, v) => useEventStore.getState().updateProject(id, { runTime: v }),
  },
]

// ─── Lookup ───────────────────────────────────────────────────────────────────

export function targetsFor(module: ApprovalModule) {
  return (module === 'shoot' ? shootTargets : eventTargets) as ApprovalTargetDef<unknown>[]
}

export function targetDef(module: ApprovalModule, key: string) {
  return targetsFor(module).find((t) => t.key === key) ?? null
}

export function targetLabel(module: ApprovalModule, key: string): string {
  return targetDef(module, key)?.label ?? key
}

/** Current value of a target on a project (for the old→new audit entry). */
export function readTarget(module: ApprovalModule, key: string, project: unknown): string {
  const def = targetDef(module, key)
  if (!def) return ''
  try { return def.read(project) } catch { return '' }
}

/** Apply a target's value. Returns false when the key isn't known. */
export function writeTarget(module: ApprovalModule, key: string, projectId: string, value: string): boolean {
  const def = targetDef(module, key)
  if (!def) return false
  def.write(projectId, value)
  return true
}
