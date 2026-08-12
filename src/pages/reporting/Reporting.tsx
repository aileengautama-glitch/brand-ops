/**
 * Reporting — the cross-project views, in one place with tabs.
 *
 * Answers the four questions that previously needed opening every project:
 * what's due this week, what's late, what does a season look like end to end, and
 * what is waiting on a decision.
 *
 * Every tab reads the same flattened index (lib/reportingIndex.ts), so the
 * definitions of "gate", "overdue" and "pending" can't drift between views.
 */
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarClock, AlertTriangle, LayoutList, CircleDot, Wallet, ExternalLink } from 'lucide-react'
import { useShootStore } from '@/store/useShootStore'
import { useEventStore } from '@/store/useEventStore'
import { cn, formatDate } from '@/lib/utils'
import {
  buildGateRows, buildApprovalRows, gatesDueWithin, gatesOverdue,
  overdueSeverity, SEVERITY_META, pendingApprovals, GATE_STATUS_META,
  type GateRow, type ApprovalRow,
} from '@/lib/reportingIndex'
import { groupBySeason, seasonsPresent, UNASSIGNED_SEASON_LABEL } from '@/lib/seasons'
import { APPROVAL_STATUS_META } from '@/lib/approvalEngine'
import SeasonTimeline from './SeasonTimeline'

type Tab = 'week' | 'overdue' | 'season' | 'approvals'

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'week',      label: 'This week',      icon: CalendarClock },
  { key: 'overdue',   label: 'Overdue',        icon: AlertTriangle },
  { key: 'season',    label: 'By season',      icon: LayoutList },
  { key: 'approvals', label: 'Approvals queue', icon: CircleDot },
]

