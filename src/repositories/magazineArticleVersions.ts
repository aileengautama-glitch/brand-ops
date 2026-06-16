/**
 * Magazine article versions repository — Supabase-first reads + dual-write helpers for
 * the article body snapshots (ArticleVersion). Second writing-workspace array; FIRST with
 * a hard article FK. Mirrors magazineWriterHours.ts.
 *
 * Phase 5N: flat snapshots, add/remove only (immutable once created). Each version FKs
 * both project (project_id) and its article (article_id, hard FK to magazine_articles).
 *
 * Push guard (locked decision): a version is pushed only when its own id, the project id,
 * AND the parent article id are all valid UUIDs. Versions of non-UUID SEED articles stay
 * local-only (their parent isn't in Supabase), so the hard article FK is always satisfiable.
 *
 * Read authority (resolved by the caller, MagazineArticle.tsx):
 *     const versions = (await list(projectId)) ?? project.articleVersions   // then .filter by articleId
 *   • list() returns mapped Supabase rows when the table has data for the project.
 *   • list() returns NULL when Supabase is disabled / non-UUID id / error / no rows.
 *
 * Write helpers (called by useMagazineArticleVersionSync only) dual-write best-effort: the
 * local store stays authoritative; failures are logged, never thrown, never rolled back.
 */
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { MagazineArticleVersionRow, MagazineArticleVersionInsert } from '@/lib/supabase.types'
import type { ArticleVersion } from '@/types/magazine'

// ─── Mapping ──────────────────────────────────────────────────────────────────

// row → app-facing ArticleVersion. nullable soft ref → ''.
function rowToVersion(r: MagazineArticleVersionRow): ArticleVersion {
  return {
    id:         r.id,
    articleId:  r.article_id,
    label:      r.label,
    body:       r.body,
    wordCount:  r.word_count,
    authorId:   r.author_id ?? '',   // null → ''
    authorName: r.author_name,
    note:       r.note,
    createdAt:  r.created_at,
  }
}

// ArticleVersion → row. '' → null for the nullable soft ref; created_at preserved; updated bumped.
function versionToRow(v: ArticleVersion, projectId: string): MagazineArticleVersionInsert {
  return {
    id:          v.id,
    project_id:  projectId,
    article_id:  v.articleId,
    label:       v.label,
    body:        v.body,
    word_count:  v.wordCount,
    author_id:   v.authorId || null,
    author_name: v.authorName,
    note:        v.note,
    created_at:  v.createdAt,
    updated_at:  new Date().toISOString(),
  }
}

// ─── Read (Supabase-first, null = caller falls back to local) ─────────────────

export const MagazineArticleVersionRepository = {
  /**
   * Supabase-first read of a project's article versions (ordered by created_at).
   * The caller filters per-article. Returns a mapped array when Supabase has ≥1 row;
   * otherwise NULL to signal the caller to fall back to its local store copy.
   */
  async list(projectId: string): Promise<ArticleVersion[] | null> {
    if (!isSupabaseEnabled || !supabase) return null
    if (!isValidUUID(projectId)) return null

    const { data, error } = await supabase
      .from('magazine_article_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('[MagazineArticleVersionRepo] list failed:', projectId, error.message)
      return null
    }
    if (!data || data.length === 0) return null  // no rows yet → fall back to local

    return data.map(rowToVersion)
  },
}

// ─── Supabase write helpers (Phase 5N — called by useMagazineArticleVersionSync only) ─
// Plain exported functions — NOT on MagazineArticleVersionRepository (read-only object).

/**
 * Upsert one article version. INSERT for adds (versions are add/remove only).
 * GUARD: skip unless id, projectId, AND articleId are all valid UUIDs — versions of
 * non-UUID seed articles stay local-only (the hard article FK couldn't be satisfied).
 * Two FK deps (project_id → projects, article_id → magazine_articles): a 23503 means a
 * parent isn't in Supabase yet — logged, self-heals on the next change.
 */
export async function supabasePushArticleVersion(version: ArticleVersion, projectId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(version.id) || !isValidUUID(projectId) || !isValidUUID(version.articleId)) return

  const { error } = await supabase
    .from('magazine_article_versions')
    .upsert(versionToRow(version, projectId), { onConflict: 'id', ignoreDuplicates: false })
  if (error) {
    if (error.code === '23503') {
      console.warn('[MagazineArticleVersionSync] FK violation — project or article not yet in Supabase:', { versionId: version.id, projectId, articleId: version.articleId }, error.message)
    } else {
      console.warn('[MagazineArticleVersionSync] push failed:', version.id, error.message)
    }
  }
}

/** Delete one article version by id. Skips non-UUID ids. No-op if the row was never pushed. */
export async function supabaseDeleteArticleVersion(versionId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(versionId)) return

  const { error } = await supabase.from('magazine_article_versions').delete().eq('id', versionId)
  if (error) console.warn('[MagazineArticleVersionSync] delete failed:', versionId, error.message)
}
