/**
 * Magazine article comments repository — Supabase-first reads + dual-write helpers for the
 * per-article discussion thread (ArticleComment). Final writing-workspace array. Mirrors
 * magazineArticleVersions.ts, with a nullable jsonb `anchor` and a resolve update path.
 *
 * Phase 5O: each comment FKs both project (project_id) and its article (article_id, hard
 * FK to magazine_articles). Mutable via resolveArticleComment (status + resolver snapshot).
 *
 * Push guard (locked decision): a comment is pushed only when its own id, the project id,
 * AND the parent article id are all valid UUIDs. Comments of non-UUID SEED articles stay
 * local-only (their parent isn't in Supabase), so the hard article FK is always satisfiable.
 *
 * anchor round-trip: the app type's `anchor?` is optional. Write undefined → null; read
 * null → undefined (the field is simply not set). The ArticleCommentAnchor type is not
 * widened or refactored.
 *
 * Read authority (resolved by the caller, MagazineArticle.tsx):
 *     const comments = (await list(projectId)) ?? project.articleComments   // then .filter by articleId
 *   • list() returns mapped Supabase rows when the table has data for the project.
 *   • list() returns NULL when Supabase is disabled / non-UUID id / error / no rows.
 *
 * Write helpers (called by useMagazineArticleCommentSync only) dual-write best-effort: the
 * local store stays authoritative; failures are logged, never thrown, never rolled back.
 */
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { Json, MagazineArticleCommentRow, MagazineArticleCommentInsert } from '@/lib/supabase.types'
import type { ArticleComment, ArticleCommentAnchor, ArticleNoteKind, ArticleNoteStatus } from '@/types/magazine'

// ─── Mapping ──────────────────────────────────────────────────────────────────

// row → app-facing ArticleComment. nullable soft refs → ''; anchor null → undefined.
function rowToComment(r: MagazineArticleCommentRow): ArticleComment {
  const comment: ArticleComment = {
    id:             r.id,
    articleId:      r.article_id,
    kind:           r.kind as ArticleNoteKind,       // text+CHECK pinned to domain
    authorId:       r.author_id ?? '',               // null → ''
    authorName:     r.author_name,
    body:           r.body,
    status:         r.status as ArticleNoteStatus,   // text+CHECK pinned to domain
    resolvedById:   r.resolved_by_id ?? '',          // null → ''
    resolvedByName: r.resolved_by_name,
    resolvedAt:     r.resolved_at,
    createdAt:      r.created_at,
  }
  // anchor is optional on the app type: only set it when the row carries one (null → undefined).
  const anchor = r.anchor as ArticleCommentAnchor | null
  if (anchor) comment.anchor = anchor
  return comment
}

// ArticleComment → row. '' → null for nullable soft refs; undefined anchor → null;
// created_at preserved; the DB write marker updated_at is bumped.
function commentToRow(c: ArticleComment, projectId: string): MagazineArticleCommentInsert {
  return {
    id:               c.id,
    project_id:       projectId,
    article_id:       c.articleId,
    kind:             c.kind,
    author_id:        c.authorId || null,
    author_name:      c.authorName,
    body:             c.body,
    status:           c.status,
    resolved_by_id:   c.resolvedById || null,
    resolved_by_name: c.resolvedByName,
    resolved_at:      c.resolvedAt,
    anchor:           c.anchor ? (c.anchor as unknown as Json) : null,
    created_at:       c.createdAt,
    updated_at:       new Date().toISOString(),
  }
}

// ─── Read (Supabase-first, null = caller falls back to local) ─────────────────

export const MagazineArticleCommentRepository = {
  /**
   * Supabase-first read of a project's article comments (ordered by created_at).
   * The caller filters per-article. Returns a mapped array when Supabase has ≥1 row;
   * otherwise NULL to signal the caller to fall back to its local store copy.
   */
  async list(projectId: string): Promise<ArticleComment[] | null> {
    if (!isSupabaseEnabled || !supabase) return null
    if (!isValidUUID(projectId)) return null

    const { data, error } = await supabase
      .from('magazine_article_comments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('[MagazineArticleCommentRepo] list failed:', projectId, error.message)
      return null
    }
    if (!data || data.length === 0) return null  // no rows yet → fall back to local

    return data.map(rowToComment)
  },
}

// ─── Supabase write helpers (Phase 5O — called by useMagazineArticleCommentSync only) ─
// Plain exported functions — NOT on MagazineArticleCommentRepository (read-only object).

/**
 * Upsert one article comment. INSERT for adds, UPDATE for resolves (conflict target id).
 * GUARD: skip unless id, projectId, AND articleId are all valid UUIDs — comments of
 * non-UUID seed articles stay local-only (the hard article FK couldn't be satisfied).
 * Two FK deps (project_id → projects, article_id → magazine_articles): a 23503 means a
 * parent isn't in Supabase yet — logged, self-heals on the next change.
 */
export async function supabasePushArticleComment(comment: ArticleComment, projectId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(comment.id) || !isValidUUID(projectId) || !isValidUUID(comment.articleId)) return

  const { error } = await supabase
    .from('magazine_article_comments')
    .upsert(commentToRow(comment, projectId), { onConflict: 'id', ignoreDuplicates: false })
  if (error) {
    if (error.code === '23503') {
      console.warn('[MagazineArticleCommentSync] FK violation — project or article not yet in Supabase:', { commentId: comment.id, projectId, articleId: comment.articleId }, error.message)
    } else {
      console.warn('[MagazineArticleCommentSync] push failed:', comment.id, error.message)
    }
  }
}

/** Delete one article comment by id. Skips non-UUID ids. No-op if the row was never pushed. */
export async function supabaseDeleteArticleComment(commentId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(commentId)) return

  const { error } = await supabase.from('magazine_article_comments').delete().eq('id', commentId)
  if (error) console.warn('[MagazineArticleCommentSync] delete failed:', commentId, error.message)
}
