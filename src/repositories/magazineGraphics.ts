/**
 * Magazine graphics repository — Supabase-first reads + dual-write helpers for the
 * graphics (design deliverables) content entity. Mirrors magazineSpreads.ts.
 *
 * Phase 5F: the third magazine content slice. Two owned arrays are stored as JSONB
 * (imageIds, resultLinks); several soft cross-ref ids are nullable text.
 *
 * IMAGE BOUNDARY: previewImageId and imageIds are SOFT references (media/IndexedDB
 * keys) ONLY. Image bytes are never stored here — they live in IndexedDB and sync via
 * the existing media table. This repo round-trips the keys; it never touches blobs.
 *
 * Read authority (resolved by the caller, MagazineGraphics.tsx):
 *     const graphics = (await list(projectId)) ?? project.graphics
 *   • list() returns mapped Supabase rows when the table has data for the project.
 *   • list() returns NULL — "use your local copy" — when Supabase is disabled, the
 *     project id is non-UUID, the query errors, or there are no rows.
 *
 * Write helpers (called by useMagazineGraphicSync only) dual-write best-effort: the
 * local store stays authoritative; failures are logged, never thrown, never rolled back.
 */
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { Json, MagazineGraphicRow, MagazineGraphicInsert } from '@/lib/supabase.types'
import type { Graphic, GraphicStatus, VisualResultLink } from '@/types/magazine'

// ─── Mapping ──────────────────────────────────────────────────────────────────

// row → app-facing Graphic. JSONB arrays → typed arrays; nullable soft refs → '' .
function rowToGraphic(r: MagazineGraphicRow): Graphic {
  return {
    id:              r.id,
    title:           r.title,
    formatDetail:    r.format_detail,
    assignee:        r.assignee,
    status:          r.status as GraphicStatus,           // text+CHECK pinned to domain
    previewImageId:  r.preview_image_id ?? '',            // null → '' (soft ref)
    imageIds:        (r.image_ids as unknown as string[]) ?? [],
    brief:           r.brief,
    notes:           r.notes,
    order:           r.sort_order,
    createdAt:       r.created_at,
    articleId:       r.article_id ?? '',                  // null → ''
    visualProjectId: r.visual_project_id ?? '',           // null → ''
    moodTileId:      r.mood_tile_id ?? '',                // null → ''
    dropboxLink:     r.dropbox_link,
    resultLinks:     (r.result_links as unknown as VisualResultLink[]) ?? [],
  }
}

// Graphic → row. '' → null for the nullable soft refs; created_at preserved; updated bumped.
function graphicToRow(g: Graphic, projectId: string): MagazineGraphicInsert {
  return {
    id:                g.id,
    project_id:        projectId,
    title:             g.title,
    format_detail:     g.formatDetail,
    assignee:          g.assignee,
    status:            g.status,
    preview_image_id:  g.previewImageId || null,
    image_ids:         g.imageIds as unknown as Json,
    brief:             g.brief,
    notes:             g.notes,
    article_id:        g.articleId || null,
    visual_project_id: g.visualProjectId || null,
    mood_tile_id:      g.moodTileId || null,
    dropbox_link:      g.dropboxLink,
    result_links:      g.resultLinks as unknown as Json,
    sort_order:        g.order,
    created_at:        g.createdAt,
    updated_at:        new Date().toISOString(),
  }
}

// ─── Read (Supabase-first, null = caller falls back to local) ─────────────────

export const MagazineGraphicRepository = {
  /**
   * Supabase-first read of a project's graphics (ordered by sort_order).
   * Returns a mapped array when Supabase has ≥1 row; otherwise NULL to signal the
   * caller to fall back to its local store copy (disabled / non-UUID / error / empty).
   */
  async list(projectId: string): Promise<Graphic[] | null> {
    if (!isSupabaseEnabled || !supabase) return null
    if (!isValidUUID(projectId)) return null

    const { data, error } = await supabase
      .from('magazine_graphics')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.warn('[MagazineGraphicRepo] list failed:', projectId, error.message)
      return null
    }
    if (!data || data.length === 0) return null  // no rows yet → fall back to local

    return data.map(rowToGraphic)
  },
}

// ─── Supabase write helpers (Phase 5F — called by useMagazineGraphicSync only) ──
// Plain exported functions — NOT on MagazineGraphicRepository (which stays read-only).

/**
 * Upsert one graphic — INSERT for adds, UPDATE for edits/moves (conflict target id).
 * Skips non-UUID ids (seed-mag-* graphics / projects stay local-only).
 * FK magazine_graphics.project_id → projects(id): a 23503 means the project row isn't
 * in Supabase yet (Phase 4 push pending) — logged, self-heals on the next change.
 * Image bytes are NOT written here — only the soft key references.
 */
export async function supabasePushGraphic(graphic: Graphic, projectId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(graphic.id) || !isValidUUID(projectId)) return

  const { error } = await supabase
    .from('magazine_graphics')
    .upsert(graphicToRow(graphic, projectId), { onConflict: 'id', ignoreDuplicates: false })
  if (error) {
    if (error.code === '23503') {
      console.warn('[MagazineGraphicSync] FK violation — project not yet in Supabase:', { graphicId: graphic.id, projectId }, error.message)
    } else {
      console.warn('[MagazineGraphicSync] push failed:', graphic.id, error.message)
    }
  }
}

/** Delete one graphic by id. Skips non-UUID ids. Image bytes (IndexedDB) are untouched. */
export async function supabaseDeleteGraphic(graphicId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(graphicId)) return

  const { error } = await supabase.from('magazine_graphics').delete().eq('id', graphicId)
  if (error) console.warn('[MagazineGraphicSync] delete failed:', graphicId, error.message)
}
