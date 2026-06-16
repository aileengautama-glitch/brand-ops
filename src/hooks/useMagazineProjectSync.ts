/**
 * useMagazineProjectSync — Phase 4 write-path: local → Supabase for magazine projects.
 *
 * What it does:
 *   1. On mount: pushes any local magazine project (valid UUID) that doesn't yet
 *      exist in Supabase (best-effort upsert with ignoreDuplicates=true — safe to
 *      re-run, already-synced projects are silently skipped).
 *   2. Watches useMagazineStore for project-level changes and forwards them to Supabase:
 *        - Project added   → INSERT projects row, then magazine_project_meta row
 *        - Project removed → DELETE from projects (CASCADE removes meta + access_grants)
 *        - Summary fields updated (name, description, editionNumber, publicationDate,
 *          theme, status, notes, totalBudget) → UPDATE projects and/or meta as needed
 *
 * Only summary-level fields are diffed and forwarded.  Content arrays (articles,
 * spreads, graphics, etc.) are intentionally ignored — they are not yet in the DB schema.
 *
 * Pattern mirrors useProjectSync (event/shoot).  Called once from AppShell.
 * No-op when VITE_SUPABASE_URL/ANON_KEY are absent (pure-local dev, offline, CI).
 */
import { useEffect } from 'react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import {
  supabasePushMagazineProject,
  supabaseUpdateMagazineProject,
  supabaseDeleteMagazineProject,
} from '@/repositories/magazineProjects'
import type { MagazineProject } from '@/types/magazine'

// ─── Summary-field diff ───────────────────────────────────────────────────────
// Only fields that live in projects or magazine_project_meta are diffed.
// Content arrays are excluded — they are not part of the Phase 4 write scope.

type SummaryPatch = Partial<Pick<MagazineProject,
  'name' | 'description' | 'editionNumber' | 'publicationDate'
  | 'theme' | 'status' | 'notes' | 'totalBudget'
>>

function summaryDiff(prev: MagazineProject, next: MagazineProject): SummaryPatch | null {
  const patch: SummaryPatch = {}
  if (prev.name            !== next.name)            patch.name            = next.name
  if (prev.description     !== next.description)     patch.description     = next.description
  if (prev.editionNumber   !== next.editionNumber)   patch.editionNumber   = next.editionNumber
  if (prev.publicationDate !== next.publicationDate) patch.publicationDate = next.publicationDate
  if (prev.theme           !== next.theme)           patch.theme           = next.theme
  if (prev.status          !== next.status)          patch.status          = next.status
  if (prev.notes           !== next.notes)           patch.notes           = next.notes
  if (prev.totalBudget     !== next.totalBudget)     patch.totalBudget     = next.totalBudget
  return Object.keys(patch).length > 0 ? patch : null
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMagazineProjectSync(): void {
  useEffect(() => {
    // No-op when Supabase is not configured (missing env vars, offline, CI, etc.)
    if (!isSupabaseEnabled) return

    // ── 1. Initial push: local → remote for any UUID project not yet in Supabase ──
    // upsert with ignoreDuplicates=true means already-synced projects are skipped.
    void (async () => {
      for (const p of useMagazineStore.getState().projects) {
        await supabasePushMagazineProject(p)
      }
    })()

    // ── 2. Subscribe to store changes; diff and push to Supabase ─────────────
    // Zustand's subscribe fires (nextState, prevState) synchronously after every
    // set() call.  We start async Supabase writes immediately (fire-and-forget)
    // so the delay between local write and remote write is one microtask.
    const unsub = useMagazineStore.subscribe((state, prevState) => {
      const next = state.projects
      const prev = prevState.projects

      // Added — project present in next but absent in prev
      next
        .filter((p) => !prev.some((pp) => pp.id === p.id))
        .forEach((p) => void supabasePushMagazineProject(p))

      // Removed — project absent in next but present in prev
      prev
        .filter((p) => !next.some((pp) => pp.id === p.id))
        .forEach((p) => void supabaseDeleteMagazineProject(p.id))

      // Updated — project present in both; diff summary fields only.
      // Content-array changes (articles, spreads, etc.) produce no summary diff
      // and are correctly ignored here.
      next.forEach((p) => {
        const prevP = prev.find((pp) => pp.id === p.id)
        if (!prevP) return
        const patch = summaryDiff(prevP, p)
        if (patch) void supabaseUpdateMagazineProject(p.id, patch)
      })
    })

    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
