/**
 * useMagazineBudgetItemSync — Phase 5L write-path: local → Supabase for magazine budget items.
 *
 * Dual-write: the local Zustand store stays authoritative; every budget-item change is
 * mirrored to the magazine_budget_items table best-effort (errors logged, never thrown,
 * never rolled back). Mirrors useMagazineTaskSync.
 *
 * SEPARATE from any event/shoot budget handling, and from totalBudget (a project summary
 * field synced in Phase 5B). This only touches magazine_budget_items and the local
 * MagazineProject.budgetItems array.
 *
 * What it does:
 *   1. On mount: pushes every current UUID budget item (upsert — safe to re-run).
 *   2. Subscribes to useMagazineStore and diffs budget items across ALL projects:
 *        - item added / any field changed → supabasePushBudgetItem (upsert)
 *        - item removed                   → supabaseDeleteBudgetItem
 *
 * Budget items are nested content (projects[].budgetItems[]), flattened into a Map keyed
 * by item id. The content signature covers ALL persisted fields (BudgetItem has no order
 * and no updatedAt). Non-UUID seed ids are skipped.
 *
 * BLOB BOUNDARY: only the soft invoice-file-id reference travels through here. Invoice
 * bytes are never read or written — they stay in IndexedDB.
 *
 * No echo-loop risk (so no value-dedup map): the Phase 5L read is component-local
 * (MagazineBudget.tsx) and does NOT hydrate the store, so a Supabase write can never
 * bounce back into the store to re-trigger this subscriber.
 *
 * FK magazine_budget_items.project_id → projects(id) self-heals after the Phase 4 project
 * push (a 23503 is logged, then succeeds on the next change).
 *
 * Called once from AppShell. No-op when VITE_SUPABASE_URL/ANON_KEY are absent.
 */
import { useEffect } from 'react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import { supabasePushBudgetItem, supabaseDeleteBudgetItem } from '@/repositories/magazineBudgetItems'
import type { MagazineProject } from '@/types/magazine'
import type { BudgetItem } from '@/types/common'

type FlatBudgetItem = { projectId: string; item: BudgetItem }

// Flatten projects[].budgetItems[] into a map keyed by item id (UUID-guarded).
function flattenBudgetItems(projects: MagazineProject[]): Map<string, FlatBudgetItem> {
  const map = new Map<string, FlatBudgetItem>()
  for (const p of projects) {
    if (!isValidUUID(p.id)) continue
    for (const item of p.budgetItems) {
      if (!isValidUUID(item.id)) continue
      map.set(item.id, { projectId: p.id, item })
    }
  }
  return map
}

// Content signature — covers every persisted field (BudgetItem has no order / updatedAt).
function contentSig(b: BudgetItem): string {
  return JSON.stringify({
    description: b.description, category: b.category, supplier: b.supplier,
    estimatedCost: b.estimatedCost, actualCost: b.actualCost, status: b.status,
    notes: b.notes, invoiceFileName: b.invoiceFileName, invoiceFileId: b.invoiceFileId,
    createdAt: b.createdAt,
  })
}

export function useMagazineBudgetItemSync(): void {
  useEffect(() => {
    // No-op when Supabase is not configured (missing env vars, offline, CI, etc.)
    if (!isSupabaseEnabled) return

    // ── 1. Initial push: every current UUID budget item → Supabase (upsert) ──────
    // FK violations (project row not pushed yet) are expected and logged; self-heal.
    void (async () => {
      for (const { projectId, item } of flattenBudgetItems(useMagazineStore.getState().projects).values()) {
        await supabasePushBudgetItem(item, projectId)
      }
    })()

    // ── 2. Subscribe: diff prev vs next; push adds/edits, delete removals ────────
    const unsub = useMagazineStore.subscribe((state, prevState) => {
      if (state.projects === prevState.projects) return  // fast-path

      const prev = flattenBudgetItems(prevState.projects)
      const next = flattenBudgetItems(state.projects)

      // Added or changed → upsert
      for (const [id, row] of next) {
        const before = prev.get(id)
        if (!before || contentSig(before.item) !== contentSig(row.item)) {
          void supabasePushBudgetItem(row.item, row.projectId)
        }
      }

      // Removed → delete
      for (const id of prev.keys()) {
        if (!next.has(id)) void supabaseDeleteBudgetItem(id)
      }
    })

    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
