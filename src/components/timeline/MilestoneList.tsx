import { useState, useRef } from 'react'
import { Plus, CalendarDays } from 'lucide-react'
import type { TimelineMilestone } from '@/types/common'
import MilestoneItem from './MilestoneItem'
import EmptyState from '@/components/ui/EmptyState'
import { inputCls } from '@/components/ui/FormField'
import { cn } from '@/lib/utils'

interface MilestoneListProps {
  milestones: TimelineMilestone[]
  onAdd: (data: Omit<TimelineMilestone, 'id' | 'order'>) => void
  onUpdate: (id: string, patch: Partial<TimelineMilestone>) => void
  onRemove: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
  onReorder?: (orderedIds: string[]) => void
  /** When true, hides add/remove/reorder controls and makes fields read-only. */
  readOnly?: boolean
}

const BLANK = { title: '', date: '', description: '', notes: '', relatedTaskIds: [] }

export default function MilestoneList({
  milestones,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
  onReorder,
  readOnly,
}: MilestoneListProps) {
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(BLANK)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dragNode = useRef<HTMLDivElement | null>(null)

  const sorted = [...milestones].sort((a, b) => a.order - b.order)

  const handleAdd = () => {
    if (!draft.title.trim()) return
    onAdd({ ...draft, title: draft.title.trim() })
    setDraft(BLANK)
    setShowForm(false)
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, id: string, el: HTMLDivElement) => {
    setDragId(id)
    dragNode.current = el
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    // Delay adding opacity so the ghost image renders at full opacity
    requestAnimationFrame(() => { if (dragNode.current) dragNode.current.style.opacity = '0.4' })
  }

  const handleDragEnd = () => {
    if (dragNode.current) dragNode.current.style.opacity = ''
    setDragId(null)
    setOverIndex(null)
    dragNode.current = null
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (!dragId || !onReorder) { setDragId(null); setOverIndex(null); return }
    const fromIndex = sorted.findIndex((m) => m.id === dragId)
    if (fromIndex === -1 || fromIndex === dropIndex) { setDragId(null); setOverIndex(null); return }
    const newOrder = [...sorted]
    const [moved] = newOrder.splice(fromIndex, 1)
    newOrder.splice(dropIndex, 0, moved)
    onReorder(newOrder.map((m) => m.id))
    setDragId(null)
    setOverIndex(null)
  }

  return (
    <div>
      {sorted.length === 0 && !showForm ? (
        <EmptyState
          icon={CalendarDays}
          title="No milestones yet"
          description="Add key dates and checkpoints for this project."
          action={
            readOnly ? undefined : (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors"
              >
                <Plus size={13} /> Add milestone
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-1.5">
          {sorted.map((m, i) => (
            <div
              key={m.id}
              draggable={!!onReorder && !readOnly}
              onDragStart={(e) => handleDragStart(e, m.id, e.currentTarget)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={(e) => handleDrop(e, i)}
              className={cn(
                'transition-all',
                dragId === m.id && 'opacity-40',
                overIndex === i && dragId !== m.id && 'ring-2 ring-accent/40 rounded'
              )}
            >
              <MilestoneItem
                milestone={m}
                isFirst={i === 0}
                isLast={i === sorted.length - 1}
                onUpdate={(patch) => onUpdate(m.id, patch)}
                onRemove={() => onRemove(m.id)}
                onMove={(dir) => onMove(m.id, dir)}
                isDraggable={!!onReorder && !readOnly}
                readOnly={readOnly}
              />
            </div>
          ))}
        </div>
      )}

      {/* Inline add form */}
      {showForm && !readOnly && (
        <div className="mt-2 p-3 border border-surface-3 rounded bg-surface-1 space-y-2">
          <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">New Milestone</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              autoFocus
              type="text"
              placeholder="Milestone title"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className={inputCls}
            />
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
              className={inputCls}
            />
          </div>
          <input
            type="text"
            placeholder="Description (optional)"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            className={inputCls}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!draft.title.trim()}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40"
            >
              Add milestone
            </button>
            <button
              onClick={() => { setShowForm(false); setDraft(BLANK) }}
              className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {sorted.length > 0 && !showForm && !readOnly && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors px-1"
        >
          <Plus size={13} /> Add milestone
        </button>
      )}
    </div>
  )
}
