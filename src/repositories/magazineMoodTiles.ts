/**
 * Magazine mood tiles repository — Supabase-first reads + dual-write helpers for the
 * Visual moodboard tiles (MoodTile) content entity. Mirrors magazineTasks.ts.
 *
 * Phase 5J: the simplest content entity — flat, no nested arrays, no app updatedAt.
 *
 * IMAGE BOUNDARY: image_id is a SOFT reference (IndexedDB/media key) ONLY. Image bytes
 * are never stored here — they live in IndexedDB and sync via the existing media table.
 * '' for color-swatch-only tiles. This repo round-trips the key; it never touches blobs.
 *
 * Read authority (resolved by the caller, MagazineVisual.tsx):
 *     const tiles = (await list(projectId)) ?? project.moodTiles
 *   • list() returns mapped Supabase rows when the table has data for the project.
 *   • list() returns NULL — "use your local copy" — when Supabase is disabled, the
 *     project id is non-UUID, the query errors, or there are no rows.
 *
 * Write helpers (called by useMagazineMoodTileSync only) dual-write best-effort: the
 * local store stays authoritative; failures are logged, never thrown, never rolled back.
 */
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { MagazineMoodTileRow, MagazineMoodTileInsert } from '@/lib/supabase.types'
import type { MoodTile } from '@/types/magazine'

// ─── Mapping ──────────────────────────────────────────────────────────────────

// row → app-facing MoodTile. image_id is plain text ('' preserved); sort_order → order.
function rowToMoodTile(r: MagazineMoodTileRow): MoodTile {
  return {
    id:        r.id,
    imageId:   r.image_id,   // soft ref (IndexedDB/media key), '' for color swatches
    caption:   r.caption,
    color:     r.color,
    order:     r.sort_order,
    createdAt: r.created_at,
  }
}

// MoodTile → row. created_at preserved; the DB write marker updated_at is bumped.
function moodTileToRow(m: MoodTile, projectId: string): MagazineMoodTileInsert {
  return {
    id:         m.id,
    project_id: projectId,
    image_id:   m.imageId,
    caption:    m.caption,
    color:      m.color,
    sort_order: m.order,
    created_at: m.createdAt,
    updated_at: new Date().toISOString(),
  }
}

// ─── Read (Supabase-first, null = caller falls back to local) ─────────────────

export const MagazineMoodTileRepository = {
  /**
   * Supabase-first read of a project's mood tiles (ordered by sort_order).
   * Returns a mapped array when Supabase has ≥1 row; otherwise NULL to signal the
   * caller to fall back to its local store copy (disabled / non-UUID / error / empty).
   */
  async list(projectId: string): Promise<MoodTile[] | null> {
    if (!isSupabaseEnabled || !supabase) return null
    if (!isValidUUID(projectId)) return null

    const { data, error } = await supabase
      .from('magazine_mood_tiles')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.warn('[MagazineMoodTileRepo] list failed:', projectId, error.message)
      return null
    }
    if (!data || data.length === 0) return null  // no rows yet → fall back to local

    return data.map(rowToMoodTile)
  },
}

// ─── Supabase write helpers (Phase 5J — called by useMagazineMoodTileSync only) ─
// Plain exported functions — NOT on MagazineMoodTileRepository (read-only object).

/**
 * Upsert one mood tile — INSERT for adds, UPDATE for edits/reorders (conflict id).
 * Skips non-UUID ids (seed-mag-* tiles / projects stay local-only).
 * FK magazine_mood_tiles.project_id → projects(id): a 23503 means the project row isn't
 * in Supabase yet (Phase 4 push pending) — logged, self-heals on the next change.
 * Image bytes are NOT written here — only the soft key reference.
 */
export async function supabasePushMoodTile(tile: MoodTile, projectId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(tile.id) || !isValidUUID(projectId)) return

  const { error } = await supabase
    .from('magazine_mood_tiles')
    .upsert(moodTileToRow(tile, projectId), { onConflict: 'id', ignoreDuplicates: false })
  if (error) {
    if (error.code === '23503') {
      console.warn('[MagazineMoodTileSync] FK violation — project not yet in Supabase:', { tileId: tile.id, projectId }, error.message)
    } else {
      console.warn('[MagazineMoodTileSync] push failed:', tile.id, error.message)
    }
  }
}

/** Delete one mood tile by id. Skips non-UUID ids. Image bytes (IndexedDB) are untouched. */
export async function supabaseDeleteMoodTile(tileId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(tileId)) return

  const { error } = await supabase.from('magazine_mood_tiles').delete().eq('id', tileId)
  if (error) console.warn('[MagazineMoodTileSync] delete failed:', tileId, error.message)
}
