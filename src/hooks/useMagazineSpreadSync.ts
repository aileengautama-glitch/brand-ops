/**
 * useMagazineSpreadSync — Phase 5E write-path: local → Supabase for magazine spreads.
 *
 * Dual-write: the local Zustand store stays authoritative; every spread change is
 * mirrored to the magazine_spreads table best-effort (errors logged, never thrown,
 * never rolled back). Mirrors useMagazineOutreachSync.
 *
 * What it does:
 *   1. On mount: pushes every current UUID spread (upsert — safe to re-run).
 *   2. Subscribes to useMagazineStore and diffs spreads across ALL projects:
 *        - spread added / any field changed / reordered → supabasePushSpread (upsert)
 *        - spread removed                               → supabaseDeleteSpread
 *
 * Spreads are nested content (projects[].spreads[]), flattened into a Map keyed by
 * spread id. The content signature includes `order` (so moveSpread reorders push both
 * affected spreads) and `links` (so link edits push). Non-UUID seed ids are skipped.
 *
 * No echo-loop risk (so no value-dedup map): the Phase 5E read is component-local
 * (MagazineSpread.tsx) and does NOT hydrate the store, so a Supabase write can never
 * bounce back into the store to re-trigger this subscriber.
 *
 * FK magazine_spreads.project_id → projects(id) self-heals after the Phase 4 project
 * push (a 23503 is logged, then succeeds on the next change).
 *
 * Called once from AppShell. No-op when VITE_SUPABASE_URL/ANON_KEY are absent.
 */
import { useEffect } from 'react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import { supabasePushSpread, supabaseDeleteSpread } from '@/repositories/magazineSpreads'
import type { MagazineProject, Spread } from '@/types/magazine'

type FlatSpread = { projectId: string; spread: Spread }

// Flatten projects[].spreads[] into a map keyed by spread id (UUID-guarded).
function flattenSpreads(projects: MagazineProject[]): Map<string, FlatSpread> {
  const map = new Map<string, FlatSpread>()
  for (const p of projects) {
    if (!isValidUUID(p.id)) continue
    for (const s of p.spreads) {
      if (!isValidUUID(s.id)) continue
      map.set(s.id, { projectId: p.id, spread: s })
    }
  }
  return map
}

// Content signature — detects edits AND reorders (order) AND link changes (links).
function contentSig(s: Spread): string {
  return JSON.stringify({
    pages: s.pages, contentType: s.contentType, section: s.section, ownerId: s.ownerId,
    links: s.links, status: s.status, notes: s.notes, order: s.order, createdAt: s.createdAt,
  })
}

export function useMagazineSpreadSync(): void {
  useEffect(() => {
    // No-op when Supabase is not configured (missing env vars, offline, CI, etc.)
    if (!isSupabaseEnabled) return

    // ── 1. Initial push: every current UUID spread → Supabase (upsert) ───────────
    // FK violations (project row not pushed yet) are expected and logged; self-heal.
    void (async () => {
      for (const { projectId, spread } of flattenSpreads(useMagazineStore.getState().projects).values()) {
        await supabasePushSpread(spread, projectId)
      }
    })()

    // ── 2. Subscribe: diff prev vs next; push adds/edits/moves, delete removals ───
    const unsub = useMagazineStore.subscribe((state, prevState) => {
      if (state.projects === prevState.projects) return  // fast-path

      const prev = flattenSpreads(prevState.projects)
      const next = flattenSpreads(state.projects)

      // Added or changed (incl. reorder / link edit) → upsert
      for (const [id, row] of next) {
        const before = prev.get(id)
        if (!before || contentSig(before.spread) !== contentSig(row.spread)) {
          void supabasePushSpread(row.spread, row.projectId)
        }
      }

      // Removed → delete
      for (const id of prev.keys()) {
        if (!next.has(id)) void supabaseDeleteSpread(id)
      }
    })

    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
