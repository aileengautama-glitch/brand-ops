import { useState } from 'react'
import { ChevronDown, Trash2, Plus, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CrewMember } from '@/types/shoot'
import type { Task } from '@/types/common'
import { TaskStatusBadge } from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import TaskEditor from '@/components/tasks/TaskEditor'
import { inputCls } from '@/components/ui/FormField'

interface CrewCardProps {
  member: CrewMember
  tasks: Task[]
  allCrew: Array<{ id: string; name: string }>
  onUpdate: (patch: Partial<CrewMember>) => void
  onRemove: () => void
  onUpdateTask: (taskId: string, patch: Partial<Task>) => void
  onAddTask: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  /** When true, hides add-task/remove controls and makes fields read-only. */
  readOnly?: boolean
}

export default function CrewCard({
  member, tasks, allCrew, onUpdate, onRemove, onAddTask, readOnly,
}: CrewCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)

  const ongoing = tasks.filter((t) => t.status === 'in_progress')
  const upcoming = tasks.filter((t) => t.status === 'todo')
  const finished = tasks.filter((t) => t.status === 'done')

  return (
    <>
      <div className={cn('border border-surface-3 rounded bg-white', expanded && 'shadow-sm')}>
        <div
          className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-surface-1/40 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center shrink-0">
            <User size={13} className="text-ink-muted" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink">{member.name}</p>
            <p className="text-xs text-ink-faint">{member.role}</p>
          </div>
          <span className="text-xs text-ink-faint">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
          <ChevronDown size={12} className={cn('text-ink-faint shrink-0 transition-transform', expanded && 'rotate-180')} />
        </div>

        {expanded && (
          <div className="border-t border-surface-3 px-3 pb-3 pt-2.5 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Name</label>
                <input type="text" value={member.name} readOnly={readOnly}
                  onChange={(e) => onUpdate({ name: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Role</label>
                <input type="text" value={member.role} readOnly={readOnly}
                  onChange={(e) => onUpdate({ role: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Contact</label>
                <input type="text" value={member.contact} readOnly={readOnly}
                  onChange={(e) => onUpdate({ contact: e.target.value })} className={inputCls} />
              </div>
            </div>

            <div className="space-y-2.5">
              {[[ongoing, 'Ongoing'], [upcoming, 'Upcoming'], [finished, 'Finished']].map(([group, label]) =>
                (group as Task[]).length > 0 ? (
                  <div key={label as string}>
                    <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-1.5">{label as string}</p>
                    <div className="space-y-1">
                      {(group as Task[]).map((t) => (
                        <div key={t.id} className="flex items-center gap-2">
                          <TaskStatusBadge status={t.status} />
                          <span className={cn('text-xs text-ink truncate flex-1', t.status === 'done' && 'line-through text-ink-muted')}>{t.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>

            {!readOnly && (
              <div className="flex items-center justify-between pt-1 border-t border-surface-3">
                <button onClick={() => setShowAddTask(true)}
                  className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors">
                  <Plus size={11} /> Add task
                </button>
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={11} /> Remove
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <TaskEditor open={showAddTask} onClose={() => setShowAddTask(false)}
        onSave={(d) => onAddTask({ ...d, assignedTo: member.id })}
        members={allCrew} initial={{ assignedTo: member.id }}
        title={`Add task for ${member.name}`} />
      <ConfirmDialog open={confirmDelete} title="Remove crew member"
        message={`Remove ${member.name}?`}
        onConfirm={() => { onRemove(); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)} />
    </>
  )
}
