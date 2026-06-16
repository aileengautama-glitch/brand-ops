/**
 * Media repository — metadata CRUD for uploaded project files.
 *
 * Architecture (Phase D):
 *   - The media table bridges local IndexedDB imageId strings to
 *     Supabase Storage public URLs.
 *   - One row per uploaded file; keyed by local_image_id (UNIQUE).
 *   - Called by useImageStorage (after upload) and useMediaSync (on load).
 *
 * Data-shape notes:
 *   - local_image_id: the UUID generated client-side and stored in Zustand.
 *   - storage_path:   {projectId}/{localImageId} — no file extension.
 *   - public_url:     stable forever for public buckets (no signed-URL expiry).
 *   - entity_id:      '' in Phase D1; populated in D2+ as surfaces are migrated.
 */
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import { deleteStorageFile } from '@/lib/supabase-storage'
import type { MediaRow } from '@/lib/supabase.types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PushMediaData {
  localImageId: string
  projectId:    string
  entityType:   string   // 'moodboard_item' | 'reference_image' | etc.
  entityId:     string   // owning entity's local ID; '' for Phase D1
  storagePath:  string
  publicUrl:    string
  filename:     string
  mimeType:     string
  sizeBytes:    number
  caption:      string   // '' for entity types without per-image captions
  sortOrder:    number   // 0 for Phase D1; sync'd in D2+
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

/**
 * Upsert a media metadata row after a successful Storage upload.
 * Silently skips if Supabase is not configured or projectId is not a UUID.
 */
export async function supabasePushMedia(data: PushMediaData): Promise<void> {
  const client = supabase
  if (!client) return
  if (!isValidUUID(data.projectId)) return

  const { error } = await client.from('media').upsert(
    {
      local_image_id: data.localImageId,
      project_id:     data.projectId,
      entity_type:    data.entityType,
      entity_id:      data.entityId,
      storage_path:   data.storagePath,
      public_url:     data.publicUrl,
      filename:       data.filename,
      mime_type:      data.mimeType,
      size_bytes:     data.sizeBytes,
      caption:        data.caption,
      sort_order:     data.sortOrder,
      created_by:     null,              // Phase E: Supabase auth UUID
    },
    { onConflict: 'local_image_id', ignoreDuplicates: false }
  )

  if (error) console.warn('[MediaRepo] push failed:', data.localImageId, error.message)
}

/**
 * Fetch all media metadata rows for a set of project IDs.
 * Used by useMediaSync to pre-populate the URL cache on app load.
 * Returns null if Supabase is not configured.
 */
export async function supabaseFetchMediaForProjects(
  projectIds: string[]
): Promise<MediaRow[] | null> {
  const client = supabase
  if (!client) return null

  const validIds = projectIds.filter(isValidUUID)
  if (validIds.length === 0) return null

  const { data, error } = await client
    .from('media')
    .select('id, local_image_id, project_id, entity_type, entity_id, storage_path, public_url, caption, sort_order, created_at')
    .in('project_id', validIds)
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[MediaRepo] fetch failed:', error.message)
    return null
  }

  return data as MediaRow[]
}

/**
 * Delete a media metadata row and its corresponding Storage file.
 * Silently skips if localImageId is not in the DB or Supabase is not configured.
 */
export async function supabaseDeleteMedia(
  localImageId: string,
  storagePath:  string,
): Promise<void> {
  const client = supabase
  if (!client) return

  // Delete Storage file first (best-effort; metadata row still cleaned up)
  await deleteStorageFile(storagePath)

  const { error } = await client
    .from('media')
    .delete()
    .eq('local_image_id', localImageId)

  if (error) console.warn('[MediaRepo] delete failed:', localImageId, error.message)
}

/**
 * Look up a single media row by its local_image_id.
 * Used to find the storage_path needed for deletion when only the imageId is known.
 */
export async function supabaseFindMediaByLocalId(
  localImageId: string
): Promise<Pick<MediaRow, 'local_image_id' | 'storage_path' | 'public_url'> | null> {
  const client = supabase
  if (!client) return null

  const { data, error } = await client
    .from('media')
    .select('local_image_id, storage_path, public_url')
    .eq('local_image_id', localImageId)
    .maybeSingle()

  if (error) {
    console.warn('[MediaRepo] find failed:', localImageId, error.message)
    return null
  }

  return data
}
