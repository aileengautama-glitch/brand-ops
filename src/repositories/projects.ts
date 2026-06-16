/**
 * Project repository — list, lookup, and Supabase sync helpers.
 *
 * Architecture (Phase A → B):
 *   - IProjectRepository methods (listProjects, getProjectName) read from
 *     Zustand/localStorage — the authoritative source for the UI.
 *   - The supabase* helpers below push/pull to the remote projects table.
 *     They are called by useProjectSync, never by UI components directly.
 *
 * Phase C will migrate IProjectRepository to read from Supabase first.
 */
import { useEventStore } from '@/store/useEventStore'
import { useShootStore } from '@/store/useShootStore'
import { supabase } from '@/lib/supabase'
import type { ProjectRow } from '@/lib/supabase.types'
import type { IProjectRepository, ProjectModule, ProjectSummary } from './_types'

// ─── UUID guard ───────────────────────────────────────────────────────────────
// Old IDs produced by the legacy generateId() (e.g. "lx7k2a-5f9xmq") and
// hardcoded seed IDs ("seed-event-001") are NOT valid UUIDs and will be
// rejected by the Supabase uuid primary key column — skip them silently.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUUID(id: string): boolean {
  return UUID_RE.test(id)
}

// ─── IProjectRepository (UI-facing, Zustand-backed) ──────────────────────────

export const ProjectRepository: IProjectRepository = {
  /**
   * Returns summary records for all projects in the given module.
   * Reads from the Zustand store (localStorage-backed) so it is always fast
   * and works offline.  useProjectSync keeps Zustand in sync with Supabase.
   */
  async listProjects(module: ProjectModule): Promise<ProjectSummary[]> {
    if (module === 'event') {
      return useEventStore.getState().projects.map((p) => ({
        id:          p.id,
        module:      'event' as const,
        name:        p.name,
        description: p.description,
        status:      'active' as const,
        createdAt:   p.createdAt,
        updatedAt:   p.updatedAt,
      }))
    }

    return useShootStore.getState().projects.map((p) => ({
      id:          p.id,
      module:      'shoot' as const,
      name:        p.name,
      description: p.description,
      status:      'active' as const,
      createdAt:   p.createdAt,
      updatedAt:   p.updatedAt,
    }))
  },

  /**
   * Returns the name of a single project, or null if not found.
   * Used by MyTasks and other cross-project views.
   */
  async getProjectName(module: ProjectModule, id: string): Promise<string | null> {
    if (module === 'event') {
      return useEventStore.getState().projects.find((p) => p.id === id)?.name ?? null
    }
    return useShootStore.getState().projects.find((p) => p.id === id)?.name ?? null
  },
}

// ─── Supabase sync helpers (called by useProjectSync only) ───────────────────

/**
 * Fetch all project rows from Supabase.
 * Returns null if Supabase is not configured.
 */
export async function supabaseFetchAllProjects(): Promise<ProjectRow[] | null> {
  const client = supabase
  if (!client) return null
  const { data, error } = await client
    .from('projects')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) {
    console.warn('[ProjectSync] fetch failed:', error.message)
    return null
  }
  return data
}

/**
 * Insert a local project into Supabase.
 * Silently skips if:
 *   - Supabase is not configured
 *   - the project ID is not a valid UUID (old seed / legacy IDs)
 */
export async function supabasePushProject(
  project: { id: string; name: string; description: string; createdAt: string; updatedAt: string },
  module: ProjectModule
): Promise<void> {
  const client = supabase
  if (!client) return
  if (!isValidUUID(project.id)) return

  const { error } = await client.from('projects').upsert(
    {
      id:          project.id,
      module,
      name:        project.name,
      description: project.description,
      status:      'active' as const,
      created_by:  null,
    },
    { onConflict: 'id', ignoreDuplicates: true }
  )
  if (error) console.warn('[ProjectSync] push failed:', project.id, error.message)
}

/**
 * Update a project's name / description in Supabase.
 * Silently skips non-UUID IDs.
 */
export async function supabaseUpdateProject(
  id: string,
  patch: { name?: string; description?: string }
): Promise<void> {
  const client = supabase
  if (!client) return
  if (!isValidUUID(id)) return

  const { error } = await client
    .from('projects')
    .update(patch)
    .eq('id', id)
  if (error) console.warn('[ProjectSync] update failed:', id, error.message)
}

/**
 * Delete a project from Supabase.
 * Silently skips non-UUID IDs.
 */
export async function supabaseDeleteProject(id: string): Promise<void> {
  const client = supabase
  if (!client) return
  if (!isValidUUID(id)) return

  const { error } = await client.from('projects').delete().eq('id', id)
  if (error) console.warn('[ProjectSync] delete failed:', id, error.message)
}
