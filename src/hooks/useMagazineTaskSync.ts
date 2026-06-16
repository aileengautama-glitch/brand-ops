/**
 * useMagazineTaskSync — Phase 5I write-path: local → Supabase for magazine tasks.
 *
 * Dual-write: the local Zustand store stays authoritative; every magazine-task change
 * is mirrored to the magazine_tasks table best-effort (errors logged, never thrown,
 * never rolled back). Mirrors useMagazineArticleSync.
 *
 * SEPARATE from the shared tasks table / useTaskSync (events/shoots). This only ever
 * touches magazine_tasks and the local MagazineProject.tasks array.
 *
 * What it does:
 *   1. On mount: pushes every current UUID magazine task (upsert — safe to re-run).
 *   2. Subscribes to useMagazineStore and diffs tasks across ALL projects:
 *        - task added / any field changed / reordered → supabasePushTask (upsert)
 *        - task removed                               → supabaseDeleteTask
 *
 * Tasks are nested content (projects[].tasks[]), flattened into a Map keyed by task id.
 * The content signature covers ALL persisted flat fields, including `order` (so
 * swapTaskOrder reorders push both affected tasks) and the app-level `updatedAt`.
 * Non-UUID seed ids are skipped. swapTaskOrder remains a pure store action — its order
 * changes are picked up here generically, exactly like the other slices' reorders.
 *
 * No echo-loop risk (so no value-dedup map): the Phase 5I read is component-local
 * (MagazineTasks.tsx) and does NOT hydrate the store, so a Supabase write can never
 * bounce back into the store to re-trigger this subscriber.
 *
 * FK magazine_tasks.project_id → projects(id) self-heals after the Phase 4 project push
 * (a 23503 is logged, then succeeds on the next change).
 *
 * Called once from AppShell. No-op when VITE_SUPABASE_URL/ANON_KEY are absent.
 */
import { useEffect } from 'react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import { supabasePushTask, supabaseDeleteTask } from '@/repositories/magazineTasks'
import type { MagazineProject, MagazineTask } from '@/types/magazine'

type FlatTask = { projectId: string; task: MagazineTask }

// Flatten projects[].tasks[] into a map keyed by task id (UUID-guarded).
function flattenTasks(projects: MagazineProject[]): Map<string, FlatTask> {
  const map = new Map<string, FlatTask>()
  for (const p of projects) {
    if (!isValidUUID(p.id)) continue
    for (const t of p.tasks) {
      if (!isValidUUID(t.id)) continue
      map.set(t.id, { projectId: p.id, task: t })
    }
  }
  return map
}

// Content signature — covers every persisted flat field, incl. order and app updatedAt.
function contentSig(t: MagazineTask): string {
  return JSON.stringify({
    title: t.title, description: t.description, status: t.status, priority: t.priority,
    dueDate: t.dueDate, assignedTo: t.assignedTo, section: t.section,
    linkType: t.linkType, linkId: t.linkId, order: t.order,
    updatedAt: t.updatedAt, createdAt: t.createdAt,
  })
}

export function useMagazineTaskSync(): void {
  useEffect(() => {
    // No-op when Supabase is not configured (missing env vars, offline, CI, etc.)
    if (!isSupabaseEnabled) return

    // ── 1. Initial push: every current UUID magazine task → Supabase (upsert) ────
    // FK violations (project row not pushed yet) are expected and logged; self-heal.
    void (async () => {
      for (const { projectId, task } of flattenTasks(useMagazineStore.getState().projects).values()) {
        await supabasePushTask(task, projectId)
      }
    })()

    // ── 2. Subscribe: diff prev vs next; push adds/edits/reorders, delete removals ─
    const unsub = useMagazineStore.subscribe((state, prevState) => {
      if (state.projects === prevState.projects) return  // fast-path

      const prev = flattenTasks(prevState.projects)
      const next = flattenTasks(state.projects)

      // Added or changed (incl. reorder via swapTaskOrder) → upsert
      for (const [id, row] of next) {
        const before = prev.get(id)
        if (!before || contentSig(before.task) !== contentSig(row.task)) {
          void supabasePushTask(row.task, row.projectId)
        }
      }

      // Removed → delete
      for (const id of prev.keys()) {
        if (!next.has(id)) void supabaseDeleteTask(id)
      }
    })

    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
