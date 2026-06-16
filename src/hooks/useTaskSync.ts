/**
 * useTaskSync — global task sync hook (called once from AppShell).
 *
 * Strategy (Phase C):
 *   1. On mount: for every project with a valid UUID in both stores,
 *      pull remote tasks → upsert into Zustand.
 *   2. Push local tasks with valid UUIDs up to Supabase (initial push only).
 *   3. Zustand subscription: detect add / update / remove at the task level
 *      across all projects → push delta to Supabase.
 *   4. Supabase Realtime: listen to ALL inserts/updates/deletes on the tasks
 *      table and apply them into Zustand.
 *
 * Echo-loop prevention:
 *   Remote changes are written into `inFlightRemoteTaskIds` before touching
 *   Zustand.  The Zustand subscriber skips any task whose id is in that set.
 *   The id is removed on the next microtask tick so the window is minimal.
 */
import { useEffect } from 'react'
import { useEventStore } from '@/store/useEventStore'
import { useShootStore } from '@/store/useShootStore'
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import {
  supabaseFetchTasks,
  supabasePushTask,
  supabaseUpdateTask,
  supabaseDeleteTask,
  taskRowToLocal,
} from '@/repositories/tasks'
import type { Task } from '@/types/common'
import type { TaskRow } from '@/lib/supabase.types'

// ─── Echo-loop prevention ─────────────────────────────────────────────────────

const inFlightRemoteTaskIds = new Set<string>()

function markRemoteTask(id: string) {
  inFlightRemoteTaskIds.add(id)
  setTimeout(() => inFlightRemoteTaskIds.delete(id), 0)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTaskSync() {
  useEffect(() => {
    const client = supabase
    if (!client) return

    // ── 1. Collect all project IDs with valid UUIDs ───────────────────────────
    const eventProjects  = useEventStore.getState().projects.filter((p) => isValidUUID(p.id))
    const shootProjects  = useShootStore.getState().projects.filter((p) => isValidUUID(p.id))

    // ── 2. Initial fetch: remote → Zustand ────────────────────────────────────
    for (const project of eventProjects) {
      supabaseFetchTasks(project.id).then((rows) => {
        if (!rows) return
        rows.forEach((row) => {
          markRemoteTask(row.id)
          useEventStore.getState().upsertTask(project.id, taskRowToLocal(row))
        })
      })
    }
    for (const project of shootProjects) {
      supabaseFetchTasks(project.id).then((rows) => {
        if (!rows) return
        rows.forEach((row) => {
          markRemoteTask(row.id)
          useShootStore.getState().upsertTask(project.id, taskRowToLocal(row))
        })
      })
    }

    // ── 3. Initial push: local → Supabase (tasks not yet in DB) ───────────────
    for (const project of eventProjects) {
      project.tasks
        .filter((t) => isValidUUID(t.id))
        .forEach((t) => supabasePushTask(t, project.id))
    }
    for (const project of shootProjects) {
      project.tasks
        .filter((t) => isValidUUID(t.id))
        .forEach((t) => supabasePushTask(t, project.id))
    }

    // ── 4. Zustand subscribe: local mutations → Supabase ─────────────────────

    /** Diff two task arrays and return { added, updated, removed }. */
    function diffTasks(next: Task[], prev: Task[]) {
      const prevMap = new Map(prev.map((t) => [t.id, t]))
      const nextIds = new Set(next.map((t) => t.id))
      const added:   Task[] = []
      const updated: Task[] = []
      const removed: Task[] = []

      for (const t of next) {
        if (!prevMap.has(t.id)) {
          added.push(t)
        } else {
          const p = prevMap.get(t.id)!
          if (
            t.title       !== p.title       ||
            t.description !== p.description ||
            t.status      !== p.status      ||
            t.priority    !== p.priority    ||
            t.dueDate     !== p.dueDate     ||
            t.assignedTo  !== p.assignedTo
          ) {
            updated.push(t)
          }
        }
      }

      for (const t of prev) {
        if (!nextIds.has(t.id)) removed.push(t)
      }

      return { added, updated, removed }
    }

    const unsubEvent = useEventStore.subscribe((state, prevState) => {
      for (const project of state.projects) {
        if (!isValidUUID(project.id)) continue
        const prevProject = prevState.projects.find((p) => p.id === project.id)
        if (!prevProject) continue

        const { added, updated, removed } = diffTasks(project.tasks, prevProject.tasks)

        added
          .filter((t) => isValidUUID(t.id) && !inFlightRemoteTaskIds.has(t.id))
          .forEach((t) => supabasePushTask(t, project.id))

        updated
          .filter((t) => isValidUUID(t.id) && !inFlightRemoteTaskIds.has(t.id))
          .forEach((t) => supabaseUpdateTask(t.id, t))

        removed
          .filter((t) => isValidUUID(t.id) && !inFlightRemoteTaskIds.has(t.id))
          .forEach((t) => supabaseDeleteTask(t.id))
      }
    })

    const unsubShoot = useShootStore.subscribe((state, prevState) => {
      for (const project of state.projects) {
        if (!isValidUUID(project.id)) continue
        const prevProject = prevState.projects.find((p) => p.id === project.id)
        if (!prevProject) continue

        const { added, updated, removed } = diffTasks(project.tasks, prevProject.tasks)

        added
          .filter((t) => isValidUUID(t.id) && !inFlightRemoteTaskIds.has(t.id))
          .forEach((t) => supabasePushTask(t, project.id))

        updated
          .filter((t) => isValidUUID(t.id) && !inFlightRemoteTaskIds.has(t.id))
          .forEach((t) => supabaseUpdateTask(t.id, t))

        removed
          .filter((t) => isValidUUID(t.id) && !inFlightRemoteTaskIds.has(t.id))
          .forEach((t) => supabaseDeleteTask(t.id))
      }
    })

    // ── 5. Realtime: remote mutations → Zustand ───────────────────────────────

    const channel = client
      .channel('brand-ops-tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as TaskRow
            if (!isValidUUID(row.id) || !isValidUUID(row.project_id)) return

            markRemoteTask(row.id)
            const local = taskRowToLocal(row)

            // Route to the correct store based on which project owns this task
            const eventProject = useEventStore.getState().projects.find(
              (p) => p.id === row.project_id
            )
            if (eventProject) {
              useEventStore.getState().upsertTask(row.project_id, local)
              return
            }
            const shootProject = useShootStore.getState().projects.find(
              (p) => p.id === row.project_id
            )
            if (shootProject) {
              useShootStore.getState().upsertTask(row.project_id, local)
            }
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old as { id?: string; project_id?: string }
            if (!row.id || !isValidUUID(row.id)) return

            markRemoteTask(row.id)
            // Remove from whichever store contains this task
            for (const p of useEventStore.getState().projects) {
              if (p.tasks.some((t) => t.id === row.id)) {
                useEventStore.getState().removeTask(p.id, row.id)
                return
              }
            }
            for (const p of useShootStore.getState().projects) {
              if (p.tasks.some((t) => t.id === row.id)) {
                useShootStore.getState().removeTask(p.id, row.id)
                return
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      unsubEvent()
      unsubShoot()
      client.removeChannel(channel)
    }
  }, [])
}
