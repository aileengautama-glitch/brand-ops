/**
 * RecentApprovals — the "what was signed off lately" module for the dashboard.
 *
 * Answers the question a manager and an owner both ask: what got decided, what did
 * it cost, who decided it, and what did the app change as a result.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useShootStore } from '@/store/useShootStore'
import { useEventStore } from '@/store/useEventStore'
import { formatDate } from '@/lib/utils'
import { APPROVAL_STATUS_META, isResolved } from '@/lib/approvalEngine'
import type { Approval } from '@/types/common'

interface Row {
  approval: Approval
  projectId: string
  projectName: string
  module: 'shoot' | 'event'
}

export default function RecentApprovals({ limit = 6 }: { limit?: number }) {
  const shootProjects = useShootStore((s) => s.projects)
  const eventProjects = useEventStore((s) => s.projects)

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    for (const p of shootProjects) {
      for (const a of p.decisions ?? []) {
        if (isResolved(a.status)) out.push({ approval: a, projectId: p.id, projectName: p.name, module: 'shoot' })
      }
    }
    for (const p of eventProjects) {
      for (const a of p.decisions ?? []) {
        if (isResolved(a.status)) out.push({ approval: a, projectId: p.id, projectName: p.name, module: 'event' })
      }
    }
    return out
      .sort((a, b) => (b.approval.decidedOn || '').localeCompare(a.approval.decidedOn || ''))
      .slice(0, limit)
  }, [shootProjects, eventProjects, limit])

  if (rows.length === 0) return null

  return (
    <div className="card-soft overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-2 bg-surface-1">
        <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">Recent Approvals</h2>
        <Link to="/approvals" className="text-xs text-ink-muted hover:text-ink transition-colors">
          Queue →
        </Link>
      </div>
      <div className="divide-y divide-surface-2">
        {rows.map(({ approval: a, projectId, projectName, module }) => {
          const meta = APPROVAL_STATUS_META[a.status] ?? APPROVAL_STATUS_META.approved
          const applied = (a.changeLog ?? []).length
          return (
            <Link
              key={`${projectId}-${a.id}`}
              to={`/${module}s/${projectId}/approvals`}
              className="flex items-center gap-3 px-4 py-2 hover:bg-surface-1/60 transition-colors"
            >
              <span className={`text-2xs px-1.5 py-0.5 rounded border shrink-0 ${meta.chip}`}>{meta.label}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink truncate">{a.title}</p>
                <p className="text-2xs text-ink-faint truncate">
                  {projectName}
                  {a.outcome ? ` · ${a.outcome}` : ''}
                </p>
              </div>
              {applied > 0 && (
                <span className="flex items-center gap-1 text-2xs text-accent shrink-0" title={`${applied} field update${applied === 1 ? '' : 's'} applied`}>
                  <Zap size={10} />{applied}
                </span>
              )}
              {a.costImpact && <span className="text-2xs text-ink-muted shrink-0">{a.costImpact}</span>}
              <span className="text-2xs text-ink-faint shrink-0 text-right">
                {a.decidedBy || '—'}
                {a.decidedOn ? <span className="block">{formatDate(a.decidedOn)}</span> : null}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
