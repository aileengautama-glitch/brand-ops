/**
 * useMagazineVisualProjectSync — Phase 5H write-path: local → Supabase for magazine
 * visual projects.
 *
 * Dual-write: the local Zustand store stays authoritative; every visual-project change
 * is mirrored to the magazine_visual_projects table best-effort (errors logged, never
 * thrown, never rolled back). Mirrors useMagazineGraphicSync.
 *
 * What it does:
 *   1. On mount: pushes every current UUID visual project (upsert — safe to re-run).
 *   2. Subscribes to useMagazineStore and diffs visual projects across ALL projects:
 *        - added / any field changed (incl. shots / resultLinks) → supabasePushVisualProject
 *        - removed                                               → supabaseDeleteVisualProject
 *
 * Visual projects are nested content (projects[].visualProjects[]), flattened into a
 * Map keyed by visual-project id. The content signature covers ALL persisted fields,
 * including both JSONB arrays (shots, resultLinks), `order`, AND the app-level
 * `updatedAt`. Non-UUID seed ids are skipped.
 *
 * No echo-loop risk (so no value-dedup map): the Phase 5H read is component-local
 * (MagazineVisual.tsx) and does NOT hydrate the store, so a Supabase write can never
 * bounce back into the store to re-trigger this subscriber.
 *
 * FK magazine_visual_projects.project_id → projects(id) self-heals after the Phase 4
 * project push (a 23503 is logged, then succeeds on the next change).
 *
 * Called once from AppShell. No-op when VITE_SUPABASE_URL/ANON_KEY are absent.
 */
import { useEffect } from 'react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import { supabasePushVisualProject, supabaseDeleteVisualProject } from '@/repositories/magazineVisualProjects'
import type { MagazineProject, VisualProject } from '@/types/magazine'

type FlatVisualProject = { projectId: string; vp: VisualProject }

// Flatten projects[].visualProjects[] into a map keyed by visual-project id (UUID-guarded).
function flattenVisualProjects(projects: MagazineProject[]): Map<string, FlatVisualProject> {
  const map = new Map<string, FlatVisualProject>()
  for (const p of projects) {
    if (!isValidUUID(p.id)) continue
    for (const vp of p.visualProjects) {
      if (!isValidUUID(vp.id)) continue
      map.set(vp.id, { projectId: p.id, vp })
    }
  }
  return map
}

// Content signature — covers every persisted field, incl. both arrays, order, updatedAt.
function contentSig(v: VisualProject): string {
  return JSON.stringify({
    name: v.name, concept: v.concept, status: v.status, shootDate: v.shootDate,
    location: v.location, assignedTo: v.assignedTo, articleId: v.articleId,
    shots: v.shots, resultLinks: v.resultLinks, notes: v.notes, order: v.order,
    updatedAt: v.updatedAt, createdAt: v.createdAt,
  })
}

export function useMagazineVisualProjectSync(): void {
  useEffect(() => {
    // No-op when Supabase is not configured (missing env vars, offline, CI, etc.)
    if (!isSupabaseEnabled) return

    // ── 1. Initial push: every current UUID visual project → Supabase (upsert) ───
    // FK violations (project row not pushed yet) are expected and logged; self-heal.
    void (async () => {
      for (const { projectId, vp } of flattenVisualProjects(useMagazineStore.getState().projects).values()) {
        await supabasePushVisualProject(vp, projectId)
      }
    })()

    // ── 2. Subscribe: diff prev vs next; push adds/edits, delete removals ────────
    const unsub = useMagazineStore.subscribe((state, prevState) => {
      if (state.projects === prevState.projects) return  // fast-path

      const prev = flattenVisualProjects(prevState.projects)
      const next = flattenVisualProjects(state.projects)

      // Added or changed (incl. shots / resultLinks / status edits) → upsert
      for (const [id, row] of next) {
        const before = prev.get(id)
        if (!before || contentSig(before.vp) !== contentSig(row.vp)) {
          void supabasePushVisualProject(row.vp, row.projectId)
        }
      }

      // Removed → delete
      for (const id of prev.keys()) {
        if (!next.has(id)) void supabaseDeleteVisualProject(id)
      }
    })

    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
