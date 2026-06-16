import { useState } from 'react'
import { ChevronDown, MessageSquare, Trash2 } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { Task, TaskStatus, Priority } from '@/types/common'
import { PriorityBadge, TASK_STATUS_LABELS, PRIORITY_LABELS } from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import CommentThread from '@/components/ui/CommentThread'
import { inputCls } from '@/components/ui/FormField'
import { useCommentStore } from '@/store/useCommentStore'

interface TaskRowProps {
  task: Task
  members: Array<{ id: string; name: string }>
  onUpdate: (patch: Partial<Task>) => void
  onRemove: () => void
  /** The project UUID — passed to CommentThread for Supabase sync. */
  projectId: string
  /** When true: inputs disabled, add/delete hidden. Expand to view is still allowed. */
  readOnly?: boolean
  /** When true: assignee slot shows "You" in accent. */
  isYours?: boolean
}

const STATUS_DOT: Record<TaskStatus, string> = {
  todo:        'border-surface-3 bg-white',
  in_progress: 'border-amber-400 bg-amber-100',
  done:        'border-green-500 bg-green-500',
}

export default function TaskRow({ task, members, onUpdate, onRemove, projectId, readOnly = false, isYours = false }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const commentCount = useCommentStore((s) => s.getFor('task', task.id).length)

  const assignee = members.find((m) => m.id === task.assignedTo)
  const isOverdue = !!task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date()

  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next: Record<TaskStatus, TaskStatus> = {
      todo: 'in_progress', in_progress: 'done', done: 'todo',
    }
    onUpdate({ status: next[task.status] })
  }

  return (
    <>
      <div
        className={cn(
          'border border-surface-3 rounded bg-white transition-shadow',
          expanded && 'shadow-sm',
          task.status === 'done' && 'opacity-65'
        )}
      >
        {/* ── Compact row ─────────────────────────────────────── */}
        <div
          className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-surface-1/40 transition-colors select-none"
          onClick={() => setExpanded(!expanded)}
        >
          {/* Status dot (cycling) */}
          <button
            onClick={readOnly ? undefined : cycleStatus}
            title={readOnly ? `Status: ${TASK_STATUS_LABELS[task.status]}` : `Status: ${TASK_STATUS_LABELS[task.status]} — click to advance`}
            className={cn(
              'w-3.5 h-3.5 rounded-full border-2 shrink-0 transition-transform',
              STATUS_DOT[task.status],
              readOnly ? 'cursor-default' : 'hover:scale-110'
            )}
          />

          {/* Title */}
          <span
            className={cn(
              'flex-1 text-sm text-ink min-w-0 truncate',
              task.status === 'done' && 'line-through text-ink-muted'
            )}
          >
            {task.title || <span className="text-ink-faint italic">Untitled task</span>}
          </span>

          {/* Priority — fixed 56px slot */}
          <span className="shrink-0 w-14 flex items-center justify-end">
            <PriorityBadge priority={task.priority} />
          </span>

          {/* Due date — fixed 72px slot */}
          {task.dueDate && (
            <span className={cn('text-xs shrink-0 w-[72px] text-right', isOverdue ? 'text-red-500 font-medium' : 'text-ink-faint')}>
              {isOverdue ? '⚠ ' : ''}{formatDate(task.dueDate, 'dd MMM')}
            </span>
          )}

          {/* Assignee — fixed 72px slot; "You" if isYours */}
          {assignee && (
            <span className={cn(
              'text-xs shrink-0 w-[72px] text-right truncate',
              isYours ? 'text-accent font-semibold' : 'text-ink-muted'
            )}>
              {isYours ? 'You' : assignee.name.split(' ')[0]}
            </span>
          )}

          {/* Comment trigger */}
          <button
            onClick={(e) => { e.stopPropagation(); setCommentsOpen((o) => !o) }}
            title="Comments"
            className={cn(
              'flex items-center gap-0.5 shrink-0 rounded px-1 py-0.5 transition-colors',
              commentsOpen
                ? 'text-accent bg-accent/10'
                : 'text-ink-faint hover:text-ink-muted'
            )}
          >
            <MessageSquare size={11} />
            {commentCount > 0 && (
              <span className="text-2xs tabular-nums">{commentCount}</span>
            )}
          </button>

          {/* Expand chevron */}
          <ChevronDown
            size={12}
            className={cn('text-ink-faint shrink-0 transition-transform', expanded && 'rotate-180')}
          />
        </div>

        {/* ── Expanded panel ───────────────────────────────────── */}
        {expanded && (
          <div className="border-t border-surface-3 px-3 pb-3 pt-2.5 space-y-2.5">
            {/* Title */}
            <input
              type="text"
              value={task.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Task title"
              disabled={readOnly}
              className={cn(inputCls, 'font-medium', readOnly && 'opacity-60 cursor-default')}
            />

            {/* Description */}
            <textarea
              value={task.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Add a description…"
              rows={2}
              disabled={readOnly}
              className={cn(inputCls, 'resize-none', readOnly && 'opacity-60 cursor-default')}
            />

            {/* Fields grid */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Status</label>
                <select
                  value={task.status}
                  onChange={(e) => onUpdate({ status: e.target.value as TaskStatus })}
                  disabled={readOnly}
                  className={cn(inputCls, readOnly && 'opacity-60 cursor-default')}
                >
                  {(Object.entries(TASK_STATUS_LABELS) as [TaskStatus, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Priority</label>
                <select
                  value={task.priority}
                  onChange={(e) => onUpdate({ priority: e.target.value as Priority })}
                  disabled={readOnly}
                  className={cn(inputCls, readOnly && 'opacity-60 cursor-default')}
                >
                  {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Due date</label>
                <input
                  type="date"
                  value={task.dueDate}
                  onChange={(e) => onUpdate({ dueDate: e.target.value })}
                  disabled={readOnly}
                  className={cn(inputCls, readOnly && 'opacity-60 cursor-default')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Assign to</label>
                <select
                  value={task.assignedTo}
                  onChange={(e) => onUpdate({ assignedTo: e.target.value })}
                  disabled={readOnly}
                  className={cn(inputCls, readOnly && 'opacity-60 cursor-default')}
                >
                  <option value="">— Unassigned —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Delete — hidden in read-only mode */}
            {!readOnly && (
              <div className="flex justify-end">
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={11} />
                  Delete task
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Comment thread ──────────────────────────────────── */}
        {commentsOpen && (
          <div className="border-t border-surface-2 px-3 py-3">
            <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-2.5">
              Comments{commentCount > 0 ? ` (${commentCount})` : ''}
            </p>
            <CommentThread entityType="task" entityId={task.id} projectId={projectId} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete task"
        message={`Delete "${task.title}"? This cannot be undone.`}
        onConfirm={() => { onRemove(); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
