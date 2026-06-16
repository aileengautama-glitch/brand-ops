/**
 * Magazine spreads repository — Supabase-first reads + dual-write helpers for the
 * spreads (page plan / table of contents) content entity. Mirrors magazineOutreach.ts.
 *
 * Phase 5E: the second magazine content slice. Spreads are flat except for a single
 * owned, ordered links array (SpreadLink[]) stored as JSONB — only ever read forward
 * off its own spread, never reverse-queried.
 *
 * Read authority (resolved by the caller, MagazineSpread.tsx):
 *     const spreads = (await list(projectId)) ?? project.spreads
 *   • list() returns mapped Supabase rows when the table has data for the project.
 *   • list() returns NULL — "no Supabase answer, use your local copy" — when Supabase
 *     is disabled, the project id is non-UUID, the query errors, or there are no rows.
 *
 * Write helpers (called by useMagazineSpreadSync only) dual-write best-effort: the
 * local store stays authoritative; failures are logged, never thrown, never rolled back.
 */
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { Json, MagazineSpreadRow, MagazineSpreadInsert } from '@/lib/supabase.types'
import type { Spread, SpreadLink, SpreadContentType, SpreadStatus } from '@/types/magazine'

// ─── Mapping ──────────────────────────────────────────────────────────────────

// row → app-facing Spread. links: JSONB → SpreadLink[]; sort_order → order.
function rowToSpread(r: MagazineSpreadRow): Spread {
  return {
    id:          r.id,
    pages:       r.pages,
    contentType: r.content_type as SpreadContentType,  // text+CHECK pinned to domain
    section:     r.section,
    ownerId:     r.owner_id,
    links:       (r.links as unknown as SpreadLink[]) ?? [],
    status:      r.status as SpreadStatus,             // text+CHECK pinned to domain
    notes:       r.notes,
    order:       r.sort_order,
    createdAt:   r.created_at,
  }
}

// Spread → row (created_at preserved from local; updated_at bumped on write).
function spreadToRow(s: Spread, projectId: string): MagazineSpreadInsert {
  return {
    id:           s.id,
    project_id:   projectId,
    pages:        s.pages,
    content_type: s.contentType,
    section:      s.section,
    owner_id:     s.ownerId,
    links:        s.links as unknown as Json,
    status:       s.status,
    notes:        s.notes,
    sort_order:   s.order,
    created_at:   s.createdAt,
    updated_at:   new Date().toISOString(),
  }
}

// ─── Read (Supabase-first, null = caller falls back to local) ─────────────────

export const MagazineSpreadRepository = {
  /**
   * Supabase-first read of a project's spreads (ordered by sort_order).
   * Returns a mapped array when Supabase has ≥1 row; otherwise NULL to signal the
   * caller to fall back to its local store copy (disabled / non-UUID / error / empty).
   */
  async list(projectId: string): Promise<Spread[] | null> {
    if (!isSupabaseEnabled || !supabase) return null
    if (!isValidUUID(projectId)) return null

    const { data, error } = await supabase
      .from('magazine_spreads')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.warn('[MagazineSpreadRepo] list failed:', projectId, error.message)
      return null
    }
    if (!data || data.length === 0) return null  // no rows yet → fall back to local

    return data.map(rowToSpread)
  },
}

// ─── Supabase write helpers (Phase 5E — called by useMagazineSpreadSync only) ───
// Plain exported functions — NOT on MagazineSpreadRepository (which stays read-only).

/**
 * Upsert one spread — INSERT for adds, UPDATE for edits/moves (conflict target id).
 * Skips non-UUID ids (seed-mag-* spreads / projects stay local-only).
 * FK magazine_spreads.project_id → projects(id): a 23503 means the project row isn't
 * in Supabase yet (Phase 4 push pending) — logged, self-heals on the next change.
 */
export async function supabasePushSpread(spread: Spread, projectId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(spread.id) || !isValidUUID(projectId)) return

  const { error } = await supabase
    .from('magazine_spreads')
    .upsert(spreadToRow(spread, projectId), { onConflict: 'id', ignoreDuplicates: false })
  if (error) {
    if (error.code === '23503') {
      console.warn('[MagazineSpreadSync] FK violation — project not yet in Supabase:', { spreadId: spread.id, projectId }, error.message)
    } else {
      console.warn('[MagazineSpreadSync] push failed:', spread.id, error.message)
    }
  }
}

/** Delete one spread by id. Skips non-UUID ids. */
export async function supabaseDeleteSpread(spreadId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(spreadId)) return

  const { error } = await supabase.from('magazine_spreads').delete().eq('id', spreadId)
  if (error) console.warn('[MagazineSpreadSync] delete failed:', spreadId, error.message)
}
