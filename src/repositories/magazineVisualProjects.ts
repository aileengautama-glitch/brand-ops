/**
 * Magazine visual projects repository — Supabase-first reads + dual-write helpers for
 * the visual projects (shoot-style productions) content entity. Mirrors magazineGraphics.ts.
 *
 * Phase 5H: the last top-level magazine content entity with nested arrays. Two owned
 * arrays are stored as JSONB (shots, resultLinks); a couple of soft cross-ref ids are
 * nullable text.
 *
 * updatedAt: VisualProject carries its OWN updatedAt (last-edit time). It maps to the
 * dedicated app_updated_at column; the DB row's updated_at is the write marker (bumped
 * on every push) — the two are never overloaded.
 *
 * Read authority (resolved by the caller, MagazineVisual.tsx):
 *     const list = (await list(projectId)) ?? project.visualProjects
 *   • list() returns mapped Supabase rows when the table has data for the project.
 *   • list() returns NULL — "use your local copy" — when Supabase is disabled, the
 *     project id is non-UUID, the query errors, or there are no rows.
 *
 * Write helpers (called by useMagazineVisualProjectSync only) dual-write best-effort:
 * the local store stays authoritative; failures are logged, never thrown, never rolled back.
 */
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { Json, MagazineVisualProjectRow, MagazineVisualProjectInsert } from '@/lib/supabase.types'
import type { VisualProject, VisualProjectStatus, VisualShot, VisualResultLink } from '@/types/magazine'

// ─── Mapping ──────────────────────────────────────────────────────────────────

// row → app-facing VisualProject. JSONB arrays → typed arrays; nullable soft refs → '';
// app_updated_at → updatedAt; sort_order → order.
function rowToVisualProject(r: MagazineVisualProjectRow): VisualProject {
  return {
    id:          r.id,
    name:        r.name,
    concept:     r.concept,
    status:      r.status as VisualProjectStatus,        // text+CHECK pinned to domain
    shootDate:   r.shoot_date,
    location:    r.location,
    assignedTo:  r.assigned_to ?? '',                    // null → ''
    articleId:   r.article_id ?? '',                     // null → ''
    shots:       (r.shots as unknown as VisualShot[]) ?? [],
    resultLinks: (r.result_links as unknown as VisualResultLink[]) ?? [],
    notes:       r.notes,
    order:       r.sort_order,
    createdAt:   r.created_at,
    updatedAt:   r.app_updated_at,                       // app entity's updatedAt
  }
}

// VisualProject → row. '' → null for nullable soft refs; updatedAt → app_updated_at;
// created_at preserved; the DB write marker updated_at is bumped.
function visualProjectToRow(v: VisualProject, projectId: string): MagazineVisualProjectInsert {
  return {
    id:             v.id,
    project_id:     projectId,
    name:           v.name,
    concept:        v.concept,
    status:         v.status,
    shoot_date:     v.shootDate,
    location:       v.location,
    assigned_to:    v.assignedTo || null,
    article_id:     v.articleId || null,
    shots:          v.shots as unknown as Json,
    result_links:   v.resultLinks as unknown as Json,
    notes:          v.notes,
    sort_order:     v.order,
    app_updated_at: v.updatedAt,
    created_at:     v.createdAt,
    updated_at:     new Date().toISOString(),
  }
}

// ─── Read (Supabase-first, null = caller falls back to local) ─────────────────

export const MagazineVisualProjectRepository = {
  /**
   * Supabase-first read of a project's visual projects (ordered by sort_order).
   * Returns a mapped array when Supabase has ≥1 row; otherwise NULL to signal the
   * caller to fall back to its local store copy (disabled / non-UUID / error / empty).
   */
  async list(projectId: string): Promise<VisualProject[] | null> {
    if (!isSupabaseEnabled || !supabase) return null
    if (!isValidUUID(projectId)) return null

    const { data, error } = await supabase
      .from('magazine_visual_projects')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.warn('[MagazineVisualProjectRepo] list failed:', projectId, error.message)
      return null
    }
    if (!data || data.length === 0) return null  // no rows yet → fall back to local

    return data.map(rowToVisualProject)
  },
}

// ─── Supabase write helpers (Phase 5H — called by useMagazineVisualProjectSync only) ──
// Plain exported functions — NOT on MagazineVisualProjectRepository (read-only object).

/**
 * Upsert one visual project — INSERT for adds, UPDATE for edits (conflict target id).
 * Skips non-UUID ids (seed-mag-* visual projects / projects stay local-only).
 * FK magazine_visual_projects.project_id → projects(id): a 23503 means the project row
 * isn't in Supabase yet (Phase 4 push pending) — logged, self-heals on the next change.
 */
export async function supabasePushVisualProject(vp: VisualProject, projectId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(vp.id) || !isValidUUID(projectId)) return

  const { error } = await supabase
    .from('magazine_visual_projects')
    .upsert(visualProjectToRow(vp, projectId), { onConflict: 'id', ignoreDuplicates: false })
  if (error) {
    if (error.code === '23503') {
      console.warn('[MagazineVisualProjectSync] FK violation — project not yet in Supabase:', { visualProjectId: vp.id, projectId }, error.message)
    } else {
      console.warn('[MagazineVisualProjectSync] push failed:', vp.id, error.message)
    }
  }
}

/** Delete one visual project by id. Skips non-UUID ids. */
export async function supabaseDeleteVisualProject(visualProjectId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(visualProjectId)) return

  const { error } = await supabase.from('magazine_visual_projects').delete().eq('id', visualProjectId)
  if (error) console.warn('[MagazineVisualProjectSync] delete failed:', visualProjectId, error.message)
}