export default function Reporting() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) ?? 'week'
  const shoots = useShootStore((s) => s.projects)
  const events = useEventStore((s) => s.projects)

  const gates = useMemo(() => buildGateRows(shoots, events), [shoots, events])
  const approvals = useMemo(() => buildApprovalRows(shoots, events), [shoots, events])

  const dueThisWeek = useMemo(() => gatesDueWithin(gates, 7), [gates])
  const overdue = useMemo(() => gatesOverdue(gates), [gates])
  const pending = useMemo(() => pendingApprovals(approvals), [approvals])

  const setTab = (t: Tab) => setParams((p) => { p.set('tab', t); return p }, { replace: true })

  const counts: Record<Tab, number> = {
    week: dueThisWeek.length,
    overdue: overdue.length,
    season: 0,
    approvals: pending.length,
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-ink">Reporting</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Every project's gates and approvals in one place — no opening each one to find out.
          </p>
        </div>
        <Link to="/reporting/budget"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors shrink-0">
          <Wallet size={13} /> Season budgets
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 mb-5 border-b border-surface-3">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
              tab === key
                ? 'border-accent text-accent font-medium'
                : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            <Icon size={13} /> {label}
            {counts[key] > 0 && (
              <span className={cn('text-2xs px-1.5 rounded-full tabular-nums',
                key === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-surface-2 text-ink-muted')}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'week' && (
        <GateTable
          rows={dueThisWeek}
          emptyTitle="Nothing due in the next 7 days"
          emptyBody="Gates appear here once they have an anchor date and aren't complete."
        />
      )}

      {tab === 'overdue' && (
        <GateTable
          rows={overdue}
          showSeverity
          emptyTitle="Nothing overdue"
          emptyBody="Every dated gate is either complete or still ahead of its deadline."
        />
      )}

      {tab === 'season' && <SeasonTimeline gates={gates} shoots={shoots} events={events} />}

      {tab === 'approvals' && <ApprovalTable rows={pending} />}
    </div>
  )
}

// ─── Gates ────────────────────────────────────────────────────────────────────

function GateTable({
  rows, showSeverity, emptyTitle, emptyBody,
}: {
  rows: GateRow[]
  showSeverity?: boolean
  emptyTitle: string
  emptyBody: string
}) {
  const [season, setSeason] = useState<string>('__all__')
  const seasons = seasonsPresent(rows)
  const filtered = season === '__all__' ? rows : rows.filter((r) => r.season === season)

  if (rows.length === 0) return <Empty title={emptyTitle} body={emptyBody} />

  return (
    <div>
      {seasons.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="text-2xs font-bold uppercase tracking-widest text-ink-faint mr-1">Season</span>
          {['__all__', ...seasons].map((s) => (
            <button key={s} onClick={() => setSeason(s)}
              className={cn('text-xs px-2.5 py-1 rounded border transition-colors',
                season === s ? 'bg-accent text-white border-accent'
                             : 'bg-white text-ink-muted border-surface-3 hover:border-accent/40')}>
              {s === '__all__' ? 'All' : s}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white border border-surface-3 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-3 bg-surface-1">
              <Th className="w-28">Due</Th>
              {showSeverity && <Th className="w-24">Severity</Th>}
              <Th>Gate</Th>
              <Th className="w-44">Project</Th>
              <Th className="w-20">Season</Th>
              <Th className="w-28">Owner</Th>
              <Th className="w-24">Status</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((g) => {
              const late = g.daysRemaining !== null && g.daysRemaining < 0
              const sev = late ? overdueSeverity(g.daysRemaining!) : null
              return (
                <tr key={`${g.projectId}-${g.source}-${g.id}`}
                  className="border-b border-surface-3 last:border-0 hover:bg-surface-1/40 transition-colors">
                  <Td>
                    <span className={cn('text-xs whitespace-nowrap',
                      late ? 'text-red-600 font-medium' : (g.daysRemaining ?? 99) <= 2 ? 'text-amber-600' : 'text-ink')}>
                      {g.computedDueDate ? formatDate(g.computedDueDate) : '—'}
                    </span>
                    {g.daysRemaining !== null && (
                      <span className="block text-2xs text-ink-faint">
                        {late ? `${Math.abs(g.daysRemaining)}d late`
                              : g.daysRemaining === 0 ? 'today' : `in ${g.daysRemaining}d`}
                      </span>
                    )}
                  </Td>
                  {showSeverity && (
                    <Td>
                      {sev && (
                        <span className={cn('text-2xs px-1.5 py-0.5 rounded border', SEVERITY_META[sev].chip)}>
                          {SEVERITY_META[sev].label}
                        </span>
                      )}
                    </Td>
                  )}
                  <Td>
                    <span className="text-ink">{g.title}</span>
                    {g.leadTimeLabel && (
                      <span className="ml-1.5 text-2xs px-1 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
                        {g.leadTimeLabel} lead time
                      </span>
                    )}
                    <span className="block text-2xs text-ink-faint">
                      {g.source === 'checklist' ? 'Checklist gate' : 'Milestone'}
                    </span>
                  </Td>
                  <Td>
                    <Link
                      to={g.source === 'checklist'
                        ? `/${g.module}s/${g.projectId}/${g.module === 'shoot' ? 'checklist' : 'tasks'}`
                        : `/${g.module}s/${g.projectId}/timeline`}
                      className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                      {g.projectName} <ExternalLink size={10} />
                    </Link>
                  </Td>
                  <Td className="text-xs text-ink-muted">{g.season || '—'}</Td>
                  <Td className="text-xs text-ink-muted">{g.owner || <span className="text-amber-600">Unowned</span>}</Td>
                  <Td>
                    <span className={cn('text-2xs px-1.5 py-0.5 rounded border', GATE_STATUS_META[g.status].chip)}>
                      {GATE_STATUS_META[g.status].label}
                    </span>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Approvals ────────────────────────────────────────────────────────────────

function ApprovalTable({ rows }: { rows: ApprovalRow[] }) {
  const [mine, setMine] = useState(false)
  const [season, setSeason] = useState<string>('__all__')
  const seasons = seasonsPresent(rows)

  // "Approver's queue" — the decisions a Head of Marketing actually signs off:
  // anything with money attached, plus the explicitly commercial categories.
  const approverCategories = new Set(['Budget', 'Quote', 'Allocation'])
  const filtered = rows
    .filter((r) => (season === '__all__' ? true : r.season === season))
    .filter((r) => (mine ? approverCategories.has(r.category) || !!r.costImpact.trim() : true))

  if (rows.length === 0) {
    return <Empty title="Nothing waiting on an approval" body="Raise approvals from a project's Approvals page." />
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <button onClick={() => setMine((v) => !v)}
          className={cn('text-xs px-2.5 py-1 rounded border transition-colors',
            mine ? 'bg-accent text-white border-accent' : 'bg-white text-ink-muted border-surface-3 hover:border-accent/40')}
          title="Budget, quote and allocation decisions, plus anything with a cost impact">
          Head of Marketing queue
        </button>
        {seasons.length > 1 && (
          <>
            <span className="text-2xs font-bold uppercase tracking-widest text-ink-faint ml-2 mr-1">Season</span>
            {['__all__', ...seasons].map((s) => (
              <button key={s} onClick={() => setSeason(s)}
                className={cn('text-xs px-2.5 py-1 rounded border transition-colors',
                  season === s ? 'bg-accent text-white border-accent'
                               : 'bg-white text-ink-muted border-surface-3 hover:border-accent/40')}>
                {s === '__all__' ? 'All' : s}
              </button>
            ))}
          </>
        )}
      </div>

      {filtered.length === 0 ? (
        <Empty title="Nothing in this queue" body="Try clearing the filters." />
      ) : (
        <div className="bg-white border border-surface-3 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-1">
                <Th className="w-28">Needed by</Th>
                <Th>Decision</Th>
                <Th className="w-40">Project</Th>
                <Th className="w-20">Season</Th>
                <Th className="w-36">Recommendation</Th>
                <Th className="w-24">Cost impact</Th>
                <Th className="w-20">Status</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const late = a.daysRemaining !== null && a.daysRemaining < 0
                const meta = APPROVAL_STATUS_META[a.status] ?? APPROVAL_STATUS_META.open
                return (
                  <tr key={`${a.projectId}-${a.id}`}
                    className="border-b border-surface-3 last:border-0 hover:bg-surface-1/40 transition-colors">
                    <Td>
                      {a.neededBy ? (
                        <span className={cn('text-xs whitespace-nowrap inline-flex items-center gap-1',
                          late ? 'text-red-600 font-medium' : (a.daysRemaining ?? 99) <= 3 ? 'text-amber-600' : 'text-ink')}>
                          {late && <AlertTriangle size={10} />}
                          {formatDate(a.neededBy)}
                        </span>
                      ) : <span className="text-xs text-ink-faint">—</span>}
                    </Td>
                    <Td>
                      <span className="text-ink">{a.title}</span>
                      <span className="block text-2xs text-ink-faint">{a.category}</span>
                    </Td>
                    <Td>
                      <Link to={`/${a.module}s/${a.projectId}/approvals`}
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                        {a.projectName} <ExternalLink size={10} />
                      </Link>
                    </Td>
                    <Td className="text-xs text-ink-muted">{a.season || '—'}</Td>
                    <Td className="text-xs text-ink-muted">{a.recommendation || '—'}</Td>
                    <Td className="text-xs text-ink-muted">{a.costImpact || '—'}</Td>
                    <Td>
                      <span className={cn('text-2xs px-1.5 py-0.5 rounded border', meta.chip)}>{meta.label}</span>
                    </Td>
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

// ─── Bits ─────────────────────────────────────────────────────────────────────

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-surface-1 border border-dashed border-surface-3 rounded-lg p-10 text-center">
      <p className="text-sm text-ink-muted">{title}</p>
      <p className="text-xs text-ink-faint mt-1">{body}</p>
    </div>
  )
}

function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn('text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-3 py-2', className)}>
      {children}
    </th>
  )
}

function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn('px-3 py-2 align-top', className)}>{children}</td>
}

export { groupBySeason, UNASSIGNED_SEASON_LABEL }
