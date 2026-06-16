/**
 * useImageStorage / useStoredImage — image persistence hooks.
 *
 * Phase A-C:  Images saved to IndexedDB only.
 * Phase D+:   Dual-write — IndexedDB for immediate availability +
 *             Supabase Storage in the background for team-wide sync.
 *
 * --- Dual-write strategy ---
 * save(file, context?) behaves identically to before: returns a local UUID
 * immediately.  If a MediaContext is supplied (projectId + entityType +
 * entityId), a background upload to Supabase Storage is triggered and the
 * resulting public URL is written into the module-level supabaseUrlCache.
 *
 * Call sites that don't pass context (all surfaces except wired ones) keep
 * working unchanged with IndexedDB only.
 *
 * --- URL resolution order ---
 * useStoredImage(imageId) checks in this order:
 *   1. supabaseUrlCache (populated on app load by useMediaSync, and after
 *      each background upload)
 *   2. IndexedDB blob URL (existing behaviour — fallback / offline)
 *
 * This ensures components always show something immediately (local blob),
 * and upgrade transparently to the stable Supabase URL once available.
 */
import { useCallback, useEffect, useState } from 'react'
import { saveImage, getImageUrl, deleteImage } from '@/lib/db'
import { generateId } from '@/lib/utils'
import { isValidUUID } from '@/repositories/projects'
import { uploadMedia } from '@/lib/supabase-storage'
import { supabasePushMedia } from '@/repositories/media'
import type { MediaEntityType } from '@/lib/mediaEntityTypes'

// ─── Module-level URL cache ───────────────────────────────────────────────────
// Maps localImageId → Supabase public URL.
// Populated by:
//   - useMediaSync  (on app load, from the media metadata table)
//   - save()        (after each successful background upload)

const supabaseUrlCache = new Map<string, string>()

/** Register a Supabase public URL for a local imageId. */
export function cacheMediaUrl(localImageId: string, publicUrl: string): void {
  supabaseUrlCache.set(localImageId, publicUrl)
}

/** Look up a cached Supabase URL; returns null if not yet uploaded. */
export function getCachedMediaUrl(localImageId: string): string | null {
  return supabaseUrlCache.get(localImageId) ?? null
}

// ─── Context type ─────────────────────────────────────────────────────────────

/**
 * Optional context passed to save() to enable Supabase background upload.
 * Without this, save() only writes to IndexedDB (Phase A-C behaviour).
 */
export interface MediaContext {
  /** UUID of the owning project.  Must be a valid UUID to trigger upload. */
  projectId:  string
  /** Entity type label stored in the media metadata table. */
  entityType: MediaEntityType
  /**
   * Local ID of the owning entity (MoodboardItem.id, Shot.id, etc.).
   * Can be '' in Phase D1 where entity IDs aren't threaded yet.
   */
  entityId:   string
}

/**
 * Build a MediaContext, or undefined when the project isn't a real UUID
 * (seed/legacy projects, or no project yet).  Passing undefined to save()
 * keeps the IndexedDB-only path — exactly the fallback the UI expects.
 *
 * Centralises the `isValidUUID(projectId) ? {...} : undefined` guard that
 * every media-enabled surface would otherwise repeat inline.
 */
export function buildMediaContext(
  projectId:  string | undefined,
  entityType: MediaEntityType,
  entityId:   string,
): MediaContext | undefined {
  if (!projectId || !isValidUUID(projectId)) return undefined
  return { projectId, entityType, entityId }
}

// ─── useImageStorage ─────────────────────────────────────────────────────────

export function useImageStorage() {
  /**
   * Save a file.  Always writes to IndexedDB immediately.
   * If context is provided and projectId is a valid UUID, also
   * background-uploads to Supabase Storage and caches the public URL.
   *
   * Returns the locally-generated UUID (imageId) — identical API to Phase A-C.
   */
  const save = useCallback(async (file: File, context?: MediaContext): Promise<string> => {
    // 1. Write to IndexedDB immediately so the image renders without latency.
    const id = generateId()
    await saveImage(id, file)

    // 2. Background upload to Supabase Storage (non-blocking).
    if (context && isValidUUID(context.projectId)) {
      uploadMedia(file, context.projectId, id).then((result) => {
        if (!result) return
        // Cache the URL so useStoredImage immediately picks it up on next render.
        cacheMediaUrl(id, result.publicUrl)
        // Write metadata row so useMediaSync can hydrate other devices.
        supabasePushMedia({
          localImageId: id,
          projectId:    context.projectId,
          entityType:   context.entityType,
          entityId:     context.entityId,
          storagePath:  result.storagePath,
          publicUrl:    result.publicUrl,
          filename:     result.filename,
          mimeType:     result.mimeType,
          sizeBytes:    result.sizeBytes,
          caption:      '',
          sortOrder:    0,
        })
      })
    }

    return id
  }, [])

  const load = useCallback(async (id: string): Promise<string | null> => {
    // Check Supabase cache first; fall back to IndexedDB blob URL.
    return getCachedMediaUrl(id) ?? getImageUrl(id)
  }, [])

  const remove = useCallback(async (id: string): Promise<void> => {
    await deleteImage(id)
    // Note: Supabase Storage deletion is handled separately by supabaseDeleteMedia()
    // when the parent entity is removed.  The cache entry stays until page reload
    // but the underlying Storage file will 404; components show the IndexedDB fallback.
  }, [])

  return { save, load, remove }
}

// ─── useStoredImage ───────────────────────────────────────────────────────────
// Returns a display URL for a stored image.  Checks the Supabase URL cache
// first (stable public URL), then falls back to an IndexedDB blob URL.
// Revokes blob URLs on unmount to avoid memory leaks.

export function useStoredImage(imageId: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    // Synchronous initial state — avoids a flash of null on first render
    // if the Supabase URL is already cached (e.g. from a previous load).
    if (imageId) return supabaseUrlCache.get(imageId) ?? null
    return null
  })

  useEffect(() => {
    if (!imageId) {
      setUrl(null)
      return
    }

    // 1. Check Supabase cache synchronously.
    const cached = supabaseUrlCache.get(imageId)
    if (cached) {
      setUrl(cached)
      return  // Stable public URL — no cleanup needed.
    }

    // 2. Fall back to IndexedDB blob URL (async).
    let cancelled = false
    getImageUrl(imageId).then((objectUrl) => {
      if (cancelled) return
      // Re-check cache: it may have been populated while IndexedDB was loading.
      const lateCached = supabaseUrlCache.get(imageId)
      setUrl(lateCached ?? objectUrl)
    })

    return () => {
      cancelled = true
      // Revoke previous blob URL to prevent memory leaks.
      // URL.revokeObjectURL is a no-op for http/https URLs, so this is
      // safe to call regardless of whether the URL is a blob or Supabase URL.
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [imageId])

  return url
}
