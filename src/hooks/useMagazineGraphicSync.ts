/**
 * useMagazineGraphicSync — Phase 5F write-path: local → Supabase for magazine graphics.
 *
 * Dual-write: the local Zustand store stays authoritative; every graphic change is
 * mirrored to the magazine_graphics table best-effort (errors logged, never thrown,
 * never rolled back). Mirrors useMagazineSpreadSync.
 *
 * What it does:
 *   1. On mount: pushes every current UUID graphic (upsert — safe to re-run).
 *   2. Subscribes to useMagazineStore and diffs graphics across ALL projects:
 *        - graphic added / any field changed / reordered → supabasePushGraphic (upsert)
 *        - graphic removed                               → supabaseDeleteGraphic
 *
 * Graphics are nested content (projects[].graphics[]), flattened into a Map keyed by
 * graphic id. The content signature covers ALL persisted fields, including both JSONB
 * arrays (imageIds, resultLinks) and `order` (so moveGraphic reorders push both).
 * Non-UUID seed ids are skipped.
 *
 * IMAGE BOUNDARY: only soft image-id references travel through here (in the content
 * sig and the row). Image bytes are never read or written — they stay in IndexedDB /
 * the media table. This hook does not touch media/blob code.
 *
 * No echo-loop risk (so no value-dedup map): the Phase 5F read is component-local
 * (MagazineGraphics.tsx) and does NOT hydrate the store, so a Supabase write can never
 * bounce back into the store to re-trigger this subscriber.
 *
 * FK magazine_graphics.project_id → projects(id) self-heals after the Phase 4 project
 * push (a 23503 is logged, then succeeds on the next change).
 *
 * Called once from AppShell. No-op when VITE_SUPABASE_URL/ANON_KEY are absent.
 */
import { useEffect } from 'react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import { supabasePushGraphic, supabaseDeleteGraphic } from '@/repositories/magazineGraphics'
import type { MagazineProject, Graphic } from '@/types/magazine'

type FlatGraphic = { projectId: string; graphic: Graphic }

// Flatten projects[].graphics[] into a map keyed by graphic id (UUID-guarded).
function flattenGraphics(projects: MagazineProject[]): Map<string, FlatGraphic> {
  const map = new Map<string, FlatGraphic>()
  for (const p of projects) {
    if (!isValidUUID(p.id)) continue
    for (const g of p.graphics) {
      if (!isValidUUID(g.id)) continue
      map.set(g.id, { projectId: p.id, graphic: g })
    }
  }
  return map
}

// Content signature — covers every persisted field, incl. both arrays and order.
function contentSig(g: Graphic): string {
  return JSON.stringify({
    title: g.title, formatDetail: g.formatDetail, assignee: g.assignee, status: g.status,
    previewImageId: g.previewImageId, imageIds: g.imageIds, brief: g.brief, notes: g.notes,
    articleId: g.articleId, visualProjectId: g.visualProjectId, moodTileId: g.moodTileId,
    dropboxLink: g.dropboxLink, resultLinks: g.resultLinks, order: g.order, createdAt: g.createdAt,
  })
}

export function useMagazineGraphicSync(): void {
  useEffect(() => {
    // No-op when Supabase is not configured (missing env vars, offline, CI, etc.)
    if (!isSupabaseEnabled) return

    // ── 1. Initial push: every current UUID graphic → Supabase (upsert) ──────────
    // FK violations (project row not pushed yet) are expected and logged; self-heal.
    void (async () => {
      for (const { projectId, graphic } of flattenGraphics(useMagazineStore.getState().projects).values()) {
        await supabasePushGraphic(graphic, projectId)
      }
    })()

    // ── 2. Subscribe: diff prev vs next; push adds/edits/moves, delete removals ───
    const unsub = useMagazineStore.subscribe((state, prevState) => {
      if (state.projects === prevState.projects) return  // fast-path

      const prev = flattenGraphics(prevState.projects)
      const next = flattenGraphics(state.projects)

      // Added or changed (incl. reorder / image-id / link edit) → upsert
      for (const [id, row] of next) {
        const before = prev.get(id)
        if (!before || contentSig(before.graphic) !== contentSig(row.graphic)) {
          void supabasePushGraphic(row.graphic, row.projectId)
        }
      }

      // Removed → delete
      for (const id of prev.keys()) {
        if (!next.has(id)) void supabaseDeleteGraphic(id)
      }
    })

    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
