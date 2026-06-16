/**
 * useMagazineGrantSync — Phase 4B write-path: local → Supabase for magazine access grants.
 *
 * What it does:
 *   1. On mount: pushes all current magazine grants from the local store to Supabase
 *      (best-effort upsert; FK violations are expected until people/projects write
 *      paths are complete — logged clearly, not thrown).
 *   2. Watches useUserStore.accessGrants for magazine-module changes and forwards
 *      diffs to Supabase:
 *        - Row added or level changed → supabaseUpsertAccessGrant
 *        - Row removed               → supabaseDeleteAccessGrant
 *
 * The diff is row-level: the nested ProjectGrant structure is flattened into
 * { userId, projectId, sectionKey, level } tuples keyed by "userId|projectId|sectionKey".
 * This correctly handles all three store actions:
 *   • setProjectAccessDefault  → changes or adds the '*' section_key row
 *   • setSectionAccess(level)  → changes or adds a specific section_key row
 *   • setSectionAccess(inherit)→ removes a section_key row
 *   • removeProjectGrant       → removes all section_key rows for a project
 *
 * Event and shoot grants are excluded (flattenMagazineGrants filters module === 'magazine').
 * Non-UUID project_ids (seed-mag-001 etc.) are skipped inside the sync helpers.
 *
 * FK dependencies (logged, not thrown):
 *   • (project_id, module) → projects(id, module): self-heals after useMagazineProjectSync push.
 *   • person_id → people(id): self-heals once the people write path is wired (future phase).
 *
 * Called once from AppShell. No-op when VITE_SUPABASE_URL/ANON_KEY are absent.
 */
import { useEffect } from 'react'
import { useUserStore } from '@/store/useUserStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import { supabaseUpsertAccessGrant, supabaseDeleteAccessGrant } from '@/repositories/access'
import type { AccessLevel, ProjectGrant } from '@/auth/access'

// ─── Flat row representation ──────────────────────────────────────────────────

type GrantRow = {
  userId:     string
  projectId:  string
  sectionKey: string
  level:      AccessLevel
}

function rowKey(r: GrantRow): string {
  return `${r.userId}|${r.projectId}|${r.sectionKey}`
}

// Flatten the nested accessGrants map into a list of individual DB rows,
// restricted to module === 'magazine' so event/shoot grants are never touched.
function flattenMagazineGrants(
  accessGrants: Record<string, ProjectGrant[]>
): GrantRow[] {
  const rows: GrantRow[] = []
  for (const [userId, grants] of Object.entries(accessGrants)) {
    for (const g of grants) {
      if (g.module !== 'magazine') continue
      for (const [sectionKey, level] of Object.entries(g.sections)) {
        rows.push({ userId, projectId: g.projectId, sectionKey, level })
      }
    }
  }
  return rows
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMagazineGrantSync(): void {
  useEffect(() => {
    // No-op when Supabase is not configured (missing env vars, offline, CI, etc.)
    if (!isSupabaseEnabled) return

    // ── 1. Initial push: all current magazine grants → Supabase ──────────────
    // FK violations (project or person not yet in Supabase) are expected and logged.
    // Self-heals on subsequent user interactions once FK dependencies are satisfied.
    void (async () => {
      const rows = flattenMagazineGrants(useUserStore.getState().accessGrants)
      for (const r of rows) {
        await supabaseUpsertAccessGrant(r.userId, r.projectId, r.sectionKey, r.level)
      }
    })()

    // ── 2. Subscribe to store changes; diff magazine grants and push ──────────
    const unsub = useUserStore.subscribe((state, prevState) => {
      // Fast-path: skip when accessGrants reference hasn't changed.
      // Fires when unrelated user store fields change (currentUserId, memberships, etc.)
      // without touching grants — avoids unnecessary diffing.
      if (state.accessGrants === prevState.accessGrants) return

      const prevRows = flattenMagazineGrants(prevState.accessGrants)
      const nextRows = flattenMagazineGrants(state.accessGrants)

      const prevMap = new Map(prevRows.map((r) => [rowKey(r), r]))
      const nextMap = new Map(nextRows.map((r) => [rowKey(r), r]))

      // Added or level changed → upsert
      for (const [k, r] of nextMap) {
        const p = prevMap.get(k)
        if (!p || p.level !== r.level) {
          void supabaseUpsertAccessGrant(r.userId, r.projectId, r.sectionKey, r.level)
        }
      }

      // Removed → delete
      for (const [k, r] of prevMap) {
        if (!nextMap.has(k)) {
          void supabaseDeleteAccessGrant(r.userId, r.projectId, r.sectionKey)
        }
      }
    })

    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
