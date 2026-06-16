/**
 * Supabase Storage helpers for the project-media bucket.
 *
 * All functions are no-ops (return null/false) when Supabase is not
 * configured (i.e. VITE_SUPABASE_URL is absent).  The app falls back
 * to IndexedDB-only mode in that case.
 *
 * Path convention: {projectId}/{localImageId}
 *   - Flat per-project; no entity-type subdirectory.
 *   - Entity context lives in the media metadata table, not in the path.
 *   - Easy to list/delete all files for a project with a single prefix query.
 */
import { supabase } from '@/lib/supabase'

export const MEDIA_BUCKET = 'project-media'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadResult {
  storagePath: string
  publicUrl:   string
  sizeBytes:   number
  mimeType:    string
  filename:    string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Upload a file to project-media.
 *
 * @param file          The File object to upload.
 * @param projectId     The project UUID (used as folder prefix).
 * @param localImageId  The locally-generated UUID that identifies this image
 *                      in Zustand/IndexedDB.  Used as the storage key so the
 *                      metadata table can map it back to a public URL.
 *
 * Returns null if Supabase is not configured or if the upload fails.
 */
export async function uploadMedia(
  file:          File,
  projectId:     string,
  localImageId:  string,
): Promise<UploadResult | null> {
  const client = supabase
  if (!client) return null

  const storagePath = `${projectId}/${localImageId}`

  const { error } = await client.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, file, {
      contentType:  file.type,
      cacheControl: '31536000',  // 1 year — public URLs are immutable per localImageId
      upsert:       true,        // safe to retry if a previous attempt partially failed
    })

  if (error) {
    console.warn('[MediaStorage] upload failed:', localImageId, error.message)
    return null
  }

  const { data: urlData } = client.storage
    .from(MEDIA_BUCKET)
    .getPublicUrl(storagePath)

  return {
    storagePath,
    publicUrl: urlData.publicUrl,
    sizeBytes: file.size,
    mimeType:  file.type,
    filename:  file.name,
  }
}

/**
 * Get the public URL for an existing storage path.
 * Synchronous — derives URL from the bucket path without a network call.
 * Returns null if Supabase is not configured.
 */
export function getMediaPublicUrl(storagePath: string): string | null {
  const client = supabase
  if (!client) return null

  const { data } = client.storage
    .from(MEDIA_BUCKET)
    .getPublicUrl(storagePath)

  return data.publicUrl
}

/**
 * Delete a file from the project-media bucket.
 * Silently no-ops if Supabase is not configured or if the file doesn't exist.
 */
export async function deleteStorageFile(storagePath: string): Promise<void> {
  const client = supabase
  if (!client) return

  const { error } = await client.storage
    .from(MEDIA_BUCKET)
    .remove([storagePath])

  if (error) {
    console.warn('[MediaStorage] delete failed:', storagePath, error.message)
  }
}
