/**
 * Approval list — the alternative to "approval by message".
 *
 * Each approval carries its options, a stated recommendation, the cost impact and a
 * needed-by date, so the approver can answer in one pass. It also carries what should
 * happen WHEN it's approved: which project fields to write, which gates to clear and
 * which tasks to release. Approving runs those updates through the approval engine and
 * records old → new for each, so the plan updates itself and stays auditable.
 *
 * Shared by the shoot and event approval pages and by the cross-project queue.
 * (File/component name kept as DecisionList so the persisted `decisions` slice and its
 * section keys are untouched.)
 */
import { useState } from 'react'
import { Plus, Trash2, Check, RotateCcw, CircleDot, AlertTriangle, X, Zap, History } from 'lucide-react'
import type { Approval, ApprovalOption, ApprovalTarget, TimelineMilestone, Task } from '@/types/common'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { inputCls } from '@/components/ui/FormField'
import { generateId, formatDate } from '@/lib/utils'
import { daysUntil } from '@/lib/scheduleEngine'
import { APPROVAL_STATUS_META, isResolved } from '@/lib/approvalEngine'
import { targetsFor, targetLabel, type ApprovalModule } from '@/lib/approvalTargets'

export const DECISION_CATEGORIES = [
  'Budget', 'Quote', 'Allocation', 'Photographer', 'Crew', 'Model', 'Location', 'Creative', 'Other',
]

const BLANK = {
  title: '', category: 'Budget', recommendation: '', costImpact: '', neededBy: '', notes: '',
}

