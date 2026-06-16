/**
 * Magazine budget items repository — Supabase-first reads + dual-write helpers for the
 * magazine budget line items (the shared BudgetItem shape). Mirrors magazineTasks.ts.
 *
 * Phase 5L: flat records. SEPARATE from any event/shoot budget handling. The shared
 * BudgetItem type is reused only for its field shape + enum values (status) — that type
 * is not touched. totalBudget is NOT here (it is a project summary field, synced in 5B).
 *
 * BLOB BOUNDARY: invoice_file_id is a SOFT reference (IndexedDB blob key) ONLY. Invoice
 * bytes are never stored here — they live in IndexedDB. This repo round-trips the key.
 *
 * numeric columns (estimated_cost / actual_cost) can arrive from PostgREST as strings —
 * the row→app mapper coerces them with Number() so the app always sees real numbers.
 *
 * Read authority (resolved by the caller, MagazineBudget.tsx):
 *     const items = (await list(projectId)) ?? project.budgetItems
 *   • list() returns mapped Supabase rows when the table has data for the project.
 *   • list() returns NULL when Supabase is disabled / non-UUID id / error / no rows.
 *
 * Write helpers (called by useMagazineBudgetItemSync only) dual-write best-effort: the
 * local store stays authoritative; failures are logged, never thrown, never rolled back.
 */
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { MagazineBudgetItemRow, MagazineBudgetItemInsert } from '@/lib/supabase.types'
import type { BudgetItem, BudgetItemStatus } from '@/types/common'

// ─── Mapping ──────────────────────────────────────────────────────────────────

// row → app-facing BudgetItem. numeric → Number(); nullable soft ref → ''.
function rowToBudgetItem(r: MagazineBudgetItemRow): BudgetItem {
  return {
    id:              r.id,
    description:     r.description,
    category:        r.category,
    supplier:        r.supplier,
    estimatedCost:   Number(r.estimated_cost),   // numeric may arrive as a string
    actualCost:      Number(r.actual_cost),
    status:          r.status as BudgetItemStatus, // text+CHECK pinned to domain
    notes:           r.notes,
    invoiceFileName: r.invoice_file_name,
    invoiceFileId:   r.invoice_file_id ?? '',     // null → '' (soft ref)
    createdAt:       r.created_at,
  }
}

// BudgetItem → row. '' → null for the nullable soft ref; created_at preserved; updated bumped.
function budgetItemToRow(b: BudgetItem, projectId: string): MagazineBudgetItemInsert {
  return {
    id:                b.id,
    project_id:        projectId,
    description:       b.description,
    category:          b.category,
    supplier:          b.supplier,
    estimated_cost:    b.estimatedCost,
    actual_cost:       b.actualCost,
    status:            b.status,
    notes:             b.notes,
    invoice_file_name: b.invoiceFileName,
    invoice_file_id:   b.invoiceFileId || null,
    created_at:        b.createdAt,
    updated_at:        new Date().toISOString(),
  }
}

// ─── Read (Supabase-first, null = caller falls back to local) ─────────────────

export const MagazineBudgetItemRepository = {
  /**
   * Supabase-first read of a project's budget items (ordered by created_at — BudgetItem
   * has no order field). Returns a mapped array when Supabase has ≥1 row; otherwise NULL
   * to signal the caller to fall back to its local store copy.
   */
  async list(projectId: string): Promise<BudgetItem[] | null> {
    if (!isSupabaseEnabled || !supabase) return null
    if (!isValidUUID(projectId)) return null

    const { data, error } = await supabase
      .from('magazine_budget_items')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('[MagazineBudgetItemRepo] list failed:', projectId, error.message)
      return null
    }
    if (!data || data.length === 0) return null  // no rows yet → fall back to local

    return data.map(rowToBudgetItem)
  },
}

// ─── Supabase write helpers (Phase 5L — called by useMagazineBudgetItemSync only) ─
// Plain exported functions — NOT on MagazineBudgetItemRepository (read-only object).
// Touches only magazine_budget_items; never totalBudget or any event/shoot budget code.

/**
 * Upsert one budget item — INSERT for adds, UPDATE for edits (conflict target id).
 * Skips non-UUID ids (seed-mag-* items / projects stay local-only).
 * FK magazine_budget_items.project_id → projects(id): a 23503 means the project row isn't
 * in Supabase yet (Phase 4 push pending) — logged, self-heals on the next change.
 * Invoice bytes are NOT written here — only the soft key reference.
 */
export async function supabasePushBudgetItem(item: BudgetItem, projectId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(item.id) || !isValidUUID(projectId)) return

  const { error } = await supabase
    .from('magazine_budget_items')
    .upsert(budgetItemToRow(item, projectId), { onConflict: 'id', ignoreDuplicates: false })
  if (error) {
    if (error.code === '23503') {
      console.warn('[MagazineBudgetItemSync] FK violation — project not yet in Supabase:', { itemId: item.id, projectId }, error.message)
    } else {
      console.warn('[MagazineBudgetItemSync] push failed:', item.id, error.message)
    }
  }
}

/** Delete one budget item by id. Skips non-UUID ids. Invoice bytes (IndexedDB) untouched. */
export async function supabaseDeleteBudgetItem(itemId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(itemId)) return

  const { error } = await supabase.from('magazine_budget_items').delete().eq('id', itemId)
  if (error) console.warn('[MagazineBudgetItemSync] delete failed:', itemId, error.message)
}
