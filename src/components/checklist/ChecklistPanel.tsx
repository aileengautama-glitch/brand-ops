/**
 * ChecklistPanel — the project's pre-production checklist.
 *
 * Seeded from a template, then fully owned by the project: edit any line, change who
 * owns it, promote it to a dated gate (or demote it back to a checkbox), delete it, or
 * add your own. Template-derived lines are badged so it's obvious what came from the
 * library and what this project added.
 *
 * Gate vs checkbox is the important distinction: a gate is anchored to the shoot /
 * launch / event date and shows up on the timeline; a checkbox lives only here.
 */
import { useMemo, useState } from 'react'
import {
  Check, ChevronDown, Plus, Trash2, Flag, Square, Sparkles, PencilLine,
} from 'lucide-react'
import type { ChecklistItem, ChecklistCondition, ChecklistTemplate } from '@/types/checklist'
import type { MilestoneAnchor } from '@/types/common'
import { cn, formatDate } from '@/lib/utils'
import { inputCls } from '@/components/ui/FormField'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { ANCHOR_LABELS, anchorOptions, resolveMilestone, type ProjectAnchors } from '@/lib/scheduleEngine'
import { CONDITION_LABELS, instantiateTemplate } from '@/lib/checklistTemplates'

export default function ChecklistPanel({
  items, templates, anchors, module, readOnly,
  onAdd, onUpdate, onRemove, onReplaceAll,
}: {
  items: ChecklistItem[]
  templates: ChecklistTemplate[]
  anchors: ProjectAnchors
  module: 'shoot' | 'event'
  readOnly?: boolean
  onAdd: (data: Omit<ChecklistItem, 'id' | 'order'>) => void
  onUpdate: (id: string, patch: Partial<ChecklistItem>) => void
  onRemove: (id: string) => void
  /** Used when applying a template — replaces the whole list. */
  onReplaceAll: (items: ChecklistItem[]) => void
}) {
  const [showApply, setShowApply] = useState(false)
  const [showDone, setShowDone] = useState(true)
  const [newLabel, setNewLabel] = useState('')

  const sorted = useMemo(() => [...items].sort((a, b) => a.order - b.order), [items])
  const visible = showDone ? sorted : sorted.filter((i) => !i.done)
  const done = sorted.filter((i) => i.done).length
  const gates = sorted.filter((i) => i.isGate).length

  // Group by phase, preserving first-appearance order.
  const phases = useMemo(() => {
    const out: { phase: string; items: ChecklistItem[] }[] = []
    for (const item of visible) {
      let g = out.find((x) => x.phase === item.phase)
      if (!g) { g = { phase: item.phase, items: [] }; out.push(g) }
      g.items.push(item)
    }
    return out
  }, [visible])

  const addCustom = () => {
    if (!newLabel.trim()) return
    onAdd({
      label: newLabel.trim(), description: '', phase: 'Added on this project', owner: '',
      done: false, doneAt: '', isGate: false, templateKey: '',
    })
    setNewLabel('')
  }

  return (
    <div>
      {/* Summary + actions */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="text-2xs font-bold uppercase tracking-widest text-ink-faint">
          {done} / {sorted.length} done{gates > 0 ? ` · ${gates} gates` : ''}
        </span>
        {sorted.length > 0 && (
          <button onClick={() => setShowDone((v) => !v)}
            className="text-xs text-ink-muted hover:text-ink transition-colors">
            {showDone ? 'Hide completed' : 'Show completed'}
          </button>
        )}
        {!readOnly && (
          <button onClick={() => setShowApply((v) => !v)}
            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors ml-auto">
            <Sparkles size={12} /> {sorted.length === 0 ? 'Apply template' : 'Re-apply template'}
          </button>
        )}
      </div>

      {showApply && !readOnly && (
        <ApplyTemplate
          templates={templates}
          hasExisting={sorted.length > 0}
          onCancel={() => setShowApply(false)}
          onApply={(items) => { onReplaceAll(items); setShowApply(false) }}
        />
      )}

      {sorted.length === 0 && !showApply ? (
        <div className="bg-surface-1 border border-dashed border-surface-3 rounded-lg p-8 text-center">
          <Square size={20} className="text-ink-faint mx-auto mb-2" />
          <p className="text-sm text-ink-muted mb-1">No checklist yet</p>
          <p className="text-xs text-ink-faint mb-3">
            Apply a template to start from the production library, then edit it for this project.
          </p>
          {!readOnly && (
            <button onClick={() => setShowApply(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
              <Sparkles size={13} /> Apply template
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {phases.map((group) => (
            <section key={group.phase}>
              <p className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-1.5">{group.phase}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <ChecklistRow
                    key={item.id}
                    item={item}
                    anchors={anchors}
                    module={module}
                    readOnly={readOnly}
                    onUpdate={(patch) => onUpdate(item.id, patch)}
                    onRemove={() => onRemove(item.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Add a custom line */}
      {!readOnly && sorted.length > 0 && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-surface-3">
          <Plus size={13} className="text-ink-faint shrink-0" />
          <input
            type="text" value={newLabel} placeholder="Add a task for this project…"
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            className="flex-1 text-sm bg-transparent border-b border-surface-3 focus:border-accent focus:outline-none py-1 text-ink placeholder:text-ink-faint"
          />
          <button onClick={addCustom}
            className="px-2.5 py-1 text-xs border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">
            Add
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Apply / re-apply a template ──────────────────────────────────────────────

function ApplyTemplate({
  templates, hasExisting, onApply, onCancel,
}: {
  templates: ChecklistTemplate[]
  hasExisting: boolean
  onApply: (items: ChecklistItem[]) => void
  onCancel: () => void
}) {
  const [templateKey, setTemplateKey] = useState(templates[0]?.key ?? '')
  const [conditions, setConditions] = useState<ChecklistCondition[]>(['with-stylist', 'campaign'])
  const template = templates.find((t) => t.key === templateKey) ?? templates[0]

  // Which conditions this template actually uses.
  const available = useMemo(() => {
    const set = new Set<ChecklistCondition>()
    for (const i of template?.items ?? []) for (const c of i.conditions ?? []) set.add(c)
    return [...set]
  }, [template])

  const preview = useMemo(
    () => (template ? instantiateTemplate(template, conditions, () => 'x').length : 0),
    [template, conditions],
  )

  const toggle = (c: ChecklistCondition) =>
    setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))

  if (!template) return null

  return (
    <div className="mb-4 p-3 border border-surface-3 rounded bg-surface-1 space-y-2.5">
      <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">Apply a template</p>

      <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} className={inputCls}>
        {templates.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
      </select>
      <p className="text-2xs text-ink-faint">{template.description} · Source: {template.source}</p>

      {available.length > 0 && (
        <div className="space-y-1">
          <p className="text-2xs uppercase tracking-wide text-ink-faint">Conditions — only matching lines are created</p>
          <div className="flex flex-wrap gap-1.5">
            {available.map((c) => (
              <button key={c} onClick={() => toggle(c)}
                className={cn('text-2xs px-2 py-1 rounded border transition-colors',
                  conditions.includes(c)
                    ? 'bg-accent text-white border-accent'
                    : 'bg-white text-ink-muted border-surface-3 hover:border-accent/40')}>
                {CONDITION_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-ink-muted">
        {preview} item{preview === 1 ? '' : 's'} will be created.
        {hasExisting && <span className="text-amber-700"> This replaces the current checklist, including your edits.</span>}
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => onApply(instantiateTemplate(template, conditions, () => crypto.randomUUID()) as ChecklistItem[])}
          className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
          {hasExisting ? 'Replace checklist' : 'Create checklist'}
        </button>
        <button onClick={onCancel}
          className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── One line ─────────────────────────────────────────────────────────────────

function ChecklistRow({
  item, anchors, module, readOnly, onUpdate, onRemove,
}: {
  item: ChecklistItem
  anchors: ProjectAnchors
  module: 'shoot' | 'event'
  readOnly?: boolean
  onUpdate: (patch: Partial<ChecklistItem>) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Gates resolve a date the same way milestones do.
  const resolved = item.isGate
    ? resolveMilestone(
        { id: item.id, title: item.label, date: '', description: '', notes: '', relatedTaskIds: [], order: item.order,
          anchorType: item.anchorType, offsetDays: item.offsetDays },
        anchors,
      )
    : null

  const toggleDone = () =>
    onUpdate({ done: !item.done, doneAt: !item.done ? new Date().toISOString() : '' })

  return (
    <>
      <div className={cn('border rounded bg-white', item.done ? 'border-surface-3 opacity-70' : 'border-surface-3')}>
        <div className="flex items-start gap-2.5 px-2.5 py-2">
          {/* Big touch target — this gets used on a tablet on set */}
          <button
            onClick={toggleDone}
            disabled={readOnly}
            className={cn(
              'w-6 h-6 shrink-0 rounded border flex items-center justify-center transition-colors mt-0.5',
              item.done ? 'bg-accent border-accent text-white' : 'bg-white border-surface-3 hover:border-accent/50',
            )}
            title={item.done ? 'Mark not done' : 'Mark done'}
          >
            {item.done && <Check size={13} />}
          </button>

          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
            <div className="flex items-start gap-2">
              <span className={cn('text-sm leading-snug flex-1 min-w-0', item.done ? 'text-ink-faint line-through' : 'text-ink')}>
                {item.label}
              </span>

              {item.isGate && (
                <span className="flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded border bg-accent/10 text-accent border-accent/30 shrink-0"
                  title="Gate — dated, owned, shows on the timeline">
                  <Flag size={9} /> Gate
                </span>
              )}
              {!item.templateKey && (
                <span className="text-2xs px-1.5 py-0.5 rounded border bg-surface-1 text-ink-faint border-surface-3 shrink-0"
                  title="Added on this project">
                  Custom
                </span>
              )}
              <ChevronDown size={12} className={cn('text-ink-faint shrink-0 mt-0.5 transition-transform', expanded && 'rotate-180')} />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
              {item.owner && <span className="text-2xs text-ink-muted">{item.owner}</span>}
              {resolved?.date && (
                <span className="text-2xs text-ink-faint">Due {formatDate(resolved.date)}</span>
              )}
              {item.isGate && resolved?.missingAnchor && (
                <span className="text-2xs text-amber-600">Set the {resolved.anchorType} date</span>
              )}
              {item.done && item.doneAt && (
                <span className="text-2xs text-ink-faint">Done {formatDate(item.doneAt.slice(0, 10))}</span>
              )}
            </div>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-surface-3 px-2.5 pb-2.5 pt-2 space-y-2">
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wide text-ink-faint block">Task</label>
              <input type="text" value={item.label} readOnly={readOnly}
                onChange={(e) => onUpdate({ label: e.target.value })} className={inputCls} />
            </div>

            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wide text-ink-faint block">Description</label>
              <textarea value={item.description} readOnly={readOnly} rows={2}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="Detail, conditions, what good looks like…"
                className={cn(inputCls, 'resize-none')} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Owner</label>
                <input type="text" value={item.owner} readOnly={readOnly}
                  onChange={(e) => onUpdate({ owner: e.target.value })}
                  placeholder="Who owns this?" className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Phase</label>
                <input type="text" value={item.phase} readOnly={readOnly}
                  onChange={(e) => onUpdate({ phase: e.target.value })} className={inputCls} />
              </div>
            </div>

            {/* Gate vs checkbox */}
            <div className="border-t border-surface-3 pt-2 space-y-2">
              <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                <input type="checkbox" checked={item.isGate} disabled={readOnly}
                  onChange={(e) => onUpdate({
                    isGate: e.target.checked,
                    anchorType: e.target.checked ? (item.anchorType ?? (module === 'shoot' ? 'shoot' : 'event')) : 'none',
                    offsetDays: e.target.checked ? (item.offsetDays ?? 7) : 0,
                  })} />
                <Flag size={11} className="text-accent" />
                Treat as a gate — dated and shown on the timeline
              </label>

              {item.isGate && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-2xs uppercase tracking-wide text-ink-faint block">Anchor</label>
                    <select value={item.anchorType ?? 'none'} disabled={readOnly}
                      onChange={(e) => onUpdate({ anchorType: e.target.value as MilestoneAnchor })}
                      className={inputCls}>
                      {anchorOptions(module).map((a) => (
                        <option key={a} value={a}>{ANCHOR_LABELS[a]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-2xs uppercase tracking-wide text-ink-faint block">Days before</label>
                    <input type="number" min={0} value={item.offsetDays ?? 0} readOnly={readOnly}
                      onChange={(e) => onUpdate({ offsetDays: Math.max(0, Number(e.target.value) || 0) })}
                      className={inputCls} />
                  </div>
                </div>
              )}
            </div>

            {!readOnly && (
              <div className="flex items-center justify-between pt-1 border-t border-surface-3">
                <span className="flex items-center gap-1 text-2xs text-ink-faint">
                  <PencilLine size={10} />
                  {item.templateKey ? 'From template — edits are yours' : 'Added on this project'}
                </span>
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog open={confirmDelete} title="Delete checklist item"
        message={`Delete "${item.label}"?`}
        onConfirm={() => { onRemove(); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)} />
    </>
  )
}
