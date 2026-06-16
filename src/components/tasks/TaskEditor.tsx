import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { FormField, inputCls } from '@/components/ui/FormField'
import { TASK_STATUS_LABELS, PRIORITY_LABELS } from '@/components/ui/StatusBadge'
import type { Task, TaskStatus, Priority } from '@/types/common'

type TaskDraft = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>

interface TaskEditorProps {
  open: boolean
  onClose: () => void
  onSave: (data: TaskDraft) => void
  initial?: Partial<TaskDraft>
  members: Array<{ id: string; name: string }>
  title?: string
}

const DEFAULT: TaskDraft = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'normal',
  dueDate: '',
  assignedTo: '',
}

export default function TaskEditor({
  open,
  onClose,
  onSave,
  initial,
  members,
  title = 'New Task',
}: TaskEditorProps) {
  const [draft, setDraft] = useState<TaskDraft>({ ...DEFAULT, ...initial })

  const set = (patch: Partial<TaskDraft>) => setDraft((d) => ({ ...d, ...patch }))

  const handleSave = () => {
    if (!draft.title.trim()) return
    onSave(draft)
    setDraft({ ...DEFAULT, ...initial })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!draft.title.trim()}
            className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40"
          >
            Save task
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <FormField label="Title" required>
          <input
            autoFocus
            type="text"
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Task title"
            className={inputCls}
          />
        </FormField>

        <FormField label="Description">
          <textarea
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Optional description or notes"
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Status">
            <select
              value={draft.status}
              onChange={(e) => set({ status: e.target.value as TaskStatus })}
              className={inputCls}
            >
              {(Object.entries(TASK_STATUS_LABELS) as [TaskStatus, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Priority">
            <select
              value={draft.priority}
              onChange={(e) => set({ priority: e.target.value as Priority })}
              className={inputCls}
            >
              {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Due date">
            <input
              type="date"
              value={draft.dueDate}
              onChange={(e) => set({ dueDate: e.target.value })}
              className={inputCls}
            />
          </FormField>

          <FormField label="Assign to">
            <select
              value={draft.assignedTo}
              onChange={(e) => set({ assignedTo: e.target.value })}
              className={inputCls}
            >
              <option value="">— Unassigned —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </FormField>
        </div>
      </div>
    </Modal>
  )
}
