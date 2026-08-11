/**
 * DecisionList — the alternative to "approval by message".
 *
 * Each decision carries its options, a stated recommendation, the cost impact and a
 * needed-by date, so an approver can answer in one pass. Deciding stamps who and when,
 * which turns the same list into a decision log. Shared by the shoot and event decision
 * pages and by the cross-project queue.
 */
import { useState } from 'react'
import { Plus, Trash2, Check, RotateCcw, CircleDot, AlertTriangle } from 'lucide-react'
import type { Decision, DecisionOption } from '@/types/common'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { inputCls } from '@/components/ui/FormField'
import { generateId, formatDate } from '@/lib/utils'
import { daysUntil } from '@/lib/scheduleEngine'

export const DECISION_CATEGORIES = [
  'Budget', 'Quote', 'Allocation', 'Photographer', 'Crew', 'Model', 'Location', 'Creative', 'Other',
]

const BLANK = {
  title: '', category: 'Budget', recommendation: '', costImpact: '', neededBy: '', notes: '',
}

export default function DecisionList({
  decisions, onAdd, onUpdate, onRemove, readOnly, currentUserName,
}: {
  decisions: Decision[]
  onAdd: (data: Omit<Decision, 'id' | 'order' | 'createdAt'>) => void
  onUpdate: (id: string, patch: Partial<Decision>) => void
  onRemove: (id: string) => void
  readOnly?: boolean
  /** Stamped into decidedBy when someone decides. */
  currentUserName?: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(BLANK)

  // Open first (soonest needed-by), then decided.
  const sorted = [...decisions].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1
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
    })
    setDraft(BLANK)
    setShowForm(false)
  }

  return (
    <div>
      {sorted.length === 0 && !showForm ? (
        <EmptyState
          icon={CircleDot}
          title="No decisions raised"
          description="Raise a decision when something needs sign-off — options, your recommendation, cost impact and when you need an answer."
          action={readOnly ? undefined : (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
              <Plus size={13} /> Raise decision
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
              readOnly={readOnly}
              currentUserName={currentUserName}
            />
          ))}
        </div>
      )}

      {showForm && !readOnly && (
        <div className="mt-3 p-3 border border-surface-3 rounded bg-surface-1 space-y-2">
          <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">New Decision</p>
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
              Raise decision
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
          <Plus size={13} /> Raise decision
        </button>
      )}
    </div>
  )
}

// ─── One decision ─────────────────────────────────────────────────────────────

function DecisionRow({
  decision, onUpdate, onRemove, readOnly, currentUserName,
}: {
  decision: Decision
  onUpdate: (patch: Partial<Decision>) => void
  onRemove: () => void
  readOnly?: boolean
  currentUserName?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [optionDraft, setOptionDraft] = useState('')

  const isDecided = decision.status === 'decided'
  const days = decision.neededBy ? daysUntil(decision.neededBy) : null
  const overdue = !isDecided && days !== null && days < 0
  const dueSoon = !isDecided && days !== null && days >= 0 && days <= 3

  const decide = () => onUpdate({
    status: 'decided',
    decidedBy: currentUserName || 'Unknown',
    decidedOn: new Date().toISOString().slice(0, 10),
    outcome: decision.outcome || decision.recommendation,
  })
  const reopen = () => onUpdate({ status: 'open', decidedBy: '', decidedOn: '' })

  const addOption = () => {
    if (!optionDraft.trim()) return
    const opt: DecisionOption = { id: generateId(), label: optionDraft.trim(), costImpact: '' }
    onUpdate({ options: [...(decision.options ?? []), opt] })
    setOptionDraft('')
  }

  return (
    <>
      <div className={`border rounded bg-white ${isDecided ? 'border-surface-3 opacity-75' : overdue ? 'border-red-300' : 'border-surface-3'}`}>
        <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-1/40 transition-colors"
          onClick={() => setExpanded(!expanded)}>
          <span className={`text-2xs px-1.5 py-0.5 rounded border shrink-0 ${
            isDecided ? 'bg-accent/10 text-accent border-accent/30' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {isDecided ? 'Decided' : 'Open'}
          </span>
          <span className="text-2xs text-ink-faint shrink-0 w-20 truncate">{decision.category}</span>
          <span className="flex-1 text-sm text-ink min-w-0 truncate">{decision.title}</span>
          {decision.costImpact && <span className="text-2xs text-ink-muted shrink-0">{decision.costImpact}</span>}
          {decision.neededBy && !isDecided && (
            <span className={`flex items-center gap-1 text-2xs shrink-0 ${
              overdue ? 'text-red-500 font-medium' : dueSoon ? 'text-amber-600' : 'text-ink-faint'
            }`}>
              {overdue && <AlertTriangle size={10} />}
              by {formatDate(decision.neededBy)}
            </span>
          )}
          {isDecided && decision.decidedOn && (
            <span className="text-2xs text-ink-faint shrink-0">{decision.decidedBy} · {formatDate(decision.decidedOn)}</span>
          )}
        </div>

        {expanded && (
          <div className="border-t border-surface-3 px-3 pb-3 pt-2.5 space-y-2.5">
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

            <div className="grid grid-cols-2 gap-2">
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

            {!readOnly && (
              <div className="flex items-center justify-between pt-1 border-t border-surface-3">
                {isDecided ? (
                  <button onClick={reopen}
                    className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors">
                    <RotateCcw size={11} /> Reopen
                  </button>
                ) : (
                  <button onClick={decide}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-accent text-white rounded hover:bg-accent-dark transition-colors">
                    <Check size={12} /> Mark decided
                  </button>
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

      <ConfirmDialog open={confirmDelete} title="Delete decision"
        message={`Delete "${decision.title}"?`}
        onConfirm={() => { onRemove(); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)} />
    </>
  )
}
