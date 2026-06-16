/**
 * Project content (editable text slice) — types + build/apply helpers.
 *
 * Phase E2 — first bidirectional shared-editing slice.
 *
 * EventContent / ShootContent are the editable scalar text fields that now sync
 * across devices.  They are typed as `Pick<…>` of the project so they apply
 * straight back into the Zustand store via existing update actions — no new
 * store API, no UI change.
 *
 * Used by useProjectContentSync for both directions:
 *   - build*  : project → content payload (local → remote)
 *   - apply*  : content payload → store (remote → local)
 */
import type { EventProject } from '@/types/event'
import type { ShootProject } from '@/types/shoot'
import { useEventStore } from '@/store/useEventStore'
import { useShootStore } from '@/store/useShootStore'

// ─── Content shapes (editable text slice of each project) ─────────────────────

export type EventContent = Pick<EventProject, 'eventDate' | 'venue' | 'runTime'>
export type ShootContent = Pick<ShootProject, 'briefDetails' | 'shootBrief'>

// ─── Build (project → content) ────────────────────────────────────────────────

export function buildEventContent(p: EventProject): EventContent {
  return {
    eventDate: p.eventDate,
    venue:     p.venue,
    runTime:   p.runTime,
  }
}

export function buildShootContent(p: ShootProject): ShootContent {
  return {
    briefDetails: p.briefDetails,
    shootBrief:   p.shootBrief,
  }
}

// ─── Apply (content → store) ──────────────────────────────────────────────────
// Reuses existing store actions so the editor's local behaviour is unchanged.

export function applyEventContent(projectId: string, content: EventContent): void {
  useEventStore.getState().updateProject(projectId, {
    eventDate: content.eventDate,
    venue:     content.venue,
    runTime:   content.runTime,
  })
}

export function applyShootContent(projectId: string, content: ShootContent): void {
  const store = useShootStore.getState()
  store.updateBriefDetails(projectId, content.briefDetails)
  store.updateShootBrief(projectId, content.shootBrief)
}
