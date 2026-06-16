/**
 * Deck snapshot repository — read-only deck structure sync.
 *
 * Architecture (Phase E1):
 *   - deck_snapshots holds one JSONB row per project: the deck-visible slice
 *     of the project structure, shaped to mirror the project's own field names.
 *   - Written one-directionally (local → remote) by useDeckSnapshotSync.
 *   - Read by useRemoteDeckSnapshot on /share/* routes for cold-load rendering.
 *
 * The payload type is EventDeckData | ShootDeckData (see lib/deckSnapshot.ts).
 * It is stored/loaded as opaque JSON here; the share route casts it to the
 * right deck-data type based on the row's `module`.
 */
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { Json, ProjectModule } from '@/lib/supabase.types'

export interface RemoteDeckSnapshot {
  module:  ProjectModule
  name:    string
  payload: Json
}

/**
 * Upsert a project's deck snapshot.
 * Silently no-ops if Supabase is not configured or projectId is not a UUID.
 */
export async function supabasePublishDeckSnapshot(
  projectId: string,
  module:    ProjectModule,
  name:      string,
  payload:   Json,
): Promise<void> {
  const client = supabase
  if (!client) return
  if (!isValidUUID(projectId)) return

  const { error } = await client.from('deck_snapshots').upsert(
    {
      project_id: projectId,
      module,
      name,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'project_id', ignoreDuplicates: false },
  )

  if (error) console.warn('[DeckSnapshot] publish failed:', projectId, error.message)
}

/**
 * Fetch a project's deck snapshot for read-only share rendering.
 * Returns null if Supabase is not configured, the id is invalid, or no row exists.
 */
export async function supabaseFetchDeckSnapshot(
  projectId: string,
): Promise<RemoteDeckSnapshot | null> {
  const client = supabase
  if (!client) return null
  if (!isValidUUID(projectId)) return null

  const { data, error } = await client
    .from('deck_snapshots')
    .select('module, name, payload')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) {
    console.warn('[DeckSnapshot] fetch failed:', projectId, error.message)
    return null
  }
  if (!data) return null

  return { module: data.module, name: data.name, payload: data.payload }
}
