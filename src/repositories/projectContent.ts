/**
 * Project content repository — bidirectional editable-text sync.
 *
 * Phase E2:
 *   - project_content holds one JSONB row per project: the editable text slice
 *     (shoot briefDetails+shootBrief; event metadata).
 *   - Read on load + realtime by useProjectContentSync; written (debounced) on
 *     local edits.
 *
 * Payload is EventContent | ShootContent (see lib/projectContent.ts), stored as
 * opaque JSON here; the sync hook casts it per the row's `module`.
 */
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { Json, ProjectContentRow } from '@/lib/supabase.types'

/**
 * Upsert a project's content row.
 * Returns true only on a confirmed write — so the caller can mark the value as
 * synced and let failed pushes retry on the next edit.
 */
export async function supabasePushProjectContent(
  projectId: string,
  module:    'event' | 'shoot',
  content:   Json,
): Promise<boolean> {
  const client = supabase
  if (!client) return false
  if (!isValidUUID(projectId)) return false

  const { error } = await client.from('project_content').upsert(
    {
      project_id: projectId,
      module,
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'project_id', ignoreDuplicates: false },
  )

  if (error) {
    console.warn('[ProjectContent] push failed:', projectId, error.message)
    return false
  }
  return true
}

/**
 * Fetch content rows for a set of projects (batch, used on mount).
 * Returns null if Supabase is not configured.
 */
export async function supabaseFetchProjectContent(
  projectIds: string[],
): Promise<ProjectContentRow[] | null> {
  const client = supabase
  if (!client) return null

  const validIds = projectIds.filter(isValidUUID)
  if (validIds.length === 0) return null

  const { data, error } = await client
    .from('project_content')
    .select('project_id, module, content, updated_at')
    .in('project_id', validIds)

  if (error) {
    console.warn('[ProjectContent] fetch failed:', error.message)
    return null
  }
  return data as ProjectContentRow[]
}
