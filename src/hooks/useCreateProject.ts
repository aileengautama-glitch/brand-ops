/**
 * useCreateProject — create a project and only keep it if the server agreed.
 *
 * The rest of the app is deliberately local-first: you can edit offline and it
 * syncs later. Creation is the one place that can't work that way, because a
 * project the server never accepted becomes a phantom that every later write
 * hangs off (its tasks, gates and approvals all fail their foreign key forever).
 *
 * So: write locally for instant feedback, confirm with the server, and roll the
 * local row back if the server refused. When no backend is configured at all
 * (local dev), creation stays purely local and always succeeds.
 */
import { useCallback, useState } from 'react'
import { useShootStore } from '@/store/useShootStore'
import { useEventStore } from '@/store/useEventStore'
import { supabaseCreateProject } from '@/repositories/projects'
import { isSupabaseEnabled } from '@/lib/supabase'

export type CreateModule = 'shoot' | 'event'

export function useCreateProject(module: CreateModule) {
  const addShoot = useShootStore((s) => s.addProject)
  const removeShoot = useShootStore((s) => s.removeProject)
  const addEvent = useEventStore((s) => s.addProject)
  const removeEvent = useEventStore((s) => s.removeProject)

  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  /** Returns the created project id, or null when creation failed. */
  const create = useCallback(
    async (name: string, description: string): Promise<string | null> => {
      setCreating(true)
      setError(null)

      const project = module === 'shoot' ? addShoot(name, description) : addEvent(name, description)

      // No backend configured — local-only mode, nothing to confirm.
      if (!isSupabaseEnabled) {
        setCreating(false)
        return project.id
      }

      const res = await supabaseCreateProject(
        { id: project.id, name: project.name, description: project.description },
        module,
      )

      if (!res.ok) {
        // Roll back the optimistic row so the list never shows a project the
        // server rejected.
        if (module === 'shoot') removeShoot(project.id)
        else removeEvent(project.id)
        setError(res.message)
        setCreating(false)
        return null
      }

      setCreating(false)
      return project.id
    },
    [module, addShoot, removeShoot, addEvent, removeEvent],
  )

  return { create, creating, error, clearError }
}
