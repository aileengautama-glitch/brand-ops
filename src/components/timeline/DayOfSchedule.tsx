import { useState } from 'react'
import { Plus, ArrowUp, ArrowDown, Trash2, Clock } from 'lucide-react'
import type { DayOfSlot } from '@/types/common'
import EmptyState from '@/components/ui/EmptyState'
import { inputCls } from '@/components/ui/FormField'

interface DayOfScheduleProps {
  slots: DayOfSlot[]
  onAdd: (data: Omit<DayOfSlot, 'id' | 'order'>) => void
  onUpdate: (id: string, patch: Partial<DayOfSlot>) => void
  onRemove: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
  /** When true, hides add/remove/reorder controls and makes cells read-only. */
  readOnly?: boolean
}

const BLANK = { timeStart: '', timeEnd: '', activity: '', owner: '', notes: '' }

export default function DayOfSchedule({ slots, onAdd, onUpdate, onRemove, onMove, readOnly }: DayOfScheduleProps) {
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(BLANK)

  const sorted = [...slots].sort((a, b) => a.order - b.order)

  const handleAdd = () => {
    if (!draft.activity.trim()) return
    onAdd({ ...draft })
    setDraft(BLANK)
    setShowForm(false)
  }

  return (
    <div>
      {sorted.length === 0 && !showForm ? (
        <EmptyState
          icon={Clock}
          title="No schedule yet"
          description="Add time slots for the day-of schedule."
          action={
            readOnly ? undefined : (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors"
              >
                <Plus size={13} /> Add slot
              </button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-surface-3">
                {['Time', 'Activity', 'Owner', 'Notes', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-3 py-2"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((slot, i) => (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  isFirst={i === 0}
                  isLast={i === sorted.length - 1}
                  onUpdate={(patch) => onUpdate(slot.id, patch)}
                  onRemove={() => onRemove(slot.id)}
                  onMove={(dir) => onMove(slot.id, dir)}
                  readOnly={readOnly}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add form */}
      {showForm && !readOnly && (
        <div className="mt-3 p-3 border border-surface-3 rounded bg-surface-1 space-y-2">
          <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">New Schedule Slot</p>
          <div className="grid grid-cols-5 gap-2">
            <input type="time" placeholder="Start" value={draft.timeStart}
              onChange={(e) => setDraft((d) => ({ ...d, timeStart: e.target.value }))}
              className={inputCls} />
            <input type="time" placeholder="End" value={draft.timeEnd}
              onChange={(e) => setDraft((d) => ({ ...d, timeEnd: e.target.value }))}
              className={inputCls} />
            <input autoFocus type="text" placeholder="Activity" value={draft.activity}
              onChange={(e) => setDraft((d) => ({ ...d, activity: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className={`${inputCls} col-span-1`} />
            <input type="text" placeholder="Owner" value={draft.owner}
              onChange={(e) => setDraft((d) => ({ ...d, owner: e.target.value }))}
              className={inputCls} />
            <input type="text" placeholder="Notes" value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              className={inputCls} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!draft.activity.trim()}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40">
              Add slot
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
          className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors px-1">
          <Plus size={13} /> Add slot
        </button>
      )}
    </div>
  )
}

// ─── Inline editable table row ────────────────────────────────────────────────

interface SlotRowProps {
  slot: DayOfSlot
  isFirst: boolean
  isLast: boolean
  onUpdate: (patch: Partial<DayOfSlot>) => void
  onRemove: () => void
  onMove: (direction: 'up' | 'down') => void
  readOnly?: boolean
}

function SlotRow({ slot, isFirst, isLast, onUpdate, onRemove, onMove, readOnly }: SlotRowProps) {
  const cellCls = 'px-3 py-2 border-b border-surface-3 align-top'
  const cellInputCls = 'w-full bg-transparent text-sm text-ink focus:outline-none focus:bg-white border border-transparent focus:border-surface-3 rounded px-1 -mx-1 py-0.5'

  return (
    <tr className="hover:bg-surface-1/30 group transition-colors">
      <td className={cellCls}>
        <div className="flex items-center gap-1 text-xs text-ink-secondary whitespace-nowrap mt-0.5">
          <input type="time" value={slot.timeStart} readOnly={readOnly}
            onChange={(e) => onUpdate({ timeStart: e.target.value })}
            className={cellInputCls} style={{ minWidth: 80 }} />
          <span className="text-ink-faint">–</span>
          <input type="time" value={slot.timeEnd} readOnly={readOnly}
            onChange={(e) => onUpdate({ timeEnd: e.target.value })}
            className={cellInputCls} style={{ minWidth: 80 }} />
        </div>
      </td>
      <td className={cellCls}>
        <textarea value={slot.activity} readOnly={readOnly}
          onChange={(e) => onUpdate({ activity: e.target.value })}
          rows={2}
          placeholder="Activity"
          className={`${cellInputCls} resize-none leading-snug`} />
      </td>
      <td className={cellCls}>
        <input type="text" value={slot.owner} readOnly={readOnly}
          onChange={(e) => onUpdate({ owner: e.target.value })}
          placeholder="—"
          className={`${cellInputCls} mt-0.5`} />
      </td>
      <td className={cellCls}>
        {/* Notes uses textarea so multi-line text wraps visibly */}
        <textarea value={slot.notes} readOnly={readOnly}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          rows={2}
          placeholder="—"
          className={`${cellInputCls} resize-none leading-snug`} />
      </td>
      {!readOnly && (
        <td className={`${cellCls} w-px`}>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
            <button onClick={() => onMove('up')} disabled={isFirst}
              className="p-0.5 rounded text-ink-faint hover:text-ink disabled:opacity-30">
              <ArrowUp size={11} />
            </button>
            <button onClick={() => onMove('down')} disabled={isLast}
              className="p-0.5 rounded text-ink-faint hover:text-ink disabled:opacity-30">
              <ArrowDown size={11} />
            </button>
            <button onClick={onRemove}
              className="p-0.5 rounded text-ink-faint hover:text-red-500">
              <Trash2 size={11} />
            </button>
          </div>
        </td>
      )}
    </tr>
  )
}
