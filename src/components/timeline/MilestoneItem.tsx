import { useRef, useState } from 'react'
import { ChevronDown, ArrowUp, ArrowDown, Trash2, CalendarDays } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { TimelineMilestone } from '@/types/common'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { inputCls } from '@/components/ui/FormField'

function InlineDateField({
  value,
  onChange,
  readOnly,
}: {
  value: string
  onChange: (v: string) => void
  readOnly?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  if (editing && !readOnly) {
    return (
      <input
        ref={inputRef}
        autoFocus
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') setEditing(false) }}
        className="text-xs border border-accent/40 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-accent"
      />
    )
  }

  if (readOnly) {
    return (
      <span className="text-xs text-ink-muted px-1 -mx-1 py-0.5">
        {value ? formatDate(value) : <span className="text-ink-faint italic">No date</span>}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-xs text-ink-muted hover:text-ink hover:bg-surface-3/50 rounded px-1 -mx-1 py-0.5 transition-colors"
      title="Click to edit date"
    >
      {value ? formatDate(value) : <span className="text-ink-faint italic">Set date…</span>}
    </button>
  )
}

interface MilestoneItemProps {
  milestone: TimelineMilestone
  isFirst: boolean
  isLast: boolean
  onUpdate: (patch: Partial<TimelineMilestone>) => void
  onRemove: () => void
  onMove: (direction: 'up' | 'down') => void
  isDraggable?: boolean
  readOnly?: boolean
}

export default function MilestoneItem({
  milestone,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMove,
  isDraggable = false,
  readOnly,
}: MilestoneItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isPast = milestone.date ? new Date(milestone.date) < new Date() : false

  return (
    <>
      <div className={cn('border border-surface-3 rounded bg-white', expanded && 'shadow-sm')}>
        {/* Header */}
        <div
          className={cn('flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-1/30 transition-colors', isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer')}
          onClick={() => setExpanded(!expanded)}
        >
          {/* Date indicator dot */}
          <div
            className={cn(
              'w-2.5 h-2.5 rounded-full border-2 shrink-0',
              isPast ? 'bg-accent border-accent' : 'bg-white border-surface-3'
            )}
          />

          {/* Title */}
          <span className="flex-1 text-sm text-ink min-w-0 truncate">{milestone.title}</span>

          {/* Date */}
          {milestone.date && (
            <span className="flex items-center gap-1 text-xs text-ink-faint shrink-0">
              <CalendarDays size={11} />
              {formatDate(milestone.date)}
            </span>
          )}

          {/* Reorder */}
          {!readOnly && (
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onMove('up')}
                disabled={isFirst}
                className="p-0.5 rounded text-ink-faint hover:text-ink disabled:opacity-30 transition-colors"
              >
                <ArrowUp size={12} />
              </button>
              <button
                onClick={() => onMove('down')}
                disabled={isLast}
                className="p-0.5 rounded text-ink-faint hover:text-ink disabled:opacity-30 transition-colors"
              >
                <ArrowDown size={12} />
              </button>
            </div>
          )}

          {/* Expand */}
          <ChevronDown
            size={12}
            className={cn('text-ink-faint shrink-0 transition-transform', expanded && 'rotate-180')}
          />
        </div>

        {/* Expanded panel */}
        {expanded && (
          <div className="border-t border-surface-3 px-3 pb-3 pt-2.5 space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Title</label>
                <input
                  type="text"
                  value={milestone.title}
                  onChange={(e) => onUpdate({ title: e.target.value })}
                  readOnly={readOnly}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Date</label>
                <div className="py-1">
                  <InlineDateField
                    value={milestone.date}
                    onChange={(v) => onUpdate({ date: v })}
                    readOnly={readOnly}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wide text-ink-faint block">Description</label>
              <textarea
                value={milestone.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                readOnly={readOnly}
                placeholder="What does this milestone represent?"
                rows={2}
                className={cn(inputCls, 'resize-none')}
              />
            </div>

            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wide text-ink-faint block">Notes</label>
              <input
                type="text"
                value={milestone.notes}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                readOnly={readOnly}
                placeholder="Any additional notes"
                className={inputCls}
              />
            </div>

            {!readOnly && (
              <div className="flex justify-end">
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={11} /> Delete milestone
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete milestone"
        message={`Delete "${milestone.title}"?`}
        onConfirm={() => { onRemove(); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