export default function DecisionList({
  decisions, onAdd, onUpdate, onRemove, onResolve, readOnly, currentUserName,
  module, gates = [], tasks = [],
}: {
  decisions: Approval[]
  onAdd: (data: Omit<Approval, 'id' | 'order' | 'createdAt'>) => void
  onUpdate: (id: string, patch: Partial<Approval>) => void
  onRemove: (id: string) => void
  /** Resolve an approval — runs the engine (writes fields, clears gates, notifies). */
  onResolve?: (approval: Approval, status: 'approved' | 'declined' | 'changed') => void
  readOnly?: boolean
  /** Stamped into decidedBy when someone resolves. */
  currentUserName?: string
  module: ApprovalModule
  /** Gates that can be linked (cleared on approval). */
  gates?: TimelineMilestone[]
  /** Tasks that can be linked (released on approval). */
  tasks?: Task[]
}) {
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(BLANK)

  // Open first (soonest needed-by), then resolved.
  const sorted = [...decisions].sort((a, b) => {
    const aOpen = a.status === 'open', bOpen = b.status === 'open'
    if (aOpen !== bOpen) return aOpen ? -1 : 1
    if (a.status === 'open') {
      if (a.neededBy && b.neededBy && a.neededBy !== b.neededBy) return a.neededBy < b.neededBy ? -1 : 1
      if (a.neededBy && !b.neededBy) return -1
      if (!a.neededBy && b.neededBy) return 1
    }
    return b.order - a.order
  })

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
      decidedBy: '',
      decidedOn: '',
      outcome: '',
      notes: draft.notes.trim(),
      targets: [],
      linkedGateIds: [],
      linkedTaskIds: [],
      changeLog: [],
    })
    setDraft(BLANK)
    setShowForm(false)
  }

  return (
    <div>
      {sorted.length === 0 && !showForm ? (
        <EmptyState
          icon={CircleDot}
          title="No approvals raised"
          description="Raise an approval when something needs sign-off — options, your recommendation, cost impact and when you need an answer. Link the fields and gates it unblocks and they update themselves on approval."
          action={readOnly ? undefined : (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
              <Plus size={13} /> Raise approval
            </button>
          )}
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((d) => (
            <DecisionRow
              key={d.id}
              decision={d}
              onUpdate={(patch) => onUpdate(d.id, patch)}
              onRemove={() => onRemove(d.id)}
              onResolve={onResolve}
              readOnly={readOnly}
              currentUserName={currentUserName}
              module={module}
              gates={gates}
              tasks={tasks}
            />
          ))}
        </div>
      )}

      {showForm && !readOnly && (
        <div className="mt-3 p-3 border border-surface-3 rounded bg-surface-1 space-y-2">
          <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">New Approval</p>
          <input
            autoFocus type="text" placeholder="What needs deciding?"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            className={inputCls}
          />
          <div className="grid grid-cols-3 gap-2">
            <select value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              className={inputCls}>
              {DECISION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="text" placeholder="Cost impact" value={draft.costImpact}
              onChange={(e) => setDraft((d) => ({ ...d, costImpact: e.target.value }))}
              className={inputCls} />
            <div className="space-y-0.5">
              <input type="date" value={draft.neededBy}
                onChange={(e) => setDraft((d) => ({ ...d, neededBy: e.target.value }))}
                className={inputCls} title="Needed by" />
            </div>
          </div>
          <input type="text" placeholder="Your recommendation" value={draft.recommendation}
            onChange={(e) => setDraft((d) => ({ ...d, recommendation: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className={inputCls} />
          <div className="flex gap-2">
            <button onClick={handleAdd}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
              Raise approval
            </button>
            <button onClick={() => { setShowForm(false); setDraft(BLANK) }}
              className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {sorted.length > 0 && !showForm && !readOnly && (
        <button onClick={() => setShowForm(true)}
          className="mt-3 flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors px-1">
          <Plus size={13} /> Raise approval
        </button>
      )}
    </div>
  )
}

// ─── One approval ─────────────────────────────────────────────────────────────

function DecisionRow({
  decision, onUpdate, onRemove, onResolve, readOnly, currentUserName, module, gates, tasks,
}: {
  decision: Approval
  onUpdate: (patch: Partial<Approval>) => void
  onRemove: () => void
  onResolve?: (approval: Approval, status: 'approved' | 'declined' | 'changed') => void
  readOnly?: boolean
  currentUserName?: string
  module: ApprovalModule
  gates: TimelineMilestone[]
  tasks: Task[]
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [optionDraft, setOptionDraft] = useState('')
  const [showLog, setShowLog] = useState(false)

  const resolved = isResolved(decision.status)
  const days = decision.neededBy ? daysUntil(decision.neededBy) : null
  const overdue = !resolved && days !== null && days < 0
  const dueSoon = !resolved && days !== null && days >= 0 && days <= 3
  const meta = APPROVAL_STATUS_META[decision.status] ?? APPROVAL_STATUS_META.open

  const targets = decision.targets ?? []
  const linkedGateIds = decision.linkedGateIds ?? []
  const linkedTaskIds = decision.linkedTaskIds ?? []
  const changeLog = decision.changeLog ?? []
  const autoCount = targets.length + linkedGateIds.length + linkedTaskIds.length

  // Fallback for pages that don't wire the engine (e.g. read-only surfaces).
  const resolve = (status: 'approved' | 'declined' | 'changed') => {
    if (onResolve) return onResolve(decision, status)
    onUpdate({
      status,
      decidedBy: currentUserName || 'Unknown',
      decidedOn: new Date().toISOString().slice(0, 10),
      outcome: decision.outcome || decision.recommendation,
    })
  }
  const reopen = () => onUpdate({ status: 'open', decidedBy: '', decidedOn: '' })

  const addOption = () => {
    if (!optionDraft.trim()) return
    const opt: ApprovalOption = { id: generateId(), label: optionDraft.trim(), costImpact: '' }
    onUpdate({ options: [...(decision.options ?? []), opt] })
    setOptionDraft('')
  }

  const addTarget = (field: string) => {
    if (!field || targets.some((t) => t.field === field)) return
    const next: ApprovalTarget = { id: generateId(), field, value: '' }
    onUpdate({ targets: [...targets, next] })
  }
  const setTargetValue = (tid: string, value: string) =>
    onUpdate({ targets: targets.map((t) => (t.id === tid ? { ...t, value } : t)) })
  const removeTarget = (tid: string) => onUpdate({ targets: targets.filter((t) => t.id !== tid) })

  const toggleId = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

  return (
    <>
      <div className={`border rounded bg-white ${resolved ? 'border-surface-3 opacity-80' : overdue ? 'border-red-300' : 'border-surface-3'}`}>
        <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-1/40 transition-colors"
          onClick={() => setExpanded(!expanded)}>
          <span className={`text-2xs px-1.5 py-0.5 rounded border shrink-0 ${meta.chip}`}>{meta.label}</span>
          <span className="text-2xs text-ink-faint shrink-0 w-20 truncate">{decision.category}</span>
          <span className="flex-1 text-sm text-ink min-w-0 truncate">{decision.title}</span>

          {/* How much this approval will do automatically */}
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

          {decision.costImpact && <span className="text-2xs text-ink-muted shrink-0">{decision.costImpact}</span>}
          {decision.neededBy && !resolved && (
            <span className={`flex items-center gap-1 text-2xs shrink-0 ${
              overdue ? 'text-red-500 font-medium' : dueSoon ? 'text-amber-600' : 'text-ink-faint'
            }`}>
              {overdue && <AlertTriangle size={10} />}
              by {formatDate(decision.neededBy)}
            </span>
          )}
          {resolved && decision.decidedOn && (
            <span className="text-2xs text-ink-faint shrink-0">{decision.decidedBy} · {formatDate(decision.decidedOn)}</span>
          )}
        </div>

        {expanded && (
          <div className="border-t border-surface-3 px-3 pb-3 pt-2.5 space-y-3">
            {/* Options */}
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wide text-ink-faint block">Options</label>
              {(decision.options ?? []).length === 0 && <p className="text-xs text-ink-faint italic">No options listed.</p>}
              {(decision.options ?? []).map((o) => (
                <div key={o.id} className="flex items-center gap-2">
                  <span className="text-ink-faint text-xs">·</span>
                  <input type="text" value={o.label} readOnly={readOnly}
                    onChange={(e) => onUpdate({ options: decision.options.map((x) => x.id === o.id ? { ...x, label: e.target.value } : x) })}
                    className="flex-1 text-xs bg-transparent border-b border-transparent hover:border-surface-3 focus:border-accent focus:outline-none py-0 text-ink" />
                  <input type="text" value={o.costImpact} readOnly={readOnly} placeholder="cost"
                    onChange={(e) => onUpdate({ options: decision.options.map((x) => x.id === o.id ? { ...x, costImpact: e.target.value } : x) })}
                    className="w-24 text-xs bg-transparent border-b border-transparent hover:border-surface-3 focus:border-accent focus:outline-none py-0 text-ink-muted" />
                  {!readOnly && (
                    <button onClick={() => onUpdate({ options: decision.options.filter((x) => x.id !== o.id) })}
                      className="p-0.5 text-ink-faint hover:text-red-400 transition-colors"><Trash2 size={10} /></button>
                  )}
                </div>
              ))}
              {!readOnly && (
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

            {/* ── On approval: fields written automatically ─────────────── */}
            <div className="space-y-1 border-t border-surface-3 pt-2.5">
              <label className="flex items-center gap-1 text-2xs uppercase tracking-wide text-ink-faint">
                <Zap size={10} /> On approval — update these fields
              </label>
              {targets.length === 0 && (
                <p className="text-xs text-ink-faint italic">Nothing linked — approving will only record the outcome.</p>
              )}
              {targets.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <span className="text-2xs text-ink-muted w-40 shrink-0 truncate" title={targetLabel(module, t.field)}>
                    {targetLabel(module, t.field)}
                  </span>
                  <input type="text" value={t.value} readOnly={readOnly || resolved}
                    onChange={(e) => setTargetValue(t.id, e.target.value)}
                    placeholder="Value to set on approval"
                    className="flex-1 text-xs bg-transparent border-b border-surface-3 focus:border-accent focus:outline-none py-0.5 text-ink placeholder:text-ink-faint" />
                  {!readOnly && !resolved && (
                    <button onClick={() => removeTarget(t.id)}
                      className="p-0.5 text-ink-faint hover:text-red-400 transition-colors"><X size={10} /></button>
                  )}
                </div>
              ))}
              {!readOnly && !resolved && (
                <select value="" onChange={(e) => addTarget(e.target.value)}
                  className="mt-1 text-xs border border-surface-3 rounded px-2 py-1 bg-white text-ink-muted focus:outline-none focus:border-accent">
                  <option value="">+ Link a field…</option>
                  {targetsFor(module)
                    .filter((d) => !targets.some((t) => t.field === d.key))
                    .map((d) => <option key={d.key} value={d.key}>{d.label}{d.hint ? ` — ${d.hint}` : ''}</option>)}
                </select>
              )}
            </div>

            {/* ── Gates cleared + tasks released ───────────────────────── */}
            {(gates.length > 0 || tasks.length > 0) && (
              <div className="grid grid-cols-2 gap-3 border-t border-surface-3 pt-2.5">
                {gates.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-2xs uppercase tracking-wide text-ink-faint block">Gates cleared on approval</label>
                    <div className="max-h-28 overflow-y-auto space-y-0.5 pr-1">
                      {gates.map((g) => (
                        <label key={g.id} className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
                          <input type="checkbox" checked={linkedGateIds.includes(g.id)} disabled={readOnly || resolved}
                            onChange={() => onUpdate({ linkedGateIds: toggleId(linkedGateIds, g.id) })} />
                          <span className={`truncate ${g.completed ? 'line-through text-ink-faint' : ''}`}>{g.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {tasks.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-2xs uppercase tracking-wide text-ink-faint block">Tasks released on approval</label>
                    <div className="max-h-28 overflow-y-auto space-y-0.5 pr-1">
                      {tasks.map((t) => (
                        <label key={t.id} className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
                          <input type="checkbox" checked={linkedTaskIds.includes(t.id)} disabled={readOnly || resolved}
                            onChange={() => {
                              const next = toggleId(linkedTaskIds, t.id)
                              onUpdate({ linkedTaskIds: next })
                            }} />
                          <span className="truncate">{t.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 border-t border-surface-3 pt-2.5">
              <div className="space-y-0.5">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Recommendation</label>
                <input type="text" value={decision.recommendation} readOnly={readOnly}
                  onChange={(e) => onUpdate({ recommendation: e.target.value })}
                  placeholder="What you advise" className={inputCls} />
              </div>
              <div className="space-y-0.5">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Cost impact</label>
                <input type="text" value={decision.costImpact} readOnly={readOnly}
                  onChange={(e) => onUpdate({ costImpact: e.target.value })}
                  placeholder="e.g. +$450" className={inputCls} />
              </div>
              <div className="space-y-0.5">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Needed by</label>
                <input type="date" value={decision.neededBy} readOnly={readOnly}
                  onChange={(e) => onUpdate({ neededBy: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-0.5">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Outcome</label>
                <input type="text" value={decision.outcome} readOnly={readOnly}
                  onChange={(e) => onUpdate({ outcome: e.target.value })}
                  placeholder="What was decided" className={inputCls} />
              </div>
            </div>

            <div className="space-y-0.5">
              <label className="text-2xs uppercase tracking-wide text-ink-faint block">Notes</label>
              <textarea value={decision.notes} readOnly={readOnly} rows={2}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                className={`${inputCls} resize-none`} />
            </div>

            {/* ── Change log ───────────────────────────────────────────── */}
            {changeLog.length > 0 && (
              <div className="border-t border-surface-3 pt-2">
                <button onClick={() => setShowLog((v) => !v)}
                  className="flex items-center gap-1 text-2xs uppercase tracking-wide text-ink-faint hover:text-ink transition-colors">
                  <History size={10} /> {changeLog.length} change{changeLog.length === 1 ? '' : 's'} applied
                  <span className="text-ink-faint">{showLog ? '▾' : '▸'}</span>
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

            {!readOnly && (
              <div className="flex items-center justify-between pt-1 border-t border-surface-3">
                {resolved ? (
                  <button onClick={reopen}
                    className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors">
                    <RotateCcw size={11} /> Reopen
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => resolve('approved')}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-accent text-white rounded hover:bg-accent-dark transition-colors">
                      <Check size={12} /> Approve
                      {autoCount > 0 && <span className="opacity-80">· applies {autoCount}</span>}
                    </button>
                    <button onClick={() => resolve('declined')}
                      className="px-2.5 py-1 text-xs border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">
                      Decline
                    </button>
                    <button onClick={() => resolve('changed')}
                      className="px-2.5 py-1 text-xs border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
                      title="Approved with changes — fields are left as they are">
                      Changed
                    </button>
                  </div>
                )}
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog open={confirmDelete} title="Delete approval"
        message={`Delete "${decision.title}"?`}
        onConfirm={() => { onRemove(); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)} />
    </>
  )
}
