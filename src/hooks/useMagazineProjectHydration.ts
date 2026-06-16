/**
 * useMagazineProjectHydration — Phase 5B guarded authority flip for magazine summaries.
 *
 * On mount (when isSupabaseEnabled) it runs the Phase 5A drift check
 * (runMagazineProjectBootstrap — which still logs the full drift report), then:
 *   • GATE CLEAN  → re-sources the 8 summary fields of each matching project from
 *                   Supabase via useMagazineStore.hydrateProjectSummaries(). The
 *                   action preserves id, timestamps, and ALL content arrays, and is
 *                   change-aware, so when local already matches remote (the
 *                   guaranteed case under a clean gate) this is a true no-op.
 *   • GATE DIRTY  → does nothing; the local store stays authoritative. Logs why.
 *
 * The gate is "zero UNEXPECTED drift":
 *   - fieldDrift   === 0  (no summary field disagrees)
 *   - missingLocal === 0  (no remote-only project we'd have to invent locally)
 *   - missingRemote contains only EXPECTED entries (non-UUID seed ids the write
 *     path skips by design); any unexpected local-only (un-pushed UUID) blocks it.
 *
 * Why this protects unsynced local edits: a local summary edit that hasn't reached
 * Supabase shows up as field drift (or, for a brand-new project, as unexpected
 * missing-remote). Either trips the gate, so hydration is skipped and the local edit
 * is never overwritten. Hydration only runs when the two sides already agree.
 *
 * Supersedes the standalone Phase 5A mount (useMagazineProjectBootstrap) in AppShell:
 * this hook calls the same runner, so the drift report is still logged exactly once.
 *
 * Called once from AppShell. No-op when VITE_SUPABASE_URL/ANON_KEY are absent.
 */
import { useEffect } from 'react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import {
  runMagazineProjectBootstrap,
  type MagazineBootstrapReport,
} from '@/hooks/useMagazineProjectBootstrap'

// Gate: hydrate only when remote and local agree on every summary field — i.e. zero
// UNEXPECTED drift. Expected drift (non-UUID seed projects with no remote row) is OK.
function gateClean(r: MagazineBootstrapReport): boolean {
  return (
    r.fieldDrift.length === 0 &&
    r.missingLocal.length === 0 &&
    r.missingRemote.every((m) => m.expected)
  )
}

export function useMagazineProjectHydration(): void {
  useEffect(() => {
    // No-op when Supabase is not configured (missing env vars, offline, CI, etc.)
    if (!isSupabaseEnabled) return

    void (async () => {
      const report = await runMagazineProjectBootstrap() // also logs the drift report
      if (!report) return

      if (!gateClean(report)) {
        const unexpectedMissing = report.missingRemote.filter((m) => !m.expected).length
        console.info(
          '[MagazineHydration] skipped — local kept authoritative ' +
          `(field drift: ${report.fieldDrift.length}, remote-only: ${report.missingLocal.length}, ` +
          `unexpected local-only: ${unexpectedMissing})`
        )
        return
      }

      // Gate clean: re-source summary fields from Supabase. Change-aware action, so
      // under a clean gate (local === remote) this performs no store write at all.
      useMagazineStore.getState().hydrateProjectSummaries(report.remote)
      console.info(
        `[MagazineHydration] gate clean — ${report.remote.length} remote summaries ` +
        're-sourced into the local store (content arrays preserved)'
      )
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
