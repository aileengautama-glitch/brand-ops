/**
 * Magazine articles repository — Supabase-first reads + dual-write helpers for the
 * articles (writing deliverables) content entity. Mirrors magazineGraphics.ts.
 *
 * Phase 5G — SCOPE: Article[] FLAT FIELDS ONLY. The three project-level writing-
 * workspace arrays (articleComments, articleVersions, writerHours) are DEFERRED to
 * later slices and are neither read nor written here.
 *
 * Read authority (resolved by the caller, MagazineWriting.tsx):
 *     const articles = (await list(projectId)) ?? project.articles
 *   • list() returns mapped Supabase rows when the table has data for the project.
 *   • list() returns NULL — "use your local copy" — when Supabase is disabled, the
 *     project id is non-UUID, the query errors, or there are no rows.
 *
 * Write helpers (called by useMagazineArticleSync only) dual-write best-effort: the
 * local store stays authoritative; failures are logged, never thrown, never rolled back.
 */
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { MagazineArticleRow, MagazineArticleInsert } from '@/lib/supabase.types'
import type { Article, ArticleType, ArticleStatus } from '@/types/magazine'

// ─── Mapping ──────────────────────────────────────────────────────────────────

// row → app-facing Article. Nullable soft refs → ''; sort_order → order.
function rowToArticle(r: MagazineArticleRow): Article {
  return {
    id:               r.id,
    title:            r.title,
    type:             r.type as ArticleType,        // text+CHECK pinned to domain
    author:           r.author,
    assignedWriterId: r.assigned_writer_id ?? '',   // null → ''
    section:          r.section,
    brief:            r.brief,
    body:             r.body,
    wordCountTarget:  r.word_count_target,
    wordCountActual:  r.word_count_actual,
    deadline:         r.deadline,
    status:           r.status as ArticleStatus,    // text+CHECK pinned to domain
    notes:            r.notes,
    approverId:       r.approver_id ?? '',          // null → ''
    approvedById:     r.approved_by_id ?? '',       // null → ''
    approvedByName:   r.approved_by_name,
    approvedAt:       r.approved_at,
    order:            r.sort_order,
    createdAt:        r.created_at,
  }
}

// Article → row. '' → null for the nullable soft refs; created_at preserved; updated bumped.
function articleToRow(a: Article, projectId: string): MagazineArticleInsert {
  return {
    id:                 a.id,
    project_id:         projectId,
    title:              a.title,
    type:               a.type,
    author:             a.author,
    assigned_writer_id: a.assignedWriterId || null,
    section:            a.section,
    brief:              a.brief,
    body:               a.body,
    word_count_target:  a.wordCountTarget,
    word_count_actual:  a.wordCountActual,
    deadline:           a.deadline,
    status:             a.status,
    notes:              a.notes,
    approver_id:        a.approverId || null,
    approved_by_id:     a.approvedById || null,
    approved_by_name:   a.approvedByName,
    approved_at:        a.approvedAt,
    sort_order:         a.order,
    created_at:         a.createdAt,
    updated_at:         new Date().toISOString(),
  }
}

// ─── Read (Supabase-first, null = caller falls back to local) ─────────────────

export const MagazineArticleRepository = {
  /**
   * Supabase-first read of a project's articles (ordered by sort_order).
   * Returns a mapped array when Supabase has ≥1 row; otherwise NULL to signal the
   * caller to fall back to its local store copy (disabled / non-UUID / error / empty).
   */
  async list(projectId: string): Promise<Article[] | null> {
    if (!isSupabaseEnabled || !supabase) return null
    if (!isValidUUID(projectId)) return null

    const { data, error } = await supabase
      .from('magazine_articles')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.warn('[MagazineArticleRepo] list failed:', projectId, error.message)
      return null
    }
    if (!data || data.length === 0) return null  // no rows yet → fall back to local

    return data.map(rowToArticle)
  },
}

// ─── Supabase write helpers (Phase 5G — called by useMagazineArticleSync only) ──
// Plain exported functions — NOT on MagazineArticleRepository (which stays read-only).
// Flat Article fields only; the workspace arrays are NOT written here.

/**
 * Upsert one article — INSERT for adds, UPDATE for edits/moves (conflict target id).
 * Skips non-UUID ids (seed-mag-* articles / projects stay local-only).
 * FK magazine_articles.project_id → projects(id): a 23503 means the project row isn't
 * in Supabase yet (Phase 4 push pending) — logged, self-heals on the next change.
 */
export async function supabasePushArticle(article: Article, projectId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(article.id) || !isValidUUID(projectId)) return

  const { error } = await supabase
    .from('magazine_articles')
    .upsert(articleToRow(article, projectId), { onConflict: 'id', ignoreDuplicates: false })
  if (error) {
    if (error.code === '23503') {
      console.warn('[MagazineArticleSync] FK violation — project not yet in Supabase:', { articleId: article.id, projectId }, error.message)
    } else {
      console.warn('[MagazineArticleSync] push failed:', article.id, error.message)
    }
  }
}

/**
 * Delete one article by id. Skips non-UUID ids.
 * The local store cascades the article's workspace items (comments/versions/hours);
 * those are not mirrored to Supabase in this phase, so nothing to cascade here.
 */
export async function supabaseDeleteArticle(articleId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(articleId)) return

  const { error } = await supabase.from('magazine_articles').delete().eq('id', articleId)
  if (error) console.warn('[MagazineArticleSync] delete failed:', articleId, error.message)
}
