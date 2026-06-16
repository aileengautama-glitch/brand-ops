/**
 * useMagazineArticleSync — Phase 5G write-path: local → Supabase for magazine articles.
 *
 * Dual-write: the local Zustand store stays authoritative; every article change is
 * mirrored to the magazine_articles table best-effort (errors logged, never thrown,
 * never rolled back). Mirrors useMagazineGraphicSync.
 *
 * SCOPE: Article[] FLAT FIELDS ONLY. The writing-workspace arrays (articleComments,
 * articleVersions, writerHours) are DEFERRED — not flattened, diffed, or written here.
 *
 * What it does:
 *   1. On mount: pushes every current UUID article (upsert — safe to re-run).
 *   2. Subscribes to useMagazineStore and diffs articles across ALL projects:
 *        - article added / any flat field changed / reordered → supabasePushArticle
 *        - article removed                                     → supabaseDeleteArticle
 *
 * Articles are nested content (projects[].articles[]), flattened into a Map keyed by
 * article id. The content signature covers ALL persisted flat fields, including `body`
 * and `order`. Non-UUID seed ids are skipped.
 *
 * No echo-loop risk (so no value-dedup map): the Phase 5G read is component-local
 * (MagazineWriting.tsx) and does NOT hydrate the store, so a Supabase write can never
 * bounce back into the store to re-trigger this subscriber.
 *
 * FK magazine_articles.project_id → projects(id) self-heals after the Phase 4 project
 * push (a 23503 is logged, then succeeds on the next change).
 *
 * Called once from AppShell. No-op when VITE_SUPABASE_URL/ANON_KEY are absent.
 */
import { useEffect } from 'react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import { supabasePushArticle, supabaseDeleteArticle } from '@/repositories/magazineArticles'
import type { MagazineProject, Article } from '@/types/magazine'

type FlatArticle = { projectId: string; article: Article }

// Flatten projects[].articles[] into a map keyed by article id (UUID-guarded).
function flattenArticles(projects: MagazineProject[]): Map<string, FlatArticle> {
  const map = new Map<string, FlatArticle>()
  for (const p of projects) {
    if (!isValidUUID(p.id)) continue
    for (const a of p.articles) {
      if (!isValidUUID(a.id)) continue
      map.set(a.id, { projectId: p.id, article: a })
    }
  }
  return map
}

// Content signature — covers every persisted flat field, incl. body and order.
// Workspace arrays are intentionally NOT part of the article record, so nothing to add.
function contentSig(a: Article): string {
  return JSON.stringify({
    title: a.title, type: a.type, author: a.author, assignedWriterId: a.assignedWriterId,
    section: a.section, brief: a.brief, body: a.body,
    wordCountTarget: a.wordCountTarget, wordCountActual: a.wordCountActual,
    deadline: a.deadline, status: a.status, notes: a.notes,
    approverId: a.approverId, approvedById: a.approvedById, approvedByName: a.approvedByName,
    approvedAt: a.approvedAt, order: a.order, createdAt: a.createdAt,
  })
}

export function useMagazineArticleSync(): void {
  useEffect(() => {
    // No-op when Supabase is not configured (missing env vars, offline, CI, etc.)
    if (!isSupabaseEnabled) return

    // ── 1. Initial push: every current UUID article → Supabase (upsert) ──────────
    // FK violations (project row not pushed yet) are expected and logged; self-heal.
    void (async () => {
      for (const { projectId, article } of flattenArticles(useMagazineStore.getState().projects).values()) {
        await supabasePushArticle(article, projectId)
      }
    })()

    // ── 2. Subscribe: diff prev vs next; push adds/edits/moves, delete removals ───
    const unsub = useMagazineStore.subscribe((state, prevState) => {
      if (state.projects === prevState.projects) return  // fast-path

      const prev = flattenArticles(prevState.projects)
      const next = flattenArticles(state.projects)

      // Added or changed (incl. reorder / body edit) → upsert
      for (const [id, row] of next) {
        const before = prev.get(id)
        if (!before || contentSig(before.article) !== contentSig(row.article)) {
          void supabasePushArticle(row.article, row.projectId)
        }
      }

      // Removed → delete
      for (const id of prev.keys()) {
        if (!next.has(id)) void supabaseDeleteArticle(id)
      }
    })

    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
