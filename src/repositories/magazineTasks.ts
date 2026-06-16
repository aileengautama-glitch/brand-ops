/**
 * Magazine tasks repository — Supabase-first reads + dual-write helpers for the
 * magazine task board (MagazineTask) content entity. Mirrors magazineArticles.ts.
 *
 * Phase 5I: flat task records. SEPARATE from the shared `tasks` table (events/shoots,
 * synced by useTaskSync) — that system is not touched. The shared Task type is reused
 * only for its enum values (status/priority) via the DB CHECK constraints.
 *
 * Read authority (resolved by the caller, MagazineTasks.tsx):
 *     const tasks = (await list(projectId)) ?? project.tasks
 *   • list() returns mapped Supabase rows when the table has data for the project.
 *   • list() returns NULL — "use your local copy" — when Supabase is disabled, the
 *     project id is non-UUID, the query errors, or there are no rows.
 *
 * updatedAt: MagazineTask.updatedAt maps to the dedicated app_updated_at column; the
 * DB row's updated_at is the write marker — the two are never overloaded.
 *
 * Write helpers (called by useMagazineTaskSync only) dual-write best-effort: the local
 * store stays authoritative; failures are logged, never thrown, never rolled back.
 */
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { MagazineTaskRow, MagazineTaskInsert } from '@/lib/supabase.types'
import type { TaskStatus, Priority } from '@/types/common'
import type { MagazineTask, MagazineTaskLinkType } from '@/types/magazine'

// ─── Mapping ──────────────────────────────────────────────────────────────────

// row → app-facing MagazineTask. Nullable soft refs → ''; app_updated_at → updatedAt.
function rowToTask(r: MagazineTaskRow): MagazineTask {
  return {
    id:          r.id,
    title:       r.title,
    description: r.description,
    status:      r.status   as TaskStatus,            // text+CHECK pinned to domain
    priority:    r.priority as Priority,              // text+CHECK pinned to domain
    dueDate:     r.due_date,
    assignedTo:  r.assigned_to ?? '',                 // null → ''
    createdAt:   r.created_at,
    updatedAt:   r.app_updated_at,                    // app entity's updatedAt
    section:     r.section,
    linkType:    r.link_type as MagazineTaskLinkType, // text+CHECK pinned to domain
    linkId:      r.link_id ?? '',                     // null → ''
    order:       r.sort_order,
  }
}

// MagazineTask → row. '' → null for nullable soft refs; updatedAt → app_updated_at;
// created_at preserved; the DB write marker updated_at is bumped.
function taskToRow(t: MagazineTask, projectId: string): MagazineTaskInsert {
  return {
    id:             t.id,
    project_id:     projectId,
    title:          t.title,
    description:    t.description,
    status:         t.status,
    priority:       t.priority,
    due_date:       t.dueDate,
    assigned_to:    t.assignedTo || null,
    section:        t.section,
    link_type:      t.linkType,
    link_id:        t.linkId || null,
    sort_order:     t.order,
    app_updated_at: t.updatedAt,
    created_at:     t.createdAt,
    updated_at:     new Date().toISOString(),
  }
}

// ─── Read (Supabase-first, null = caller falls back to local) ─────────────────

export const MagazineTaskRepository = {
  /**
   * Supabase-first read of a project's magazine tasks (ordered by sort_order).
   * Returns a mapped array when Supabase has ≥1 row; otherwise NULL to signal the
   * caller to fall back to its local store copy (disabled / non-UUID / error / empty).
   */
  async list(projectId: string): Promise<MagazineTask[] | null> {
    if (!isSupabaseEnabled || !supabase) return null
    if (!isValidUUID(projectId)) return null

    const { data, error } = await supabase
      .from('magazine_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.warn('[MagazineTaskRepo] list failed:', projectId, error.message)
      return null
    }
    if (!data || data.length === 0) return null  // no rows yet → fall back to local

    return data.map(rowToTask)
  },
}

// ─── Supabase write helpers (Phase 5I — called by useMagazineTaskSync only) ─────
// Plain exported functions — NOT on MagazineTaskRepository (read-only object).
// Distinct from the shared tasks-table helpers; this only touches magazine_tasks.

/**
 * Upsert one magazine task — INSERT for adds, UPDATE for edits/reorders (conflict id).
 * Skips non-UUID ids (seed-mag-* tasks / projects stay local-only).
 * FK magazine_tasks.project_id → projects(id): a 23503 means the project row isn't in
 * Supabase yet (Phase 4 push pending) — logged, self-heals on the next change.
 */
export async function supabasePushTask(task: MagazineTask, projectId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(task.id) || !isValidUUID(projectId)) return

  const { error } = await supabase
    .from('magazine_tasks')
    .upsert(taskToRow(task, projectId), { onConflict: 'id', ignoreDuplicates: false })
  if (error) {
    if (error.code === '23503') {
      console.warn('[MagazineTaskSync] FK violation — project not yet in Supabase:', { taskId: task.id, projectId }, error.message)
    } else {
      console.warn('[MagazineTaskSync] push failed:', task.id, error.message)
    }
  }
}

/** Delete one magazine task by id. Skips non-UUID ids. */
export async function supabaseDeleteTask(taskId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(taskId)) return

  const { error } = await supabase.from('magazine_tasks').delete().eq('id', taskId)
  if (error) console.warn('[MagazineTaskSync] delete failed:', taskId, error.message)
}
