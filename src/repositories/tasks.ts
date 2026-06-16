/**
 * Task repository — CRUD for tasks within a project.
 *
 * Architecture (Phase A → C):
 *   - ITaskRepository methods (listTasks … removeTask) delegate to
 *     Zustand/localStorage — the authoritative source for the UI.
 *   - The supabaseXxx helpers below push/pull to the remote tasks table.
 *     They are called by useTaskSync, never by UI components directly.
 *
 * Data-shape notes:
 *   - assignedTo: local team/crew member record ID (text) — stored as-is in
 *     tasks.assigned_to text.  Supabase treats it as an opaque string for now.
 *   - dueDate: '' in local data maps to null in Supabase (date column).
 */
import { useEventStore } from '@/store/useEventStore'
import { useShootStore } from '@/store/useShootStore'
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import { generateId, now } from '@/lib/utils'
import type { Task } from '@/types/common'
import type { TaskRow } from '@/lib/supabase.types'
import type { ITaskRepository, ProjectModule, NewTask, TaskPatch } from './_types'

// ─── ITaskRepository (UI-facing, Zustand-backed) ─────────────────────────────

export const TaskRepository: ITaskRepository = {
  async listTasks(module: ProjectModule, projectId: string): Promise<Task[]> {
    return getProject(module, projectId)?.tasks ?? []
  },

  async addTask(module: ProjectModule, projectId: string, data: NewTask): Promise<Task> {
    const task: Task = { ...data, id: generateId(), createdAt: now(), updatedAt: now() }
    if (module === 'event') {
      useEventStore.getState().addTask(projectId, data)
    } else {
      useShootStore.getState().addTask(projectId, data)
    }
    const stored = getProject(module, projectId)?.tasks.find(
      (t) => t.createdAt === task.createdAt && t.title === task.title
    )
    return stored ?? task
  },

  async updateTask(module: ProjectModule, projectId: string, taskId: string, patch: TaskPatch): Promise<void> {
    if (module === 'event') {
      useEventStore.getState().updateTask(projectId, taskId, patch)
    } else {
      useShootStore.getState().updateTask(projectId, taskId, patch)
    }
  },

  async removeTask(module: ProjectModule, projectId: string, taskId: string): Promise<void> {
    if (module === 'event') {
      useEventStore.getState().removeTask(projectId, taskId)
    } else {
      useShootStore.getState().removeTask(projectId, taskId)
    }
  },
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getProject(module: ProjectModule, projectId: string) {
  if (module === 'event') {
    return useEventStore.getState().projects.find((p) => p.id === projectId)
  }
  return useShootStore.getState().projects.find((p) => p.id === projectId)
}

// ─── Supabase sync helpers (called by useTaskSync only) ───────────────────────

/** Converts a local Task to a Supabase insert row. */
function taskToRow(task: Task, projectId: string) {
  return {
    id:          task.id,
    project_id:  projectId,
    title:       task.title,
    description: task.description,
    status:      task.status,
    priority:    task.priority,
    due_date:    task.dueDate || null,        // '' → null for date column
    assigned_to: task.assignedTo,
    sort_order:  0,
  } as const
}

/** Converts a Supabase TaskRow to a local Task. */
export function taskRowToLocal(row: TaskRow): Task {
  return {
    id:          row.id,
    title:       row.title,
    description: row.description,
    status:      row.status,
    priority:    row.priority,
    dueDate:     row.due_date ?? '',          // null → ''
    assignedTo:  row.assigned_to,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  }
}

/**
 * Fetch all tasks for a given project from Supabase.
 * Returns null if Supabase is not configured.
 */
export async function supabaseFetchTasks(projectId: string): Promise<TaskRow[] | null> {
  const client = supabase
  if (!client) return null
  if (!isValidUUID(projectId)) return null

  const { data, error } = await client
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[TaskSync] fetch failed:', projectId, error.message)
    return null
  }
  return data
}

/**
 * Upsert a task into Supabase.
 * Silently skips if Supabase is not configured or IDs are not valid UUIDs.
 */
export async function supabasePushTask(task: Task, projectId: string): Promise<void> {
  const client = supabase
  if (!client) return
  if (!isValidUUID(task.id) || !isValidUUID(projectId)) return

  const { error } = await client
    .from('tasks')
    .upsert(taskToRow(task, projectId), { onConflict: 'id', ignoreDuplicates: false })

  if (error) console.warn('[TaskSync] push failed:', task.id, error.message)
}

/**
 * Update selected fields on a Supabase task row.
 */
export async function supabaseUpdateTask(
  taskId: string,
  patch: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'assignedTo'>>
): Promise<void> {
  const client = supabase
  if (!client) return
  if (!isValidUUID(taskId)) return

  // Build a typed patch — TaskUpdate = Partial<Omit<TaskRow, 'id'|'project_id'|timestamps>>
  const dbPatch: import('@/lib/supabase.types').TaskUpdate = {
    ...(patch.title       !== undefined && { title:       patch.title }),
    ...(patch.description !== undefined && { description: patch.description }),
    ...(patch.status      !== undefined && { status:      patch.status }),
    ...(patch.priority    !== undefined && { priority:    patch.priority }),
    ...(patch.dueDate     !== undefined && { due_date:    patch.dueDate || null }),
    ...(patch.assignedTo  !== undefined && { assigned_to: patch.assignedTo }),
  }

  if (Object.keys(dbPatch).length === 0) return

  const { error } = await client.from('tasks').update(dbPatch).eq('id', taskId)
  if (error) console.warn('[TaskSync] update failed:', taskId, error.message)
}

/**
 * Delete a task from Supabase.
 */
export async function supabaseDeleteTask(taskId: string): Promise<void> {
  const client = supabase
  if (!client) return
  if (!isValidUUID(taskId)) return

  const { error } = await client.from('tasks').delete().eq('id', taskId)
  if (error) console.warn('[TaskSync] delete failed:', taskId, error.message)
}
