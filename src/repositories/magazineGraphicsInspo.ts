/**
 * Magazine graphics inspiration repository — Supabase-first reads + dual-write helpers
 * for the Graphics inspiration board (GraphicsInspoItem). Mirrors magazineMoodTiles.ts.
 *
 * Phase 5K: flat entity, single soft image-id ref, no app updatedAt, no reorder action.
 *
 * IMAGE BOUNDARY: image_id is a SOFT reference (IndexedDB/media key) ONLY. Image bytes
 * are never stored here — they live in IndexedDB and sync via the existing media table.
 * '' until an image is uploaded. This repo round-trips the key; it never touches blobs.
 *
 * Read authority (resolved by the caller, MagazineGraphics.tsx):
 *     const inspo = (await list(projectId)) ?? project.graphicsInspo
 *   • list() returns mapped Supabase rows when the table has data for the project.
 *   • list() returns NULL — "use your local copy" — when Supabase is disabled, the
 *     project id is non-UUID, the query errors, or there are no rows.
 *
 * Write helpers (called by useMagazineGraphicsInspoSync only) dual-write best-effort:
 * the local store stays authoritative; failures are logged, never thrown, never rolled back.
 */
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { MagazineGraphicsInspoRow, MagazineGraphicsInspoInsert } from '@/lib/supabase.types'
import type { GraphicsInspoItem } from '@/types/magazine'

// ─── Mapping ──────────────────────────────────────────────────────────────────

// row → app-facing GraphicsInspoItem. image_id plain text ('' preserved); sort_order → order.
function rowToInspo(r: MagazineGraphicsInspoRow): GraphicsInspoItem {
  return {
    id:        r.id,
    imageId:   r.image_id,   // soft ref (IndexedDB/media key), '' if not uploaded
    caption:   r.caption,
    sourceUrl: r.source_url,
    order:     r.sort_order,
    createdAt: r.created_at,
  }
}

// GraphicsInspoItem → row. created_at preserved; the DB write marker updated_at is bumped.
function inspoToRow(i: GraphicsInspoItem, projectId: string): MagazineGraphicsInspoInsert {
  return {
    id:         i.id,
    project_id: projectId,
    image_id:   i.imageId,
    caption:    i.caption,
    source_url: i.sourceUrl,
    sort_order: i.order,
    created_at: i.createdAt,
    updated_at: new Date().toISOString(),
  }
}

// ─── Read (Supabase-first, null = caller falls back to local) ─────────────────

export const MagazineGraphicsInspoRepository = {
  /**
   * Supabase-first read of a project's graphics inspiration tiles (ordered by sort_order).
   * Returns a mapped array when Supabase has ≥1 row; otherwise NULL to signal the
   * caller to fall back to its local store copy (disabled / non-UUID / error / empty).
   */
  async list(projectId: string): Promise<GraphicsInspoItem[] | null> {
    if (!isSupabaseEnabled || !supabase) return null
    if (!isValidUUID(projectId)) return null

    const { data, error } = await supabase
      .from('magazine_graphics_inspo')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.warn('[MagazineGraphicsInspoRepo] list failed:', projectId, error.message)
      return null
    }
    if (!data || data.length === 0) return null  // no rows yet → fall back to local

    return data.map(rowToInspo)
  },
}

// ─── Supabase write helpers (Phase 5K — called by useMagazineGraphicsInspoSync only) ─
// Plain exported functions — NOT on MagazineGraphicsInspoRepository (read-only object).

/**
 * Upsert one inspiration tile — INSERT for adds, UPDATE for edits (conflict id).
 * Skips non-UUID ids (seed-mag-* items / projects stay local-only).
 * FK magazine_graphics_inspo.project_id → projects(id): a 23503 means the project row
 * isn't in Supabase yet (Phase 4 push pending) — logged, self-heals on the next change.
 * Image bytes are NOT written here — only the soft key reference.
 */
export async function supabasePushGraphicsInspo(item: GraphicsInspoItem, projectId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(item.id) || !isValidUUID(projectId)) return

  const { error } = await supabase
    .from('magazine_graphics_inspo')
    .upsert(inspoToRow(item, projectId), { onConflict: 'id', ignoreDuplicates: false })
  if (error) {
    if (error.code === '23503') {
      console.warn('[MagazineGraphicsInspoSync] FK violation — project not yet in Supabase:', { itemId: item.id, projectId }, error.message)
    } else {
      console.warn('[MagazineGraphicsInspoSync] push failed:', item.id, error.message)
    }
  }
}

/** Delete one inspiration tile by id. Skips non-UUID ids. Image bytes (IndexedDB) untouched. */
export async function supabaseDeleteGraphicsInspo(itemId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(itemId)) return

  const { error } = await supabase.from('magazine_graphics_inspo').delete().eq('id', itemId)
  if (error) console.warn('[MagazineGraphicsInspoSync] delete failed:', itemId, error.message)
}
