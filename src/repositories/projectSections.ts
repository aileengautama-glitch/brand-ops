/**
 * Project sections repository — bidirectional array-slice sync (Phase E3).
 *
 *   - project_sections holds one JSONB row per (project, section): an editable
 *     array slice (shot list, schedules, milestones, D-Day).
 *   - Read on load + realtime by useProjectSectionsSync; written (debounced) on
 *     local edits.
 *
 * content shape is { items: [...] } (see lib/projectSections.ts); stored as
 * opaque JSON here.  Push returns success so failed writes can retry.
 */
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { Json, ProjectSectionRow } from '@/lib/supabase.types'

/**
 * Upsert one (project, section) row.
 * Returns true only on a confirmed write so the caller can mark it synced and
 * let failed pushes retry on the next edit.
 */
export async function supabasePushProjectSection(
  projectId: string,
  section:   string,
  module:    'event' | 'shoot',
  content:   Json,
): Promise<boolean> {
  const client = supabase
  if (!client) return false
  if (!isValidUUID(projectId)) return false

  const { error } = await client.from('project_sections').upsert(
    {
      project_id: projectId,
      section,
      module,
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'project_id,section', ignoreDuplicates: false },
  )

  if (error) {
    console.warn('[ProjectSections] push failed:', projectId, section, error.message)
    return false
  }
  return true
}

/**
 * Fetch all section rows for a set of projects (batch, used on mount).
 * Returns null if Supabase is not configured.
 */
export async function supabaseFetchProjectSections(
  projectIds: string[],
): Promise<ProjectSectionRow[] | null> {
  const client = supabase
  if (!client) return null

  const validIds = projectIds.filter(isValidUUID)
  if (validIds.length === 0) return null

  const { data, error } = await client
    .from('project_sections')
    .select('project_id, section, module, content, updated_at')
    .in('project_id', validIds)

  if (error) {
    console.warn('[ProjectSections] fetch failed:', error.message)
    return null
  }
  return data as ProjectSectionRow[]
}
