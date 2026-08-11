/**
 * approvalEngine — what happens when an approval is resolved.
 *
 * Approving is not just a status flip. It:
 *   1. writes each linked target field on the project (via the target registry)
 *   2. marks linked gates complete
 *   3. releases tasks that were blocked waiting on it
 *   4. records old → new for every change, on the approval itself
 *   5. notifies the project owners
 *
 * Declining or changing records the outcome and notifies, but never writes fields —
 * the plan is left exactly as it was.
 */
import type { Approval, ApprovalChange, ApprovalStatus } from '@/types/common'
import { generateId } from '@/lib/utils'
import { useShootStore } from '@/store/useShootStore'
import { useEventStore } from '@/store/useEventStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { readTarget, writeTarget, targetLabel, type ApprovalModule } from '@/lib/approvalTargets'

export interface ResolveArgs {
  module: ApprovalModule
  projectId: string
  projectName: string
  approval: Approval
  status: Extract<ApprovalStatus, 'approved' | 'declined' | 'changed'>
  /** Who is resolving. */
  by: string
  /** Optional free-text outcome; defaults to the recommendation on approve. */
  outcome?: string
}

/** Names notified when an approval resolves: gate owners + task assignees. */
function ownersToNotify(module: ApprovalModule, projectId: string, approval: Approval): string[] {
  const names = new Set<string>()
  if (module === 'shoot') {
    const p = useShootStore.getState().projects.find((x) => x.id === projectId)
    if (!p) return []
    for (const gid of approval.linkedGateIds ?? []) {
      const g = p.milestones.find((m) => m.id === gid)
      if (g?.owner) names.add(g.owner)
    }
    for (const tid of approval.linkedTaskIds ?? []) {
      const t = p.tasks.find((x) => x.id === tid)
      const member = t?.assignedTo ? p.crewMembers.find((c) => c.id === t.assignedTo) : undefined
      if (member?.name) names.add(member.name)
    }
    if (p.callSheet?.onSiteContact) names.add(p.callSheet.onSiteContact)
  } else {
    const p = useEventStore.getState().projects.find((x) => x.id === projectId)
    if (!p) return []
    for (const gid of approval.linkedGateIds ?? []) {
      const g = p.milestones.find((m) => m.id === gid)
      if (g?.owner) names.add(g.owner)
    }
    for (const tid of approval.linkedTaskIds ?? []) {
      const t = p.tasks.find((x) => x.id === tid)
      const member = t?.assignedTo ? p.teamMembers.find((c) => c.id === t.assignedTo) : undefined
      if (member?.name) names.add(member.name)
    }
  }
  return [...names]
}

/**
 * Resolve an approval and apply everything that follows from it.
 * Returns the change log entries that were recorded (empty on decline).
 */
export function resolveApproval(args: ResolveArgs): ApprovalChange[] {
  const { module, projectId, projectName, approval, status, by } = args
  const at = new Date().toISOString()
  const today = at.slice(0, 10)
  const changes: ApprovalChange[] = []

  const shoot = useShootStore.getState()
  const event = useEventStore.getState()
  const project = module === 'shoot'
    ? shoot.projects.find((p) => p.id === projectId)
    : event.projects.find((p) => p.id === projectId)

  if (status === 'approved' && project) {
    // 1 — write the approved values into the project.
    for (const t of approval.targets ?? []) {
      const oldValue = readTarget(module, t.field, project)
      if (oldValue === t.value) continue
      if (writeTarget(module, t.field, projectId, t.value)) {
        changes.push({
          id: generateId(), at, by,
          label: targetLabel(module, t.field),
          oldValue, newValue: t.value,
        })
      }
    }

    // 2 — clear the gates this approval was blocking.
    for (const gid of approval.linkedGateIds ?? []) {
      const gate = project.milestones.find((m) => m.id === gid)
      if (!gate || gate.completed) continue
      const patch = { completed: true, completedAt: at }
      if (module === 'shoot') shoot.updateMilestone(projectId, gid, patch)
      else event.updateMilestone(projectId, gid, patch)
      changes.push({
        id: generateId(), at, by,
        label: `Gate: ${gate.title}`, oldValue: 'open', newValue: 'complete',
      })
    }

    // 3 — release tasks that were waiting on this approval.
    for (const tid of approval.linkedTaskIds ?? []) {
      const task = project.tasks.find((t) => t.id === tid)
      if (!task || task.blockedByApprovalId !== approval.id) continue
      const patch = { blockedByApprovalId: '' }
      if (module === 'shoot') shoot.updateTask(projectId, tid, patch)
      else event.updateTask(projectId, tid, patch)
      changes.push({
        id: generateId(), at, by,
        label: `Task released: ${task.title}`, oldValue: 'blocked', newValue: 'released',
      })
    }
  }

  // 4 — persist status + audit trail on the approval itself.
  const outcome = args.outcome?.trim()
    || (status === 'approved' ? (approval.outcome || approval.recommendation) : approval.outcome)
  const patch: Partial<Approval> = {
    status,
    decidedBy: by,
    decidedOn: today,
    outcome,
    changeLog: [...(approval.changeLog ?? []), ...changes],
  }
  if (module === 'shoot') shoot.updateDecision(projectId, approval.id, patch)
  else event.updateDecision(projectId, approval.id, patch)

  // 5 — tell the people who were waiting.
  const verb = status === 'approved' ? 'approved' : status === 'declined' ? 'declined' : 'changed'
  const audiences = ownersToNotify(module, projectId, approval)
  const notify = useNotificationStore.getState().notify
  const href = `/${module}s/${projectId}/approvals`
  const body = [
    outcome ? `Outcome: ${outcome}` : '',
    changes.length ? `${changes.length} update${changes.length === 1 ? '' : 's'} applied automatically.` : '',
  ].filter(Boolean).join(' ')

  if (audiences.length === 0) {
    notify({ kind: 'approval', title: `${projectName}: "${approval.title}" ${verb}`, body, href, audience: '' })
  } else {
    for (const audience of audiences) {
      notify({ kind: 'approval', title: `${projectName}: "${approval.title}" ${verb}`, body, href, audience })
    }
  }

  return changes
}

/** True for any resolved state (including the legacy Phase-1 'decided'). */
export const isResolved = (s: ApprovalStatus) => s !== 'open'

export const APPROVAL_STATUS_META: Record<ApprovalStatus, { label: string; chip: string }> = {
  open:     { label: 'Open',     chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', chip: 'bg-accent/10 text-accent border-accent/30' },
  declined: { label: 'Declined', chip: 'bg-red-50 text-red-600 border-red-200' },
  changed:  { label: 'Changed',  chip: 'bg-surface-2 text-ink-secondary border-surface-3' },
  decided:  { label: 'Decided',  chip: 'bg-accent/10 text-accent border-accent/30' },
}
