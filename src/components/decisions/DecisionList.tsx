/**
 * Approval list — raise something, get it signed off, see what it changed.
 *
 * The previous version gave everyone identical buttons, so it wasn't clear who
 * raises versus who approves, or what approving actually did. This version:
 *   - states the current user's standing and the role matrix up front
 *   - shows raised-by / decided-by attribution on every row
 *   - only offers Approve / Decline / Send back to actual approvers
 *   - previews the exact effects before an approval is committed
 *   - links money decisions to the budget lines they cover
 *
 * (File name kept as DecisionList so the persisted `decisions` slice and its
 * section keys are untouched.)
 */
import { useMemo, useState } from 'react'
import {
  Plus, Trash2, Check, RotateCcw, CircleDot, AlertTriangle, X, Zap, History,
  Undo2, Info, Wallet, ExternalLink, ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Approval, ApprovalOption, ApprovalTarget, TimelineMilestone, Task, BudgetItem } from '@/types/common'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { inputCls } from '@/components/ui/FormField'
import { generateId, formatDate, cn } from '@/lib/utils'
import { daysUntil } from '@/lib/scheduleEngine'
import { APPROVAL_STATUS_META, isResolved, previewApproval, type ApprovalEffect } from '@/lib/approvalEngine'
import { targetsFor, targetLabel, type ApprovalModule } from '@/lib/approvalTargets'
import {
  APPROVAL_CATEGORIES, ROLE_MATRIX, isMoneyCategory, parseCostImpact,
  type ApprovalAbility,
} from '@/lib/approvalRoles'

export const DECISION_CATEGORIES = APPROVAL_CATEGORIES

const BLANK = {
  title: '', category: 'Budget', recommendation: '', costImpact: '', neededBy: '', notes: '',
}

