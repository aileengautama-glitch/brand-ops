/**
 * DecisionQueue — every open decision across every shoot and event, in one place.
 *
 * This is the approver's view: batched rather than raised ad hoc, sorted by when the
 * answer is actually needed, so a weekly pass clears the queue. Decided rows are kept
 * (toggle) as the decision log.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleDot, ExternalLink, AlertTriangle, Check } from 'lucide-react'
import { useShootStore } from '@/store/useShootStore'
import { useEventStore } from '@/store/useEventStore'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { approvalAbility } from '@/lib/approvalRoles'
import ApprovalsNoAccess from '@/components/decisions/ApprovalsNoAccess'
import { formatDate, cn } from '@/lib/utils'
import { APPROVAL_STATUS_META, isResolved } from '@/lib/approvalEngine'
import { daysUntil } from '@/lib/scheduleEngine'
import type { Approval } from '@/types/common'

interface QueueRow {
  decision: Approval
  projectId: string
  projectName: string
  module: 'shoot' | 'event'
}

export default function DecisionQueue() {
  const shootProjects = useShootStore((s) => s.projects)
  const eventProjects = useEventStore((s) => s.projects)
  const [showDecided, setShowDecided] = useState(false)
  const { user, isAdmin, isLoggedIn } = useCurrentUser()
  const ability = approvalAbility(user?.role, isAdmin, isLoggedIn)

  const rows = useMemo<QueueRow[]>(() => {
    const out: QueueRow[] = []
    for (const p of shootProjects) {
      for (const d of p.decisions ?? []) out.push({ decision: d, projectId: p.id, projectName: p.name, module: 'shoot' })
    }
    for (const p of eventProjects) {
      for (const d of p.decisions ?? []) out.push({ decision: d, projectId: p.id, projectName: p.name, module: 'event' })
    }
    return out.sort((a, b) => {
      const A = a.decision, B = b.decision
      if (A.status !== B.status) return A.status === 'open' ? -1 : 1
      if (A.neededBy && B.neededBy && A.neededBy !== B.neededBy) return A.neededBy < B.neededBy ? -1 : 1
      if (A.neededBy && !B.neededBy) return -1
      if (!A.neededBy && B.neededBy) return 1
      return B.order - A.order
    })
  }, [shootProjects, eventProjects])

  if (!ability.canAccess) return <ApprovalsNoAccess />

  const open = rows.filter((r) => r.decision.status === 'open')
  const decided = rows.filter((r) => isResolved(r.decision.status))
  const visible = showDecided ? rows : open
  const overdueCount = open.filter((r) => {
    const d = r.decision.neededBy ? daysUntil(r.decision.neededBy) : null
    return d !== null && d < 0
  }).length

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-5">
        <h1 className="text-base font-semibold text-ink">Approval Queue</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          Everything awaiting sign-off across shoots and events, soonest first.
          {overdueCount > 0 && <span className="text-red-500 font-medium"> {overdueCount} past its needed-by date.</span>}
        </p>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xs font-bold uppercase tracking-widest text-ink-faint">
          {open.length} open{decided.length > 0 ? ` · ${decided.length} resolved` : ''}
        </span>
        {decided.length > 0 && (
          <button onClick={() => setShowDecided((v) => !v)}
            className="text-xs text-ink-muted hover:text-ink transition-colors">
            {showDecided ? 'Hide resolved' : 'Show resolved'}
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="bg-surface-1 border border-dashed border-surface-3 rounded-lg p-10 text-center">
          <CircleDot size={22} className="text-ink-faint mx-auto mb-2" />
          <p className="text-sm text-ink-muted">Nothing waiting on an approval.</p>
          <p className="text-xs text-ink-faint mt-1">Raise approvals from a project's Approvals page.</p>
        </div>
      ) : (
        <div className="bg-white border border-surface-3 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-1">
                <th className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-3 py-2 w-20">Status</th>
                <th className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-3 py-2">Approval</th>
                <th className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-3 py-2 w-44">Project</th>
                <th className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-3 py-2 w-32">Recommendation</th>
                <th className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-3 py-2 w-24">Cost</th>
                <th className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-3 py-2 w-28">Needed by</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ decision: d, projectId, projectName, module }) => {
                const days = d.neededBy ? daysUntil(d.neededBy) : null
                const overdue = d.status === 'open' && days !== null && days < 0
                return (
                  <tr key={`${projectId}-${d.id}`} className="border-b border-surface-3 last:border-0 hover:bg-surface-1/40 transition-colors">
                    <td className="px-3 py-2 align-top">
                      <span className={cn('text-2xs px-1.5 py-0.5 rounded border inline-flex items-center gap-1',
                        (APPROVAL_STATUS_META[d.status] ?? APPROVAL_STATUS_META.open).chip)}>
                        {d.status === 'approved' && <Check size={9} />}
                        {(APPROVAL_STATUS_META[d.status] ?? APPROVAL_STATUS_META.open).label}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="text-ink">{d.title}</span>
                      <span className="block text-2xs text-ink-faint">{d.category}</span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Link to={`/${module}s/${projectId}/approvals`}
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                        {projectName} <ExternalLink size={10} />
                      </Link>
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-ink-muted">{d.recommendation || '—'}</td>
                    <td className="px-3 py-2 align-top text-xs text-ink-muted">{d.costImpact || '—'}</td>
                    <td className="px-3 py-2 align-top">
                      {isResolved(d.status) ? (
                        <span className="text-2xs text-ink-faint">{d.decidedBy}{d.decidedOn ? ` · ${formatDate(d.decidedOn)}` : ''}</span>
                      ) : d.neededBy ? (
                        <span className={cn('text-xs inline-flex items-center gap-1',
                          overdue ? 'text-red-500 font-medium' : days !== null && days <= 3 ? 'text-amber-600' : 'text-ink-muted')}>
                          {overdue && <AlertTriangle size={10} />}
                          {formatDate(d.neededBy)}
                        </span>
                      ) : <span className="text-xs text-ink-faint">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
