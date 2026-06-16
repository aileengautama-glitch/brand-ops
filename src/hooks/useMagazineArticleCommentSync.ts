/**
 * useMagazineArticleCommentSync — Phase 5O write-path: local → Supabase for article comments.
 *
 * Dual-write: the local Zustand store stays authoritative; every article-comment change is
 * mirrored to the magazine_article_comments table best-effort (errors logged, never thrown,
 * never rolled back). Mirrors useMagazineArticleVersionSync.
 *
 * Final writing-workspace array. Unlike versions, comments are MUTABLE via
 * resolveArticleComment (status + resolver snapshot), so the content signature includes the
 * resolution fields and a resolve syncs as an upsert (UPDATE), not delete+recreate.
 *
 * The push helper enforces the locked guard: a comment is pushed only when id + projectId +
 * articleId are all valid UUIDs, so comments of non-UUID SEED articles stay local-only. Two
 * FK deps (project_id, article_id) both self-heal.
 *
 * What it does:
 *   1. On mount: pushes every current UUID comment (upsert — safe to re-run).
 *   2. Subscribes to useMagazineStore and diffs comments across ALL projects:
 *        - comment added / resolved / edited → supabasePushArticleComment (upsert)
 *        - comment removed                   → supabaseDeleteArticleComment
 *
 * Comments are nested content (projects[].articleComments[]), flattened into a Map keyed by
 * comment id. The content signature covers all persisted fields incl. the resolution fields
 * and the (normalized) anchor. Non-UUID seed ids are skipped here; the parent-article-UUID
 * guard lives in the push helper.
 *
 * No echo-loop risk (so no value-dedup map): the Phase 5O read is component-local
 * (MagazineArticle.tsx) and does NOT hydrate the store, so a Supabase write can never bounce
 * back into the store to re-trigger this subscriber.
 *
 * Called once from AppShell. No-op when VITE_SUPABASE_URL/ANON_KEY are absent.
 */
import { useEffect } from 'react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import { supabasePushArticleComment, supabaseDeleteArticleComment } from '@/repositories/magazineArticleComments'
import type { MagazineProject, ArticleComment } from '@/types/magazine'

type FlatComment = { projectId: string; comment: ArticleComment }

// Flatten projects[].articleComments[] into a map keyed by comment id (UUID-guarded).
// The parent-article-UUID guard is enforced in the push helper (not here).
function flattenComments(projects: MagazineProject[]): Map<string, FlatComment> {
  const map = new Map<string, FlatComment>()
  for (const p of projects) {
    if (!isValidUUID(p.id)) continue
    for (const comment of p.articleComments) {
      if (!isValidUUID(comment.id)) continue
      map.set(comment.id, { projectId: p.id, comment })
    }
  }
  return map
}

// Content signature — covers every persisted field, incl. the resolution fields and the
// (normalized) anchor. No order / updatedAt on this entity.
function contentSig(c: ArticleComment): string {
  return JSON.stringify({
    articleId: c.articleId, kind: c.kind, authorId: c.authorId, authorName: c.authorName,
    body: c.body, status: c.status, resolvedById: c.resolvedById, resolvedByName: c.resolvedByName,
    resolvedAt: c.resolvedAt, createdAt: c.createdAt, anchor: c.anchor ?? null,
  })
}

export function useMagazineArticleCommentSync(): void {
  useEffect(() => {
    // No-op when Supabase is not configured (missing env vars, offline, CI, etc.)
    if (!isSupabaseEnabled) return

    // ── 1. Initial push: every current UUID comment → Supabase (upsert) ─────────
    // The push helper additionally skips comments whose parent article id is non-UUID.
    void (async () => {
      for (const { projectId, comment } of flattenComments(useMagazineStore.getState().projects).values()) {
        await supabasePushArticleComment(comment, projectId)
      }
    })()

    // ── 2. Subscribe: diff prev vs next; push adds/resolves, delete removals ─────
    const unsub = useMagazineStore.subscribe((state, prevState) => {
      if (state.projects === prevState.projects) return  // fast-path

      const prev = flattenComments(prevState.projects)
      const next = flattenComments(state.projects)

      // Added or changed (incl. resolve) → upsert
      for (const [id, row] of next) {
        const before = prev.get(id)
        if (!before || contentSig(before.comment) !== contentSig(row.comment)) {
          void supabasePushArticleComment(row.comment, row.projectId)
        }
      }

      // Removed → delete
      for (const id of prev.keys()) {
        if (!next.has(id)) void supabaseDeleteArticleComment(id)
      }
    })

    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
