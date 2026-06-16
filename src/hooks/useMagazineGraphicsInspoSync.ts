/**
 * useMagazineGraphicsInspoSync — Phase 5K write-path: local → Supabase for the magazine
 * graphics inspiration board.
 *
 * Dual-write: the local Zustand store stays authoritative; every inspo-tile change is
 * mirrored to the magazine_graphics_inspo table best-effort (errors logged, never thrown,
 * never rolled back). Mirrors useMagazineMoodTileSync.
 *
 * What it does:
 *   1. On mount: pushes every current UUID inspo tile (upsert — safe to re-run).
 *   2. Subscribes to useMagazineStore and diffs inspo tiles across ALL projects:
 *        - tile added / any field changed → supabasePushGraphicsInspo (upsert)
 *        - tile removed                   → supabaseDeleteGraphicsInspo
 *
 * Inspo tiles are nested content (projects[].graphicsInspo[]), flattened into a Map
 * keyed by tile id. The content signature covers ALL persisted fields, including `order`
 * (which persists as created/edited — there is no reorder action for this entity).
 * Non-UUID seed ids are skipped.
 *
 * IMAGE BOUNDARY: only the soft image-id reference travels through here. Image bytes are
 * never read or written — they stay in IndexedDB / the media table.
 *
 * No echo-loop risk (so no value-dedup map): the Phase 5K read is component-local
 * (MagazineGraphics.tsx) and does NOT hydrate the store, so a Supabase write can never
 * bounce back into the store to re-trigger this subscriber.
 *
 * FK magazine_graphics_inspo.project_id → projects(id) self-heals after the Phase 4
 * project push (a 23503 is logged, then succeeds on the next change).
 *
 * Called once from AppShell. No-op when VITE_SUPABASE_URL/ANON_KEY are absent.
 */
import { useEffect } from 'react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import { supabasePushGraphicsInspo, supabaseDeleteGraphicsInspo } from '@/repositories/magazineGraphicsInspo'
import type { MagazineProject, GraphicsInspoItem } from '@/types/magazine'

type FlatInspo = { projectId: string; item: GraphicsInspoItem }

// Flatten projects[].graphicsInspo[] into a map keyed by tile id (UUID-guarded).
function flattenInspo(projects: MagazineProject[]): Map<string, FlatInspo> {
  const map = new Map<string, FlatInspo>()
  for (const p of projects) {
    if (!isValidUUID(p.id)) continue
    for (const item of p.graphicsInspo) {
      if (!isValidUUID(item.id)) continue
      map.set(item.id, { projectId: p.id, item })
    }
  }
  return map
}

// Content signature — covers every persisted field, incl. order.
function contentSig(i: GraphicsInspoItem): string {
  return JSON.stringify({
    imageId: i.imageId, caption: i.caption, sourceUrl: i.sourceUrl, order: i.order, createdAt: i.createdAt,
  })
}

export function useMagazineGraphicsInspoSync(): void {
  useEffect(() => {
    // No-op when Supabase is not configured (missing env vars, offline, CI, etc.)
    if (!isSupabaseEnabled) return

    // ── 1. Initial push: every current UUID inspo tile → Supabase (upsert) ───────
    // FK violations (project row not pushed yet) are expected and logged; self-heal.
    void (async () => {
      for (const { projectId, item } of flattenInspo(useMagazineStore.getState().projects).values()) {
        await supabasePushGraphicsInspo(item, projectId)
      }
    })()

    // ── 2. Subscribe: diff prev vs next; push adds/edits, delete removals ────────
    const unsub = useMagazineStore.subscribe((state, prevState) => {
      if (state.projects === prevState.projects) return  // fast-path

      const prev = flattenInspo(prevState.projects)
      const next = flattenInspo(state.projects)

      // Added or changed → upsert
      for (const [id, row] of next) {
        const before = prev.get(id)
        if (!before || contentSig(before.item) !== contentSig(row.item)) {
          void supabasePushGraphicsInspo(row.item, row.projectId)
        }
      }

      // Removed → delete
      for (const id of prev.keys()) {
        if (!next.has(id)) void supabaseDeleteGraphicsInspo(id)
      }
    })

    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
