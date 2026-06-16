/**
 * useMagazineArticleVersionSync — Phase 5N write-path: local → Supabase for article versions.
 *
 * Dual-write: the local Zustand store stays authoritative; every article-version change is
 * mirrored to the magazine_article_versions table best-effort (errors logged, never thrown,
 * never rolled back). Mirrors useMagazineWriterHoursSync.
 *
 * Second writing-workspace array; first with a hard article FK. Versions are add/remove
 * only (immutable once created). The push helper enforces the locked guard: a version is
 * pushed only when id + projectId + articleId are all valid UUIDs, so versions of non-UUID
 * SEED articles stay local-only. Two FK deps (project_id, article_id) both self-heal.
 *
 * What it does:
 *   1. On mount: pushes every current UUID version (upsert — safe to re-run).
 *   2. Subscribes to useMagazineStore and diffs versions across ALL projects:
 *        - version added → supabasePushArticleVersion (upsert)
 *        - version removed → supabaseDeleteArticleVersion
 *      (No update path — versions are immutable; the generic diff covers it harmlessly.)
 *
 * Versions are nested content (projects[].articleVersions[]), flattened into a Map keyed
 * by version id. The content signature covers all persisted fields. Non-UUID seed ids are
 * skipped here; the parent-article-UUID guard lives in the push helper.
 *
 * No echo-loop risk (so no value-dedup map): the Phase 5N read is component-local
 * (MagazineArticle.tsx) and does NOT hydrate the store, so a Supabase write can never
 * bounce back into the store to re-trigger this subscriber.
 *
 * Called once from AppShell. No-op when VITE_SUPABASE_URL/ANON_KEY are absent.
 */
import { useEffect } from 'react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import { supabasePushArticleVersion, supabaseDeleteArticleVersion } from '@/repositories/magazineArticleVersions'
import type { MagazineProject, ArticleVersion } from '@/types/magazine'

type FlatVersion = { projectId: string; version: ArticleVersion }

// Flatten projects[].articleVersions[] into a map keyed by version id (UUID-guarded).
// The parent-article-UUID guard is enforced in the push helper (not here), so a version
// of a seed article is still tracked for removal but simply skipped on push.
function flattenVersions(projects: MagazineProject[]): Map<string, FlatVersion> {
  const map = new Map<string, FlatVersion>()
  for (const p of projects) {
    if (!isValidUUID(p.id)) continue
    for (const version of p.articleVersions) {
      if (!isValidUUID(version.id)) continue
      map.set(version.id, { projectId: p.id, version })
    }
  }
  return map
}

// Content signature — covers every persisted field (no order / updatedAt on this entity).
function contentSig(v: ArticleVersion): string {
  return JSON.stringify({
    articleId: v.articleId, label: v.label, body: v.body, wordCount: v.wordCount,
    authorId: v.authorId, authorName: v.authorName, note: v.note, createdAt: v.createdAt,
  })
}

export function useMagazineArticleVersionSync(): void {
  useEffect(() => {
    // No-op when Supabase is not configured (missing env vars, offline, CI, etc.)
    if (!isSupabaseEnabled) return

    // ── 1. Initial push: every current UUID version → Supabase (upsert) ──────────
    // The push helper additionally skips versions whose parent article id is non-UUID.
    void (async () => {
      for (const { projectId, version } of flattenVersions(useMagazineStore.getState().projects).values()) {
        await supabasePushArticleVersion(version, projectId)
      }
    })()

    // ── 2. Subscribe: diff prev vs next; push adds, delete removals ──────────────
    const unsub = useMagazineStore.subscribe((state, prevState) => {
      if (state.projects === prevState.projects) return  // fast-path

      const prev = flattenVersions(prevState.projects)
      const next = flattenVersions(state.projects)

      // Added or changed → upsert (versions are immutable, so practically just adds)
      for (const [id, row] of next) {
        const before = prev.get(id)
        if (!before || contentSig(before.version) !== contentSig(row.version)) {
          void supabasePushArticleVersion(row.version, row.projectId)
        }
      }

      // Removed → delete
      for (const id of prev.keys()) {
        if (!next.has(id)) void supabaseDeleteArticleVersion(id)
      }
    })

    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
