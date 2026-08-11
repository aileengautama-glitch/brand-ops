/**
 * ChecklistGates — checklist items flagged as gates, shown on the timeline.
 *
 * Read-only on purpose. The item lives once, in the checklist; this is a view of it,
 * not a copy. Editing happens where it's owned, so the two can never drift — the
 * duplicate-source problem the production brief calls out explicitly.
 */
import { Link } from 'react-router-dom'
import { Flag, Check, ExternalLink } from 'lucide-react'
import type { ChecklistItem } from '@/types/checklist'
import { cn, formatDate } from '@/lib/utils'
import { resolveMilestone, milestoneUrgency, type ProjectAnchors } from '@/lib/scheduleEngine'

export default function ChecklistGates({
  items, anchors, checklistHref,
}: {
  items: ChecklistItem[]
  anchors: ProjectAnchors
  /** Where to go to edit these. */
  checklistHref: string
}) {
  const gates = items.filter((i) => i.isGate)
  if (gates.length === 0) return null

  const rows = gates
    .map((item) => {
      const resolved = resolveMilestone(
        { id: item.id, title: item.label, date: '', description: '', notes: '', relatedTaskIds: [], order: item.order,
          anchorType: item.anchorType, offsetDays: item.offsetDays },
        anchors,
      )
      return { item, date: resolved.date, missingAnchor: resolved.missingAnchor }
    })
    .sort((a, b) => {
      if (a.date && b.date && a.date !== b.date) return a.date < b.date ? -1 : 1
      if (a.date && !b.date) return -1
      if (!a.date && b.date) return 1
      return a.item.order - b.item.order
    })

  const done = gates.filter((g) => g.done).length

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-ink-muted">
          {done} / {gates.length} cleared — dated from the checklist, edited there.
        </p>
        <Link to={checklistHref} className="flex items-center gap-1 text-xs text-accent hover:underline">
          Open checklist <ExternalLink size={10} />
        </Link>
      </div>

      <div className="space-y-1">
        {rows.map(({ item, date, missingAnchor }) => {
          const urgency = item.done ? 'none' : milestoneUrgency(date)
          return (
            <div key={item.id}
              className={cn('flex items-center gap-2.5 px-2.5 py-1.5 border rounded bg-white',
                item.done ? 'border-surface-3 opacity-70' : 'border-surface-3')}>
              <span className={cn('w-4 h-4 shrink-0 rounded border flex items-center justify-center',
                item.done ? 'bg-accent border-accent text-white' : 'bg-white border-surface-3')}>
                {item.done && <Check size={10} />}
              </span>
              <Flag size={10} className="text-accent shrink-0" />
              <span className={cn('flex-1 text-sm min-w-0 truncate', item.done ? 'text-ink-faint line-through' : 'text-ink')}>
                {item.label}
              </span>
              {item.owner && <span className="text-2xs text-ink-muted shrink-0">{item.owner}</span>}
              {date ? (
                <span className={cn('text-xs shrink-0',
                  urgency === 'overdue' ? 'text-red-500 font-medium'
                    : urgency === 'due-soon' ? 'text-amber-600' : 'text-ink-faint')}>
                  {formatDate(date)}
                </span>
              ) : missingAnchor ? (
                <span className="text-2xs text-amber-600 shrink-0">Set the date</span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
