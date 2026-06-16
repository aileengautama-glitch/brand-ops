/**
 * Media URL cache hydration hooks.
 *
 * Two entry points share one core (`hydrateMediaForProjects`):
 *
 *   - useMediaSync()            — mounted once in AppShell.  Hydrates media
 *                                 for every project currently in the stores.
 *   - useEnsureProjectMedia(id) — for routes that mount OUTSIDE AppShell
 *                                 (e.g. /share/* deck views under ShareShell).
 *                                 Hydrates a single explicit project so those
 *                                 routes don't depend on AppShell having run.
 *
 * Media rows are immutable after upload (the public URL never changes), so a
 * single fetch is sufficient — no Realtime subscription needed.  New uploads
 * on the same device are cached immediately by useImageStorage.save().
 *
 * NOTE (structural sync caveat): these hooks only hydrate the media URL cache.
 * The deck/share pages read project *structure* (moodboard items, shots,
 * models, their imageIds + order) from the Zustand stores, which are
 * localStorage-only.  On a truly fresh device with empty localStorage the
 * share page has no project to render and bails early — media hydration cannot
 * fix that.  Full cross-device cold-load requires a separate project-structure
 * sync layer (not built).  Same-browser loads (structure present, media cache
 * cold or IndexedDB evicted) are fully fixed by these hooks.
 */
import { useEffect } from 'react'
import { useEventStore } from '@/store/useEventStore'
import { useShootStore } from '@/store/useShootStore'
import { isValidUUID } from '@/repositories/projects'
import { supabaseFetchMediaForProjects } from '@/repositories/media'
import { cacheMediaUrl } from '@/hooks/useImageStorage'

// ─── Shared core ──────────────────────────────────────────────────────────────

/** Fetch media rows for the given projects and populate the URL cache. */
async function hydrateMediaForProjects(projectIds: string[]): Promise<void> {
  const validIds = projectIds.filter(isValidUUID)
  if (validIds.length === 0) return

  const rows = await supabaseFetchMediaForProjects(validIds)
  if (!rows) return

  rows.forEach((row) => cacheMediaUrl(row.local_image_id, row.public_url))
  if (rows.length > 0) {
    console.debug(`[MediaSync] cached ${rows.length} media URLs`)
  }
}

// ─── AppShell hook ────────────────────────────────────────────────────────────

/**
 * Hydrate the media URL cache for ALL projects currently in the stores.
 * Mounted once in AppShell.
 */
export function useMediaSync(): void {
  useEffect(() => {
    const projectIds = [
      ...useEventStore.getState().projects.map((p) => p.id),
      ...useShootStore.getState().projects.map((p) => p.id),
    ]
    void hydrateMediaForProjects(projectIds)
  }, [])
}

// ─── Share-route hook ─────────────────────────────────────────────────────────

/**
 * Hydrate the media URL cache for a SINGLE project.
 * For read-only routes that mount outside AppShell (share/deck views) so they
 * resolve Supabase-backed images without depending on useMediaSync().
 *
 * Safe to call before any early return — it no-ops when projectId is missing
 * or not a UUID, so it satisfies the Rules of Hooks without extra guards.
 */
export function useEnsureProjectMedia(projectId: string | undefined): void {
  useEffect(() => {
    if (!projectId) return
    void hydrateMediaForProjects([projectId])
  }, [projectId])
}
