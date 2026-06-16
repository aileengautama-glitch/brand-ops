/**
 * useMagazineOutreachSync — Phase 5D write-path: local → Supabase for magazine outreach.
 *
 * Dual-write: the local Zustand store stays authoritative; every outreach change is
 * mirrored to the magazine_outreach table best-effort (errors logged, never thrown,
 * never rolled back).
 *
 * What it does:
 *   1. On mount: pushes every current UUID outreach contact (upsert — safe to re-run).
 *   2. Subscribes to useMagazineStore and diffs outreach across ALL projects:
 *        - contact added or any field changed → supabasePushOutreach (upsert)
 *        - contact removed                    → supabaseDeleteOutreach
 *
 * Outreach is nested content (projects[].outreach[]), so it is flattened into a Map
 * keyed by contact id (mirrors useMagazineGrantSync). Non-UUID seed contacts/projects
 * are skipped — they stay local-only.
 *
 * No echo-loop risk (so no value-dedup map is needed): the Phase 5C read is
 * component-local (MagazineOutreach.tsx) and does NOT hydrate the store, so a Supabase
 * write can never bounce back into the store to re-trigger this subscriber. (Unlike
 * useProductsSync, which has Realtime remote→store and therefore needs lastSynced.)
 * The diff itself only pushes on real content changes, so unrelated edits (articles,
 * tasks, …) produce no outreach writes.
 *
 * FK magazine_outreach.project_id → projects(id) self-heals: until Phase 4 pushes the
 * project row, pushes fail with 23503 (logged) and succeed on the next change.
 *
 * Called once from AppShell. No-op when VITE_SUPABASE_URL/ANON_KEY are absent.
 */
import { useEffect } from 'react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import { supabasePushOutreach, supabaseDeleteOutreach } from '@/repositories/magazineOutreach'
import type { MagazineProject, OutreachContact } from '@/types/magazine'

type FlatOutreach = { projectId: string; contact: OutreachContact }

// Flatten projects[].outreach[] into a map keyed by contact id (UUID-guarded).
function flattenOutreach(projects: MagazineProject[]): Map<string, FlatOutreach> {
  const map = new Map<string, FlatOutreach>()
  for (const p of projects) {
    if (!isValidUUID(p.id)) continue
    for (const c of p.outreach) {
      if (!isValidUUID(c.id)) continue
      map.set(c.id, { projectId: p.id, contact: c })
    }
  }
  return map
}

// Content signature — detects an edit. Covers every field the row carries.
function contentSig(c: OutreachContact): string {
  return JSON.stringify({
    name: c.name, type: c.type, status: c.status, contactInfo: c.contactInfo,
    fee: c.fee, articleId: c.articleId, role: c.role, notes: c.notes, createdAt: c.createdAt,
  })
}

export function useMagazineOutreachSync(): void {
  useEffect(() => {
    // No-op when Supabase is not configured (missing env vars, offline, CI, etc.)
    if (!isSupabaseEnabled) return

    // ── 1. Initial push: every current UUID outreach contact → Supabase (upsert) ──
    // FK violations (project row not pushed yet) are expected and logged; self-heal.
    void (async () => {
      for (const { projectId, contact } of flattenOutreach(useMagazineStore.getState().projects).values()) {
        await supabasePushOutreach(contact, projectId)
      }
    })()

    // ── 2. Subscribe: diff prev vs next; push adds/edits, delete removals ─────────
    const unsub = useMagazineStore.subscribe((state, prevState) => {
      // Fast-path: the magazine store's only state slice is `projects`, so any action
      // produces a new array; skip when the reference is somehow unchanged.
      if (state.projects === prevState.projects) return

      const prev = flattenOutreach(prevState.projects)
      const next = flattenOutreach(state.projects)

      // Added or changed → upsert
      for (const [id, row] of next) {
        const before = prev.get(id)
        if (!before || contentSig(before.contact) !== contentSig(row.contact)) {
          void supabasePushOutreach(row.contact, row.projectId)
        }
      }

      // Removed → delete
      for (const id of prev.keys()) {
        if (!next.has(id)) void supabaseDeleteOutreach(id)
      }
    })

    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