export default function DecisionList({
  decisions, onAdd, onUpdate, onRemove, onResolve, onSendBack, currentUserName,
  module, projectId, ability, gates = [], tasks = [], budgetItems = [],
}: {
  decisions: Approval[]
  onAdd: (data: Omit<Approval, 'id' | 'order' | 'createdAt'>) => void
  onUpdate: (id: string, patch: Partial<Approval>) => void
  onRemove: (id: string) => void
  onResolve?: (approval: Approval, status: 'approved' | 'declined' | 'changed') => void
  onSendBack?: (approval: Approval, note: string) => void
  currentUserName?: string
  module: ApprovalModule
  projectId: string
  ability: ApprovalAbility
  gates?: TimelineMilestone[]
  tasks?: Task[]
  budgetItems?: BudgetItem[]
}) {
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(BLANK)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showMatrix, setShowMatrix] = useState(false)

  const sorted = useMemo(() => [...decisions].sort((a, b) => {
    const aOpen = !isResolved(a.status), bOpen = !isResolved(b.status)
    if (aOpen !== bOpen) return aOpen ? -1 : 1
    if (aOpen) {
      if (a.neededBy && b.neededBy && a.neededBy !== b.neededBy) return a.neededBy < b.neededBy ? -1 : 1
      if (a.neededBy && !b.neededBy) return -1
      if (!a.neededBy && b.neededBy) return 1
    }
    return b.order - a.order
  }), [decisions])

  const visible = typeFilter === 'all' ? sorted : sorted.filter((d) => d.category === typeFilter)
  const typesPresent = [...new Set(sorted.map((d) => d.category))]

  // Counts + money at stake, by state.
  const stats = useMemo(() => {
    const s = { pending: 0, approved: 0, declined: 0, pendingCost: 0, approvedCost: 0 }
    for (const d of visible) {
      const cost = parseCostImpact(d.costImpact)
      if (!isResolved(d.status)) { s.pending++; s.pendingCost += cost }
      else if (d.status === 'declined') s.declined++
      else { s.approved++; s.approvedCost += cost }
    }
    return s
  }, [visible])

  const handleAdd = () => {
    if (!draft.title.trim()) return
    onAdd({
      title: draft.title.trim(),
      category: draft.category,
      options: [],
      recommendation: draft.recommendation.trim(),
      costImpact: draft.costImpact.trim(),
      neededBy: draft.neededBy,
      status: 'open',
      raisedBy: currentUserName || 'Unknown',
      decidedBy: '',
      decidedOn: '',
      outcome: '',
      notes: draft.notes.trim(),
      targets: [],
      linkedGateIds: [],
      linkedTaskIds: [],
      linkedBudgetItemIds: [],
      changeLog: [],
    })
    setDraft(BLANK)
    setShowForm(false)
  }

  return (
    <div>
      {/* ── Who can do what ─────────────────────────────────────────── */}
      <div className="mb-4 rounded border border-surface-3 bg-surface-1 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <ShieldCheck size={13} className="text-accent shrink-0" />
          <span className="text-xs text-ink">{ability.explanation}</span>
          <button onClick={() => setShowMatrix((v) => !v)}
            className="ml-auto text-2xs text-ink-muted hover:text-ink transition-colors">
            {showMatrix ? 'Hide' : 'Who can approve?'}
          </button>
        </div>
        {showMatrix && (
          <table className="mt-2 text-xs w-full max-w-sm">
            <thead>
              <tr className="text-2xs uppercase tracking-widest text-ink-faint">
                <th className="text-left font-bold py-1">Role</th>
                <th className="text-left font-bold py-1 w-16">Raise</th>
                <th className="text-left font-bold py-1 w-20">Approve</th>
              </tr>
            </thead>
            <tbody>
              {ROLE_MATRIX.map((r) => (
                <tr key={r.who} className="border-t border-surface-3">
                  <td className="py-1 text-ink">
                    {r.who}
                    {r.note && <span className="ml-1 text-2xs text-ink-faint">({r.note})</span>}
                  </td>
                  <td className="py-1">{r.raise ? <Check size={12} className="text-accent" /> : <span className="text-ink-faint">—</span>}</td>
                  <td className="py-1">{r.approve ? <Check size={12} className="text-accent" /> : <span className="text-ink-faint">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Counts + money at stake ─────────────────────────────────── */}
      {sorted.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <Stat label="Pending" value={stats.pending}
            sub={stats.pendingCost !== 0 ? `${money(stats.pendingCost)} at stake` : undefined} tone="amber" />
          <Stat label="Approved" value={stats.approved}
            sub={stats.approvedCost !== 0 ? `${money(stats.approvedCost)} committed` : undefined} tone="accent" />
          <Stat label="Declined" value={stats.declined} tone="muted" />
        </div>
      )}

      {/* ── Type filter ─────────────────────────────────────────────── */}
      {typesPresent.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-2xs font-bold uppercase tracking-widest text-ink-faint mr-1">Type</span>
          {['all', ...typesPresent].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={cn('text-xs px-2.5 py-1 rounded border transition-colors',
                typeFilter === t ? 'bg-accent text-white border-accent'
                                 : 'bg-white text-ink-muted border-surface-3 hover:border-accent/40')}>
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 && !showForm ? (
        <EmptyState
          icon={CircleDot}
          title={sorted.length === 0 ? 'No approvals raised' : 'None of this type'}
          description={
            sorted.length === 0
              ? 'Raise an approval when something needs sign-off — the options, what you recommend, what it costs and when you need an answer. Link the fields, gates and budget lines it unblocks and approving applies them for you.'
              : 'Try another type filter.'
          }
          action={ability.canRaise && sorted.length === 0 ? (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
              <Plus size={13} /> Raise approval
            </button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-2">
          {visible.map((d) => (
            <ApprovalRow
              key={d.id}
              approval={d}
              onUpdate={(patch) => onUpdate(d.id, patch)}
              onRemove={() => onRemove(d.id)}
              onResolve={onResolve}
              onSendBack={onSendBack}
              ability={ability}
              module={module}
              projectId={projectId}
              gates={gates}
              tasks={tasks}
              budgetItems={budgetItems}
            />
          ))}
        </div>
      )}

      {/* ── Raise form ──────────────────────────────────────────────── */}
      {showForm && ability.canRaise && (
        <div className="mt-3 p-3 border border-surface-3 rounded bg-surface-1 space-y-2">
          <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">Raise an approval</p>
          <input
            autoFocus type="text" placeholder="What needs deciding?"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            className={inputCls}
          />
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-0.5">
              <label className="text-2xs uppercase tracking-wide text-ink-faint block">Type</label>
              <select value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                className={inputCls}>
                {APPROVAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-0.5">
              <label className="text-2xs uppercase tracking-wide text-ink-faint block">Cost impact</label>
              <input type="text" placeholder="e.g. +$450" value={draft.costImpact}
                onChange={(e) => setDraft((d) => ({ ...d, costImpact: e.target.value }))}
                className={inputCls} />
            </div>
            <div className="space-y-0.5">
              <label className="text-2xs uppercase tracking-wide text-ink-faint block">Needed by</label>
              <input type="date" value={draft.neededBy}
                onChange={(e) => setDraft((d) => ({ ...d, neededBy: e.target.value }))}
                className={inputCls} />
            </div>
          </div>
          <div className="space-y-0.5">
            <label className="text-2xs uppercase tracking-wide text-ink-faint block">Your recommendation</label>
            <input type="text" placeholder="What you advise, so the approver can answer in one pass"
              value={draft.recommendation}
              onChange={(e) => setDraft((d) => ({ ...d, recommendation: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className={inputCls} />
          </div>
          <p className="text-2xs text-ink-faint">
            Add options, and link the fields / gates / budget lines it affects, after raising it.
          </p>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!draft.title.trim()}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded disabled:opacity-40 hover:bg-accent-dark transition-colors">
              Raise approval
            </button>
            <button onClick={() => { setShowForm(false); setDraft(BLANK) }}
              className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {visible.length > 0 && !showForm && ability.canRaise && (
        <button onClick={() => setShowForm(true)}
          className="mt-3 flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors px-1">
          <Plus size={13} /> Raise approval
        </button>
      )}
    </div>
  )
}

const money = (n: number) => `${n < 0 ? '−' : '+'}$${Math.abs(Math.round(n)).toLocaleString()}`

function Stat({ label, value, sub, tone }: {
  label: string; value: number; sub?: string; tone: 'amber' | 'accent' | 'muted'
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className={cn('text-sm font-semibold tabular-nums',
        tone === 'amber' ? 'text-amber-700' : tone === 'accent' ? 'text-accent' : 'text-ink-muted')}>
        {value}
      </span>
      <span className="text-2xs uppercase tracking-widest text-ink-faint">{label}</span>
      {sub && <span className="text-2xs text-ink-muted">· {sub}</span>}
    </span>
  )
}

// ─── One approval ─────────────────────────────────────────────────────────────

function ApprovalRow({
  approval, onUpdate, onRemove, onResolve, onSendBack,
  ability, module, projectId, gates, tasks, budgetItems,
}: {
  approval: Approval
  onUpdate: (patch: Partial<Approval>) => void
  onRemove: () => void
  onResolve?: (approval: Approval, status: 'approved' | 'declined' | 'changed') => void
  onSendBack?: (approval: Approval, note: string) => void
  ability: ApprovalAbility
  module: ApprovalModule
  projectId: string
  gates: TimelineMilestone[]
  tasks: Task[]
  budgetItems: BudgetItem[]
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [optionDraft, setOptionDraft] = useState('')
  const [showLog, setShowLog] = useState(false)
  const [confirming, setConfirming] = useState<null | 'approved' | 'declined'>(null)
  const [sendBackNote, setSendBackNote] = useState('')
  const [sendingBack, setSendingBack] = useState(false)

  const resolved = isResolved(approval.status)
  const days = approval.neededBy ? daysUntil(approval.neededBy) : null
  const overdue = !resolved && days !== null && days < 0
  const dueSoon = !resolved && days !== null && days >= 0 && days <= 3
  const meta = APPROVAL_STATUS_META[approval.status] ?? APPROVAL_STATUS_META.open

  const targets = approval.targets ?? []
  const linkedGateIds = approval.linkedGateIds ?? []
  const linkedTaskIds = approval.linkedTaskIds ?? []
  const linkedBudgetIds = approval.linkedBudgetItemIds ?? []
  const changeLog = approval.changeLog ?? []
  const autoCount = targets.length + linkedGateIds.length + linkedTaskIds.length + linkedBudgetIds.length
  const money = isMoneyCategory(approval.category)

  // Effects are read fresh at the moment the approver asks.
  const effects: ApprovalEffect[] = confirming === 'approved'
    ? previewApproval(module, projectId, approval)
    : []

  const canEditDetail = ability.canRaise && !resolved

  const toggleId = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

  const addOption = () => {
    if (!optionDraft.trim()) return
    const opt: ApprovalOption = { id: generateId(), label: optionDraft.trim(), costImpact: '' }
    onUpdate({ options: [...(approval.options ?? []), opt] })
    setOptionDraft('')
  }

  const addTarget = (field: string) => {
    if (!field || targets.some((t) => t.field === field)) return
    const next: ApprovalTarget = { id: generateId(), field, value: '' }
    onUpdate({ targets: [...targets, next] })
  }

  return (
    <>
      <div className={cn('border rounded bg-white',
        resolved ? 'border-surface-3 opacity-85' : overdue ? 'border-red-300' : 'border-surface-3')}>
        {/* Header row */}
        <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-1/40 transition-colors"
          onClick={() => setExpanded(!expanded)}>
          <span className={cn('text-2xs px-1.5 py-0.5 rounded border shrink-0', meta.chip)}>{meta.label}</span>
          {approval.needsInfo && !resolved && (
            <span className="text-2xs px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 shrink-0"
              title="Sent back to the person who raised it">
              Needs info
            </span>
          )}
          <span className="text-2xs text-ink-faint shrink-0 w-20 truncate">{approval.category}</span>
          <span className="flex-1 text-sm text-ink min-w-0 truncate">{approval.title}</span>

          {autoCount > 0 && !resolved && (
            <span className="flex items-center gap-1 text-2xs text-accent shrink-0"
              title={`${autoCount} automatic update${autoCount === 1 ? '' : 's'} on approval`}>
              <Zap size={10} />{autoCount}
            </span>
          )}
          {changeLog.length > 0 && (
            <span className="flex items-center gap-1 text-2xs text-ink-faint shrink-0" title="Changes applied">
              <History size={10} />{changeLog.length}
            </span>
          )}
          {approval.costImpact && <span className="text-2xs text-ink-muted shrink-0">{approval.costImpact}</span>}
          {approval.neededBy && !resolved && (
            <span className={cn('flex items-center gap-1 text-2xs shrink-0',
              overdue ? 'text-red-500 font-medium' : dueSoon ? 'text-amber-600' : 'text-ink-faint')}>
              {overdue && <AlertTriangle size={10} />} by {formatDate(approval.neededBy)}
            </span>
          )}
        </div>

        {/* Attribution strip — always visible, no expanding needed */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 px-3 pb-2 text-2xs text-ink-faint">
          <span>
            Raised by <span className="text-ink-muted">{approval.raisedBy || 'Unknown'}</span>
            {approval.createdAt && ` · ${formatDate(approval.createdAt.slice(0, 10))}`}
          </span>
          {resolved && (
            <span>
              {approval.status === 'declined' ? 'Declined' : 'Approved'} by{' '}
              <span className="text-ink-muted">{approval.decidedBy || 'Unknown'}</span>
              {approval.decidedOn && ` · ${formatDate(approval.decidedOn)}`}
            </span>
          )}
          {approval.outcome && <span>Outcome: <span className="text-ink-muted">{approval.outcome}</span></span>}
        </div>

        {expanded && (
          <div className="border-t border-surface-3 px-3 pb-3 pt-2.5 space-y-3">
            {/* Options */}
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wide text-ink-faint block">Options</label>
              {(approval.options ?? []).length === 0 && <p className="text-xs text-ink-faint italic">No options listed.</p>}
              {(approval.options ?? []).map((o) => (
                <div key={o.id} className="flex items-center gap-2">
                  <span className="text-ink-faint text-xs">·</span>
                  <input type="text" value={o.label} readOnly={!canEditDetail}
                    onChange={(e) => onUpdate({ options: approval.options.map((x) => x.id === o.id ? { ...x, label: e.target.value } : x) })}
                    className="flex-1 text-xs bg-transparent border-b border-transparent hover:border-surface-3 focus:border-accent focus:outline-none py-0 text-ink" />
                  <input type="text" value={o.costImpact} readOnly={!canEditDetail} placeholder="cost"
                    onChange={(e) => onUpdate({ options: approval.options.map((x) => x.id === o.id ? { ...x, costImpact: e.target.value } : x) })}
                    className="w-24 text-xs bg-transparent border-b border-transparent hover:border-surface-3 focus:border-accent focus:outline-none py-0 text-ink-muted" />
                  {canEditDetail && (
                    <button onClick={() => onUpdate({ options: approval.options.filter((x) => x.id !== o.id) })}
                      className="p-0.5 text-ink-faint hover:text-red-400 transition-colors"><Trash2 size={10} /></button>
                  )}
                </div>
              ))}
              {canEditDetail && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-ink-faint text-xs">·</span>
                  <input type="text" placeholder="Add option…" value={optionDraft}
                    onChange={(e) => setOptionDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addOption()}
                    className="flex-1 text-xs bg-transparent border-b border-surface-3 focus:border-accent focus:outline-none py-0 text-ink placeholder:text-ink-faint" />
                  <button onClick={addOption} className="p-0.5 text-ink-faint hover:text-accent transition-colors"><Plus size={10} /></button>
                </div>
              )}
            </div>

            {/* What approval will do */}
            <div className="space-y-1 border-t border-surface-3 pt-2.5">
              <label className="flex items-center gap-1 text-2xs uppercase tracking-wide text-ink-faint">
                <Zap size={10} /> On approval — update these fields
              </label>
              {targets.length === 0 && (
                <p className="text-xs text-ink-faint italic">Nothing linked — approving only records the outcome.</p>
              )}
              {targets.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <span className="text-2xs text-ink-muted w-40 shrink-0 truncate">{targetLabel(module, t.field)}</span>
                  <input type="text" value={t.value} readOnly={!canEditDetail}
                    onChange={(e) => onUpdate({ targets: targets.map((x) => x.id === t.id ? { ...x, value: e.target.value } : x) })}
                    placeholder="Value to set on approval"
                    className="flex-1 text-xs bg-transparent border-b border-surface-3 focus:border-accent focus:outline-none py-0.5 text-ink placeholder:text-ink-faint" />
                  {canEditDetail && (
                    <button onClick={() => onUpdate({ targets: targets.filter((x) => x.id !== t.id) })}
                      className="p-0.5 text-ink-faint hover:text-red-400 transition-colors"><X size={10} /></button>
                  )}
                </div>
              ))}
              {canEditDetail && (
                <select value="" onChange={(e) => addTarget(e.target.value)}
                  className="mt-1 text-xs border border-surface-3 rounded px-2 py-1 bg-white text-ink-muted focus:outline-none focus:border-accent">
                  <option value="">+ Link a field…</option>
                  {targetsFor(module).filter((d) => !targets.some((t) => t.field === d.key))
                    .map((d) => <option key={d.key} value={d.key}>{d.label}{d.hint ? ` — ${d.hint}` : ''}</option>)}
                </select>
              )}
            </div>

            {/* Budget lines — money decisions only */}
            {money && budgetItems.length > 0 && (
              <div className="space-y-1 border-t border-surface-3 pt-2.5">
                <label className="flex items-center gap-1 text-2xs uppercase tracking-wide text-ink-faint">
                  <Wallet size={10} /> Budget lines this covers — marked approved on sign-off
                </label>
                <div className="max-h-32 overflow-y-auto space-y-0.5 pr-1">
                  {budgetItems.map((b) => (
                    <label key={b.id} className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
                      <input type="checkbox" checked={linkedBudgetIds.includes(b.id)} disabled={!canEditDetail}
                        onChange={() => onUpdate({ linkedBudgetItemIds: toggleId(linkedBudgetIds, b.id) })} />
                      <span className="truncate flex-1">{b.description || 'Untitled line'}</span>
                      <span className="text-2xs text-ink-faint shrink-0">
                        ${(b.estimatedCost || 0).toLocaleString()} · {b.status}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Gates + tasks */}
            {(gates.length > 0 || tasks.length > 0) && (
              <div className="grid grid-cols-2 gap-3 border-t border-surface-3 pt-2.5">
                {gates.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-2xs uppercase tracking-wide text-ink-faint block">Gates cleared</label>
                    <div className="max-h-28 overflow-y-auto space-y-0.5 pr-1">
                      {gates.map((g) => (
                        <label key={g.id} className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
                          <input type="checkbox" checked={linkedGateIds.includes(g.id)} disabled={!canEditDetail}
                            onChange={() => onUpdate({ linkedGateIds: toggleId(linkedGateIds, g.id) })} />
                          <span className={cn('truncate', g.completed && 'line-through text-ink-faint')}>{g.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {tasks.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-2xs uppercase tracking-wide text-ink-faint block">Tasks released</label>
                    <div className="max-h-28 overflow-y-auto space-y-0.5 pr-1">
                      {tasks.map((t) => (
                        <label key={t.id} className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
                          <input type="checkbox" checked={linkedTaskIds.includes(t.id)} disabled={!canEditDetail}
                            onChange={() => onUpdate({ linkedTaskIds: toggleId(linkedTaskIds, t.id) })} />
                          <span className="truncate">{t.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Detail fields */}
            <div className="grid grid-cols-2 gap-2 border-t border-surface-3 pt-2.5">
              <Field label="Recommendation" value={approval.recommendation} readOnly={!canEditDetail}
                onChange={(v) => onUpdate({ recommendation: v })} placeholder="What you advise" />
              <Field label="Cost impact" value={approval.costImpact} readOnly={!canEditDetail}
                onChange={(v) => onUpdate({ costImpact: v })} placeholder="e.g. +$450" />
              <Field label="Needed by" value={approval.neededBy} readOnly={!canEditDetail} type="date"
                onChange={(v) => onUpdate({ neededBy: v })} />
              <Field label="Outcome" value={approval.outcome} readOnly={resolved && !ability.canApprove}
                onChange={(v) => onUpdate({ outcome: v })} placeholder="What was decided" />
            </div>

            {/* Where it lands */}
            <div className="flex flex-wrap items-center gap-2 border-t border-surface-3 pt-2.5">
              <span className="text-2xs uppercase tracking-wide text-ink-faint">Affects</span>
              {money && (
                <Link to={`/${module}s/${projectId}/budget`}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-surface-3 text-ink-secondary hover:bg-surface-1 transition-colors">
                  <Wallet size={11} /> View affected budget
                </Link>
              )}
              <Link to={`/${module}s/${projectId}/dashboard`}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-surface-3 text-ink-secondary hover:bg-surface-1 transition-colors">
                <ExternalLink size={11} /> View affected project
              </Link>
              {module === 'shoot' && (
                <Link to={`/shoots/${projectId}/overview`}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-surface-3 text-ink-secondary hover:bg-surface-1 transition-colors">
                  <ExternalLink size={11} /> View share links
                </Link>
              )}
              {money && (
                <Link to="/reporting/budget"
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-surface-3 text-ink-secondary hover:bg-surface-1 transition-colors">
                  Season rollup
                </Link>
              )}
            </div>

            {/* Change log */}
            {changeLog.length > 0 && (
              <div className="border-t border-surface-3 pt-2">
                <button onClick={() => setShowLog((v) => !v)}
                  className="flex items-center gap-1 text-2xs uppercase tracking-wide text-ink-faint hover:text-ink transition-colors">
                  <History size={10} /> {changeLog.length} change{changeLog.length === 1 ? '' : 's'} logged
                  <span>{showLog ? '▾' : '▸'}</span>
                </button>
                {showLog && (
                  <div className="mt-1.5 space-y-1">
                    {changeLog.map((c) => (
                      <div key={c.id} className="text-2xs text-ink-muted flex flex-wrap gap-x-2">
                        <span className="font-medium text-ink">{c.label}</span>
                        <span className="text-ink-faint line-through">{c.oldValue || '—'}</span>
                        <span>→</span>
                        <span className="text-accent">{c.newValue || '—'}</span>
                        <span className="text-ink-faint">· {c.by} · {formatDate(c.at.slice(0, 10))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Actions ────────────────────────────────────────────── */}
            <div className="border-t border-surface-3 pt-2 space-y-2">
              {!resolved && ability.canApprove && !confirming && !sendingBack && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button onClick={() => setConfirming('approved')}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-accent text-white rounded hover:bg-accent-dark transition-colors">
                    <Check size={12} /> Approve{autoCount > 0 && <span className="opacity-80">· applies {autoCount}</span>}
                  </button>
                  <button onClick={() => setConfirming('declined')}
                    className="px-2.5 py-1 text-xs border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">
                    Decline
                  </button>
                  <button onClick={() => setSendingBack(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
                    title="Return to the person who raised it, without deciding">
                    <Undo2 size={11} /> Send back
                  </button>
                </div>
              )}

              {!resolved && !ability.canApprove && (
                <p className="flex items-start gap-1.5 text-2xs text-ink-faint">
                  <Info size={11} className="shrink-0 mt-0.5" />
                  Waiting on sign-off from the Head of Marketing or an admin.
                </p>
              )}

              {/* Approve / decline confirmation with the effect preview */}
              {confirming && (
                <div className={cn('rounded border px-2.5 py-2 space-y-2',
                  confirming === 'approved' ? 'border-accent/40 bg-accent/5' : 'border-surface-3 bg-surface-1')}>
                  {confirming === 'approved' ? (
                    <>
                      <p className="text-xs font-medium text-ink">Approving this will:</p>
                      {effects.length === 0 ? (
                        <p className="text-xs text-ink-muted">
                          Record the outcome only — nothing is linked, so no fields change.
                        </p>
                      ) : (
                        <ul className="space-y-0.5">
                          {effects.map((e, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-ink">
                              <Check size={11} className="shrink-0 mt-0.5 text-accent" />{e.text}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="text-2xs text-ink-faint">Recorded against your name with old and new values.</p>
                    </>
                  ) : (
                    <p className="text-xs text-ink">
                      Decline this? The outcome is recorded and the person who raised it is notified.
                      No fields change.
                    </p>
                  )}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { onResolve?.(approval, confirming); setConfirming(null) }}
                      className={cn('px-2.5 py-1 text-xs rounded text-white transition-colors',
                        confirming === 'approved' ? 'bg-accent hover:bg-accent-dark' : 'bg-red-500 hover:bg-red-600')}>
                      {confirming === 'approved' ? 'Confirm approval' : 'Confirm decline'}
                    </button>
                    <button onClick={() => setConfirming(null)}
                      className="px-2.5 py-1 text-xs border border-surface-3 rounded text-ink-secondary hover:bg-white transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Send back */}
              {sendingBack && (
                <div className="rounded border border-surface-3 bg-surface-1 px-2.5 py-2 space-y-2">
                  <p className="text-xs font-medium text-ink">What else do you need?</p>
                  <input
                    autoFocus type="text" value={sendBackNote}
                    onChange={(e) => setSendBackNote(e.target.value)}
                    placeholder="e.g. need a second quote before I can sign this off"
                    className={inputCls}
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { onSendBack?.(approval, sendBackNote); setSendBackNote(''); setSendingBack(false) }}
                      className="px-2.5 py-1 text-xs bg-ink text-white rounded hover:opacity-90 transition-opacity">
                      Send back
                    </button>
                    <button onClick={() => { setSendingBack(false); setSendBackNote('') }}
                      className="px-2.5 py-1 text-xs border border-surface-3 rounded text-ink-secondary hover:bg-white transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {resolved && ability.canApprove && (
                <button onClick={() => onUpdate({ status: 'open', decidedBy: '', decidedOn: '' })}
                  className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors">
                  <RotateCcw size={11} /> Reopen
                </button>
              )}

              {ability.canRaise && (
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={11} /> Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog open={confirmDelete} title="Delete approval"
        message={`Delete "${approval.title}"? Its decision log goes with it.`}
        onConfirm={() => { onRemove(); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)} />
    </>
  )
}

function Field({
  label, value, onChange, readOnly, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void
  readOnly?: boolean; placeholder?: string; type?: string
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-2xs uppercase tracking-wide text-ink-faint block">{label}</label>
      <input type={type} value={value} readOnly={readOnly} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </div>
  )
}
