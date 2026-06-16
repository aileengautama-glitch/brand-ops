/**
 * useMagazineWriterHoursSync — Phase 5M write-path: local → Supabase for the magazine
 * writer hours log.
 *
 * Dual-write: the local Zustand store stays authoritative; every writer-hours change is
 * mirrored to the magazine_writer_hours table best-effort (errors logged, never thrown,
 * never rolled back). Mirrors useMagazineBudgetItemSync.
 *
 * First of the writing-workspace arrays. article_id is a SOFT ref (no hard FK) — entries
 * may be general (articleId=''), so an unsynced article never blocks a write. Only the
 * project_id FK self-heals after the Phase 4 project push.
 *
 * What it does:
 *   1. On mount: pushes every current UUID writer-hours entry (upsert — safe to re-run).
 *   2. Subscribes to useMagazineStore and diffs entries across ALL projects:
 *        - entry added / any field changed → supabasePushWriterHours (upsert)
 *        - entry removed                   → supabaseDeleteWriterHours
 *
 * Entries are nested content (projects[].writerHours[]), flattened into a Map keyed by
 * entry id. The content signature covers ALL persisted fields (no order / no updatedAt).
 * Non-UUID seed ids are skipped.
 *
 * No echo-loop risk (so no value-dedup map): the Phase 5M read is component-local
 * (MagazineWritingHours.tsx) and does NOT hydrate the store, so a Supabase write can never
 * bounce back into the store to re-trigger this subscriber.
 *
 * Called once from AppShell. No-op when VITE_SUPABASE_URL/ANON_KEY are absent.
 */
import { useEffect } from 'react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import { supabasePushWriterHours, supabaseDeleteWriterHours } from '@/repositories/magazineWriterHours'
import type { MagazineProject, WriterHoursEntry } from '@/types/magazine'

type FlatWriterHours = { projectId: string; entry: WriterHoursEntry }

// Flatten projects[].writerHours[] into a map keyed by entry id (UUID-guarded).
function flattenWriterHours(projects: MagazineProject[]): Map<string, FlatWriterHours> {
  const map = new Map<string, FlatWriterHours>()
  for (const p of projects) {
    if (!isValidUUID(p.id)) continue
    for (const entry of p.writerHours) {
      if (!isValidUUID(entry.id)) continue
      map.set(entry.id, { projectId: p.id, entry })
    }
  }
  return map
}

// Content signature — covers every persisted field (no order / updatedAt on this entity).
function contentSig(h: WriterHoursEntry): string {
  return JSON.stringify({
    date: h.date, hours: h.hours, note: h.note, articleId: h.articleId,
    writerId: h.writerId, billable: h.billable, createdAt: h.createdAt,
  })
}

export function useMagazineWriterHoursSync(): void {
  useEffect(() => {
    // No-op when Supabase is not configured (missing env vars, offline, CI, etc.)
    if (!isSupabaseEnabled) return

    // ── 1. Initial push: every current UUID writer-hours entry → Supabase (upsert) ─
    // FK violations (project row not pushed yet) are expected and logged; self-heal.
    void (async () => {
      for (const { projectId, entry } of flattenWriterHours(useMagazineStore.getState().projects).values()) {
        await supabasePushWriterHours(entry, projectId)
      }
    })()

    // ── 2. Subscribe: diff prev vs next; push adds/edits, delete removals ────────
    const unsub = useMagazineStore.subscribe((state, prevState) => {
      if (state.projects === prevState.projects) return  // fast-path

      const prev = flattenWriterHours(prevState.projects)
      const next = flattenWriterHours(state.projects)

      // Added or changed → upsert
      for (const [id, row] of next) {
        const before = prev.get(id)
        if (!before || contentSig(before.entry) !== contentSig(row.entry)) {
          void supabasePushWriterHours(row.entry, row.projectId)
        }
      }

      // Removed → delete
      for (const id of prev.keys()) {
        if (!next.has(id)) void supabaseDeleteWriterHours(id)
      }
    })

    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
