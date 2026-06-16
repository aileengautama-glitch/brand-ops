import { useState } from 'react'
import { Plus, CheckSquare, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task, Priority, TaskStatus } from '@/types/common'
import TaskRow from './TaskRow'
import TaskEditor from './TaskEditor'
import EmptyState from '@/components/ui/EmptyState'

interface TaskListProps {
  tasks: Task[]
  members: Array<{ id: string; name: string }>
  onAdd: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdate: (taskId: string, patch: Partial<Task>) => void
  onRemove: (taskId: string) => void
  /** The project UUID — threaded to TaskRow so CommentThread can sync comments. */
  projectId: string
  /** When set, only renders tasks with this priority */
  filterPriority?: Priority
  /** When set, limits number of tasks shown */
  maxItems?: number
  /** Compact single-column display for embedded contexts */
  compact?: boolean
  /** Show status filter tabs (All / To Do / In Progress / Done) */
  showStatusFilter?: boolean
  /** When true: hides Add / Delete, disables inputs. */
  readOnly?: boolean
  /** Member ID of the current user — tasks with this assignedTo show "You". */
  currentMemberId?: string
}

const STATUS_TABS: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all',        label: 'All'         },
  { value: 'todo',       label: 'To Do'       },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done',       label: 'Done'        },
]

export default function TaskList({
  tasks,
  members,
  onAdd,
  onUpdate,
  onRemove,
  projectId,
  filterPriority,
  maxItems,
  compact = false,
  showStatusFilter = false,
  readOnly = false,
  currentMemberId,
}: TaskListProps) {
  const [showEditor, setShowEditor] = useState(false)
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  let displayed = filterPriority
    ? tasks.filter((t) => t.priority === filterPriority)
    : tasks

  if (showStatusFilter && statusFilter !== 'all') {
    displayed = displayed.filter((t) => t.status === statusFilter)
  }

  if (search.trim()) {
    const q = search.toLowerCase()
    displayed = displayed.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q) ||
        (t.assignedTo ?? '').toLowerCase().includes(q)
    )
  }

  if (maxItems) displayed = displayed.slice(0, maxItems)

  return (
    <div>
      {/* Search */}
      {showStatusFilter && (
        <div className="relative mb-2">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-surface-3 rounded bg-white focus:outline-none focus:border-accent"
          />
        </div>
      )}

      {/* Status filter tabs */}
      {showStatusFilter && (
        <div className="flex gap-0.5 mb-3 border-b border-surface-3 pb-0">
          {STATUS_TABS.map((tab) => {
            const count = tab.value === 'all'
              ? tasks.length
              : tasks.filter((t) => t.status === tab.value).length
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-t border-b-2 -mb-px transition-colors',
                  statusFilter === tab.value
                    ? 'text-accent font-semibold border-accent bg-accent/5'
                    : 'text-ink-muted border-transparent hover:text-ink'
                )}
              >
                {tab.label}
                <span className={cn(
                  'ml-1.5 text-2xs',
                  statusFilter === tab.value ? 'text-accent' : 'text-ink-faint'
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Task rows */}
      {displayed.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={
            showStatusFilter && statusFilter !== 'all'
              ? `No ${STATUS_TABS.find((t) => t.value === statusFilter)?.label.toLowerCase()} tasks`
              : filterPriority === 'high' ? 'No high-priority tasks' : 'No tasks yet'
          }
          description={filterPriority || (showStatusFilter && statusFilter !== 'all') ? undefined : 'Add a task to get started.'}
          action={
            !readOnly && !filterPriority && !(showStatusFilter && statusFilter !== 'all') ? (
              <button
                onClick={() => setShowEditor(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors"
              >
                <Plus size={13} /> Add task
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
          {displayed.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              members={members}
              onUpdate={(patch) => onUpdate(task.id, patch)}
              onRemove={() => onRemove(task.id)}
              projectId={projectId}
              readOnly={readOnly}
              isYours={!!currentMemberId && task.assignedTo === currentMemberId}
            />
          ))}
        </div>
      )}

      {/* Add button — not shown in priority-filter, maxItems, or readOnly mode */}
      {!readOnly && !filterPriority && !maxItems && displayed.length > 0 && (
        <button
          onClick={() => setShowEditor(true)}
          className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors px-1"
        >
          <Plus size={13} /> Add task
        </button>
      )}

      <TaskEditor
        open={showEditor}
        onClose={() => setShowEditor(false)}
        onSave={onAdd}
        members={members}
      />
    </div>
  )
}
