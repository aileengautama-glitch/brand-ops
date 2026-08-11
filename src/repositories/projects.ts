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
 * Result of a write the UI is allowed to care about.
 * `skipped` = there was nothing to do (no backend configured, non-UUID legacy id),
 * which is NOT a failure and must not be reported as one.
 */
export type WriteResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; reason: 'auth' | 'denied' | 'unreachable' | 'server' | 'unknown'; message: string }

/** Turn a Supabase/PostgREST error into something a person can act on. */
export function describeWriteError(err: unknown): Extract<WriteResult, { ok: false }> {
  const e = err as { code?: string; message?: string; status?: number } | null
  const code = e?.code ?? ''
  const status = e?.status ?? 0
  const raw = e?.message ?? 'Unknown error'

  // Thrown fetch (never reached the server).
  if (err instanceof TypeError || /fetch|network|Failed to fetch/i.test(raw)) {
    return { ok: false, reason: 'unreachable', message: 'Could not reach the server. Check your connection.' }
  }
  if (status === 401 || code === 'PGRST301') {
    return { ok: false, reason: 'auth', message: 'Your session is not valid. Sign in again and retry.' }
  }
  // 42501 is Postgres "insufficient privilege" — what an RLS WITH CHECK failure raises.
  if (status === 403 || code === '42501') {
    return { ok: false, reason: 'denied', message: 'You do not have permission to do that on the server.' }
  }
  if (status >= 500) {
    return { ok: false, reason: 'server', message: `Server error: ${raw}` }
  }
  return { ok: false, reason: 'unknown', message: raw }
}

/**
 * Create a project on the server and return the stored row.
 *
 * Unlike the fire-and-forget push below, this is the path the create UI awaits: it
 * does a real INSERT and reads the row back, so "the project exists on the server"
 * is confirmed rather than assumed. Reading back also proves the creator can see
 * their own project (migration 0022 grants them access on insert).
 */
export async function supabaseCreateProject(
  project: { id: string; name: string; description: string },
  module: ProjectModule
): Promise<WriteResult> {
  const client = supabase
  if (!client) return { ok: true, skipped: true }
  if (!isValidUUID(project.id)) return { ok: true, skipped: true }

  try {
    const { data, error } = await client
      .from('projects')
      .insert({
        id:          project.id,
        module,
        name:        project.name,
        description: project.description,
        status:      'active' as const,
        created_by:  null,
      })
      .select('id, module, name, description, status')
      .single()

    if (error) return describeWriteError(error)
    if (!data) {
      // Inserted but not readable back — the creator has no grant on it.
      return {
        ok: false,
        reason: 'denied',
        message: 'The project was written but you cannot read it back. Apply migration 0022 so creators get access.',
      }
    }
    return { ok: true }
  } catch (err) {
    return describeWriteError(err)
  }
}

/**
 * Insert a local project into Supabase (background reconcile path).
 * Skips when Supabase is not configured or the ID is a legacy non-UUID.
 * Returns a result so callers can surface failures; the sync loop logs them.
 */
export async function supabasePushProject(
  project: { id: string; name: string; description: string; createdAt: string; updatedAt: string },
  module: ProjectModule
): Promise<WriteResult> {
  const client = supabase
  if (!client) return { ok: true, skipped: true }
  if (!isValidUUID(project.id)) return { ok: true, skipped: true }

  try {
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
    if (error) {
      console.warn('[ProjectSync] push failed:', project.id, error.message)
      return describeWriteError(error)
    }
    return { ok: true }
  } catch (err) {
    const res = describeWriteError(err)
    console.warn('[ProjectSync] push failed:', project.id, res.message)
    return res
  }
}

/**
 * Update a project's name / description in Supabase.
 * Silently skips non-UUID IDs.
 */
export async function supabaseUpdateProject(
  id: string,
  patch: { name?: string; description?: string }
): Promise<WriteResult> {
  const client = supabase
  if (!client) return { ok: true, skipped: true }
  if (!isValidUUID(id)) return { ok: true, skipped: true }

  try {
    const { error } = await client
      .from('projects')
      .update(patch)
      .eq('id', id)
    if (error) {
      console.warn('[ProjectSync] update failed:', id, error.message)
      return describeWriteError(error)
    }
    return { ok: true }
  } catch (err) {
    const res = describeWriteError(err)
    console.warn('[ProjectSync] update failed:', id, res.message)
    return res
  }
}

/**
 * Delete a project from Supabase.
 * Silently skips non-UUID IDs.
 */
export async function supabaseDeleteProject(id: string): Promise<WriteResult> {
  const client = supabase
  if (!client) return { ok: true, skipped: true }
  if (!isValidUUID(id)) return { ok: true, skipped: true }

  try {
    const { error } = await client.from('projects').delete().eq('id', id)
    if (error) {
      console.warn('[ProjectSync] delete failed:', id, error.message)
      return describeWriteError(error)
    }
    return { ok: true }
  } catch (err) {
    const res = describeWriteError(err)
    console.warn('[ProjectSync] delete failed:', id, res.message)
    return res
  }
}
