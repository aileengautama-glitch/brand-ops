/**
 * Magazine writer hours repository — Supabase-first reads + dual-write helpers for the
 * writer hours log (WriterHoursEntry). First of the writing-workspace arrays. Mirrors
 * magazineBudgetItems.ts.
 *
 * Phase 5M: flat project-level time log, each entry optionally linked to an article.
 * CRITICAL: article_id is a SOFT ref (no hard FK) — entries may be general (articleId='').
 * Only project_id is a real foreign key.
 *
 * numeric column (hours) can arrive from PostgREST as a string — the row→app mapper
 * coerces it with Number() so the app always sees a real number.
 *
 * Read authority (resolved by the caller, MagazineWritingHours.tsx):
 *     const entries = (await list(projectId)) ?? project.writerHours
 *   • list() returns mapped Supabase rows when the table has data for the project.
 *   • list() returns NULL when Supabase is disabled / non-UUID id / error / no rows.
 *
 * Write helpers (called by useMagazineWriterHoursSync only) dual-write best-effort: the
 * local store stays authoritative; failures are logged, never thrown, never rolled back.
 */
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { MagazineWriterHoursRow, MagazineWriterHoursInsert } from '@/lib/supabase.types'
import type { WriterHoursEntry } from '@/types/magazine'

// ─── Mapping ──────────────────────────────────────────────────────────────────

// row → app-facing WriterHoursEntry. numeric → Number(); nullable soft refs → ''.
function rowToWriterHours(r: MagazineWriterHoursRow): WriterHoursEntry {
  return {
    id:        r.id,
    date:      r.date,
    hours:     Number(r.hours),       // numeric may arrive as a string
    note:      r.note,
    articleId: r.article_id ?? '',    // null → '' (general/unlinked)
    writerId:  r.writer_id ?? '',     // null → ''
    billable:  r.billable,
    createdAt: r.created_at,
  }
}

// WriterHoursEntry → row. '' → null for the nullable soft refs; created_at preserved;
// the DB write marker updated_at is bumped.
function writerHoursToRow(h: WriterHoursEntry, projectId: string): MagazineWriterHoursInsert {
  return {
    id:         h.id,
    project_id: projectId,
    date:       h.date,
    hours:      h.hours,
    note:       h.note,
    article_id: h.articleId || null,
    writer_id:  h.writerId || null,
    billable:   h.billable,
    created_at: h.createdAt,
    updated_at: new Date().toISOString(),
  }
}

// ─── Read (Supabase-first, null = caller falls back to local) ─────────────────

export const MagazineWriterHoursRepository = {
  /**
   * Supabase-first read of a project's writer hours (ordered by created_at — the entity
   * has no order field). Returns a mapped array when Supabase has ≥1 row; otherwise NULL
   * to signal the caller to fall back to its local store copy.
   */
  async list(projectId: string): Promise<WriterHoursEntry[] | null> {
    if (!isSupabaseEnabled || !supabase) return null
    if (!isValidUUID(projectId)) return null

    const { data, error } = await supabase
      .from('magazine_writer_hours')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('[MagazineWriterHoursRepo] list failed:', projectId, error.message)
      return null
    }
    if (!data || data.length === 0) return null  // no rows yet → fall back to local

    return data.map(rowToWriterHours)
  },
}

// ─── Supabase write helpers (Phase 5M — called by useMagazineWriterHoursSync only) ─
// Plain exported functions — NOT on MagazineWriterHoursRepository (read-only object).

/**
 * Upsert one writer-hours entry — INSERT for adds, UPDATE for edits (conflict target id).
 * Skips non-UUID ids (seed-mag-* entries / projects stay local-only).
 * FK magazine_writer_hours.project_id → projects(id): a 23503 means the project row isn't
 * in Supabase yet (Phase 4 push pending) — logged, self-heals on the next change.
 * article_id is a soft ref (no FK), so an unsynced article never blocks this write.
 */
export async function supabasePushWriterHours(entry: WriterHoursEntry, projectId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(entry.id) || !isValidUUID(projectId)) return

  const { error } = await supabase
    .from('magazine_writer_hours')
    .upsert(writerHoursToRow(entry, projectId), { onConflict: 'id', ignoreDuplicates: false })
  if (error) {
    if (error.code === '23503') {
      console.warn('[MagazineWriterHoursSync] FK violation — project not yet in Supabase:', { entryId: entry.id, projectId }, error.message)
    } else {
      console.warn('[MagazineWriterHoursSync] push failed:', entry.id, error.message)
    }
  }
}

/** Delete one writer-hours entry by id. Skips non-UUID ids. */
export async function supabaseDeleteWriterHours(entryId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(entryId)) return

  const { error } = await supabase.from('magazine_writer_hours').delete().eq('id', entryId)
  if (error) console.warn('[MagazineWriterHoursSync] delete failed:', entryId, error.message)
}
