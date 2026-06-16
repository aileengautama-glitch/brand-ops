/**
 * useMagazineMoodTileSync — Phase 5J write-path: local → Supabase for magazine mood tiles.
 *
 * Dual-write: the local Zustand store stays authoritative; every mood-tile change is
 * mirrored to the magazine_mood_tiles table best-effort (errors logged, never thrown,
 * never rolled back). Mirrors useMagazineTaskSync.
 *
 * What it does:
 *   1. On mount: pushes every current UUID mood tile (upsert — safe to re-run).
 *   2. Subscribes to useMagazineStore and diffs mood tiles across ALL projects:
 *        - tile added / any field changed / reordered → supabasePushMoodTile (upsert)
 *        - tile removed                               → supabaseDeleteMoodTile
 *
 * Mood tiles are nested content (projects[].moodTiles[]), flattened into a Map keyed by
 * tile id. The content signature covers ALL persisted fields, including `order` (so
 * moveMoodTile reorders push both affected tiles via the generic diff — no special path).
 * Non-UUID seed ids are skipped.
 *
 * IMAGE BOUNDARY: only the soft image-id reference travels through here (in the content
 * sig and the row). Image bytes are never read or written — they stay in IndexedDB /
 * the media table. This hook does not touch media/blob code.
 *
 * No echo-loop risk (so no value-dedup map): the Phase 5J read is component-local
 * (MagazineVisual.tsx) and does NOT hydrate the store, so a Supabase write can never
 * bounce back into the store to re-trigger this subscriber.
 *
 * FK magazine_mood_tiles.project_id → projects(id) self-heals after the Phase 4 project
 * push (a 23503 is logged, then succeeds on the next change).
 *
 * Called once from AppShell. No-op when VITE_SUPABASE_URL/ANON_KEY are absent.
 */
import { useEffect } from 'react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import { supabasePushMoodTile, supabaseDeleteMoodTile } from '@/repositories/magazineMoodTiles'
import type { MagazineProject, MoodTile } from '@/types/magazine'

type FlatMoodTile = { projectId: string; tile: MoodTile }

// Flatten projects[].moodTiles[] into a map keyed by tile id (UUID-guarded).
function flattenMoodTiles(projects: MagazineProject[]): Map<string, FlatMoodTile> {
  const map = new Map<string, FlatMoodTile>()
  for (const p of projects) {
    if (!isValidUUID(p.id)) continue
    for (const t of p.moodTiles) {
      if (!isValidUUID(t.id)) continue
      map.set(t.id, { projectId: p.id, tile: t })
    }
  }
  return map
}

// Content signature — covers every persisted field, incl. order.
function contentSig(t: MoodTile): string {
  return JSON.stringify({
    imageId: t.imageId, caption: t.caption, color: t.color, order: t.order, createdAt: t.createdAt,
  })
}

export function useMagazineMoodTileSync(): void {
  useEffect(() => {
    // No-op when Supabase is not configured (missing env vars, offline, CI, etc.)
    if (!isSupabaseEnabled) return

    // ── 1. Initial push: every current UUID mood tile → Supabase (upsert) ────────
    // FK violations (project row not pushed yet) are expected and logged; self-heal.
    void (async () => {
      for (const { projectId, tile } of flattenMoodTiles(useMagazineStore.getState().projects).values()) {
        await supabasePushMoodTile(tile, projectId)
      }
    })()

    // ── 2. Subscribe: diff prev vs next; push adds/edits/reorders, delete removals ─
    const unsub = useMagazineStore.subscribe((state, prevState) => {
      if (state.projects === prevState.projects) return  // fast-path

      const prev = flattenMoodTiles(prevState.projects)
      const next = flattenMoodTiles(state.projects)

      // Added or changed (incl. reorder via moveMoodTile) → upsert
      for (const [id, row] of next) {
        const before = prev.get(id)
        if (!before || contentSig(before.tile) !== contentSig(row.tile)) {
          void supabasePushMoodTile(row.tile, row.projectId)
        }
      }

      // Removed → delete
      for (const id of prev.keys()) {
        if (!next.has(id)) void supabaseDeleteMoodTile(id)
      }
    })

    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
