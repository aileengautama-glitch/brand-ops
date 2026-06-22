import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  MagazineProject,
  Article, MoodTile, Graphic, GraphicsInspoItem, Spread, SpreadLink, OutreachContact,
  MagazineTeamMember, MagazineTask,
  ArticleComment, ArticleVersion, WriterHoursEntry,
  VisualProject, VisualShot, VisualResultLink,
  PrintFile,
} from '@/types/magazine'
import type { BudgetItem } from '@/types/common'
import type { MagazineProjectSummary } from '@/repositories/_types'
import { generateId, now } from '@/lib/utils'
import { createSeedMagazineProjects } from '@/lib/seedData'
import { useUserStore } from './useUserStore'

// ─── State interface ──────────────────────────────────────────────────────────

interface MagazineStoreState {
  projects: MagazineProject[]

  // ── Project ─────────────────────────────────────────────────────────────────
  addProject: (name: string, description?: string) => MagazineProject
  updateProject: (
    projectId: string,
    patch: Partial<Pick<MagazineProject,
      'name' | 'description' | 'editionNumber' | 'publicationDate' | 'theme' | 'status' | 'notes'
    >>
  ) => void
  removeProject: (projectId: string) => void
  clearAll: () => void

  /**
   * Phase 5B — re-source summary fields of existing projects from Supabase,
   * preserving id, timestamps, and every content array. Matched by id; local-only
   * projects (seeds / un-pushed) are left untouched. Change-aware: only projects
   * whose summary fields differ are rewritten, so a no-drift hydration is a true
   * no-op. Pure/local — never writes to Supabase (store-action purity rule).
   */
  hydrateProjectSummaries: (summaries: MagazineProjectSummary[]) => void

  /**
   * Cross-device: add remote-only VIEWABLE magazine projects (RLS-scoped) into the local
   * store as shells, so a member on a fresh device can see the Magazine card and open a
   * project they didn't create. Skips any project already local (never overwrites — the
   * protective hydrateProjectSummaries gate is untouched). Content arrays start empty; the
   * per-page content reads (remote ?? local) fill them. Pure/local.
   */
  upsertRemoteMagazineProjects: (summaries: MagazineProjectSummary[]) => void

  // ── Articles (Writing) ──────────────────────────────────────────────────────
  addArticle: (projectId: string) => void
  updateArticle: (projectId: string, id: string, patch: Partial<Article>) => void
  removeArticle: (projectId: string, id: string) => void
  moveArticle: (projectId: string, id: string, direction: 'up' | 'down') => void

  // ── Mood tiles (Visual — inspiration mood board) ────────────────────────────
  addMoodTile: (projectId: string) => void
  /** Create a mood tile pre-filled with an uploaded/pasted image. */
  addMoodTileWithImage: (projectId: string, imageId: string) => void
  updateMoodTile: (projectId: string, id: string, patch: Partial<MoodTile>) => void
  removeMoodTile: (projectId: string, id: string) => void
  moveMoodTile: (projectId: string, id: string, direction: 'up' | 'down') => void

  // ── Visual production projects ──────────────────────────────────────────────
  // Nested shots / resultLinks are edited by passing whole arrays to updateVisualProject.
  addVisualProject: (projectId: string) => void
  updateVisualProject: (projectId: string, id: string, patch: Partial<VisualProject>) => void
  removeVisualProject: (projectId: string, id: string) => void

  // ── Graphics ────────────────────────────────────────────────────────────────
  // Nested resultLinks are edited by passing the whole array to updateGraphic.
  addGraphic: (projectId: string) => void
  updateGraphic: (projectId: string, id: string, patch: Partial<Graphic>) => void
  removeGraphic: (projectId: string, id: string) => void
  moveGraphic: (projectId: string, id: string, direction: 'up' | 'down') => void

  // ── Graphics inspiration board ──────────────────────────────────────────────
  addGraphicsInspo: (projectId: string) => void
  /** Create an inspiration tile pre-filled with an uploaded/pasted image. */
  addGraphicsInspoWithImage: (projectId: string, imageId: string) => void
  updateGraphicsInspo: (projectId: string, id: string, patch: Partial<GraphicsInspoItem>) => void
  removeGraphicsInspo: (projectId: string, id: string) => void

  // ── Spreads ─────────────────────────────────────────────────────────────────
  addSpread: (projectId: string) => void
  updateSpread: (projectId: string, id: string, patch: Partial<Spread>) => void
  removeSpread: (projectId: string, id: string) => void
  moveSpread: (projectId: string, id: string, direction: 'up' | 'down') => void

  // ── Outreach ────────────────────────────────────────────────────────────────
  addOutreachContact: (projectId: string, data: Omit<OutreachContact, 'id' | 'createdAt'>) => void
  updateOutreachContact: (projectId: string, id: string, patch: Partial<OutreachContact>) => void
  removeOutreachContact: (projectId: string, id: string) => void

  // ── Budget ──────────────────────────────────────────────────────────────────
  updateTotalBudget: (projectId: string, total: number) => void
  addBudgetItem: (projectId: string, data: Omit<BudgetItem, 'id' | 'createdAt'>) => void
  updateBudgetItem: (projectId: string, id: string, patch: Partial<BudgetItem>) => void
  removeBudgetItem: (projectId: string, id: string) => void

  // ── Team members ────────────────────────────────────────────────────────────
  addTeamMember: (projectId: string, data: Omit<MagazineTeamMember, 'id' | 'createdAt'>) => void
  updateTeamMember: (projectId: string, id: string, patch: Partial<MagazineTeamMember>) => void
  removeTeamMember: (projectId: string, id: string) => void

  // ── Tasks ───────────────────────────────────────────────────────────────────
  addTask: (projectId: string, data: Omit<MagazineTask, 'id' | 'createdAt'>) => void
  updateTask: (projectId: string, id: string, patch: Partial<MagazineTask>) => void
  removeTask: (projectId: string, id: string) => void
  /** Swap the `order` value of two tasks — used by in-group up/down reorder controls. */
  swapTaskOrder: (projectId: string, aId: string, bId: string) => void

  // ── Article comments / suggestions ────────────────────────────────────────
  addArticleComment: (projectId: string, data: Omit<ArticleComment, 'id' | 'createdAt'>) => void
  removeArticleComment: (projectId: string, id: string) => void
  /** Set approval status + snapshot resolver. Pass status 'open' to reopen (clears resolver). */
  resolveArticleComment: (
    projectId: string, id: string,
    status: ArticleComment['status'], resolvedById: string, resolvedByName: string
  ) => void

  // ── Article versions (snapshots) ──────────────────────────────────────────
  addArticleVersion: (projectId: string, data: Omit<ArticleVersion, 'id' | 'createdAt'>) => void
  removeArticleVersion: (projectId: string, id: string) => void
  /** Copy a snapshot's body back onto the live article (non-destructive — page snapshots first). */
  restoreArticleVersion: (projectId: string, articleId: string, versionId: string) => void

  // ── Writer hours log ──────────────────────────────────────────────────────
  addWriterHours: (projectId: string, data: Omit<WriterHoursEntry, 'id' | 'createdAt'>) => void
  updateWriterHours: (projectId: string, id: string, patch: Partial<WriterHoursEntry>) => void
  removeWriterHours: (projectId: string, id: string) => void

  // ── Ready-to-print files ──────────────────────────────────────────────────
  /** Register an uploaded file's metadata (bytes live in IndexedDB `files`). First file becomes current. */
  addPrintFile: (projectId: string, meta: Omit<PrintFile, 'isCurrent' | 'createdAt'>) => void
  removePrintFile: (projectId: string, id: string) => void
  /** Mark one file as the current print-ready asset (clears the flag on the others). */
  setCurrentPrintFile: (projectId: string, id: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createDefaultMagazineProject(name: string, description = ''): MagazineProject {
  return {
    id: generateId(), name, description,
    createdAt: now(), updatedAt: now(),
    editionNumber: '', publicationDate: '', theme: '', notes: '',
    status: 'planning',
    teamMembers: [], tasks: [],
    articles: [], moodTiles: [], visualProjects: [], graphics: [], graphicsInspo: [], spreads: [], outreach: [],
    articleComments: [], articleVersions: [], writerHours: [],
    totalBudget: 0, budgetItems: [],
    printFiles: [],
  }
}

// ─── Legacy-data normalization ────────────────────────────────────────────────
// The persisted store (key `brand-ops-magazine-v1`) predates several fields added
// during the article-workspace work (section, body, assignedWriterId, the new
// arrays, etc.). Rehydrated data can therefore be missing fields entirely, which
// crashes render code that assumes strings/arrays exist (e.g. `article.section.trim()`).
// These helpers backfill safe defaults for every field so every magazine page can
// trust the shape. Applied once on rehydration via the persist `merge` option.

function normalizeArticle(raw: unknown): Article {
  const a = (raw ?? {}) as Partial<Article>
  return {
    id:               a.id ?? generateId(),
    title:            a.title ?? '',
    type:             a.type ?? 'article',
    author:           a.author ?? '',
    assignedWriterId: a.assignedWriterId ?? '',
    section:          a.section ?? '',
    brief:            a.brief ?? '',
    body:             a.body ?? '',
    wordCountTarget:  a.wordCountTarget ?? 0,
    wordCountActual:  a.wordCountActual ?? 0,
    deadline:         a.deadline ?? '',
    status:           a.status ?? 'idea',
    notes:            a.notes ?? '',
    approverId:       a.approverId ?? '',
    approvedById:     a.approvedById ?? '',
    approvedByName:   a.approvedByName ?? '',
    approvedAt:       a.approvedAt ?? '',
    order:            a.order ?? 0,
    createdAt:        a.createdAt ?? now(),
  }
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

function normalizeTask(raw: unknown): MagazineTask {
  const t = (raw ?? {}) as Partial<MagazineTask>
  return {
    id:          t.id ?? generateId(),
    title:       t.title ?? '',
    description: t.description ?? '',
    status:      t.status ?? 'todo',
    priority:    t.priority ?? 'normal',
    dueDate:     t.dueDate ?? '',
    assignedTo:  t.assignedTo ?? '',
    createdAt:   t.createdAt ?? now(),
    updatedAt:   t.updatedAt ?? now(),
    // Magazine layer
    section:     t.section ?? '',
    linkType:    t.linkType ?? 'none',
    linkId:      t.linkId ?? '',
    order:       t.order ?? 0,
  }
}

function normalizeVisualShot(raw: unknown): VisualShot {
  const s = (raw ?? {}) as Partial<VisualShot>
  return {
    id:          s.id ?? generateId(),
    title:       s.title ?? '',
    description: s.description ?? '',
    status:      s.status ?? 'planned',
    order:       s.order ?? 0,
    createdAt:   s.createdAt ?? now(),
  }
}

function normalizeResultLink(raw: unknown): VisualResultLink {
  const l = (raw ?? {}) as Partial<VisualResultLink>
  return { id: l.id ?? generateId(), label: l.label ?? '', url: l.url ?? '' }
}

function normalizeGraphic(raw: unknown): Graphic {
  const g = (raw ?? {}) as Partial<Graphic>
  // Migrate legacy single dropboxLink → resultLinks when none present yet.
  let resultLinks: VisualResultLink[] = Array.isArray(g.resultLinks)
    ? g.resultLinks.map((l) => {
        const x = (l ?? {}) as Partial<VisualResultLink>
        return { id: x.id ?? generateId(), label: x.label ?? '', url: x.url ?? '' }
      })
    : []
  if (resultLinks.length === 0 && g.dropboxLink) {
    resultLinks = [{ id: generateId(), label: 'Dropbox / assets', url: g.dropboxLink }]
  }
  return {
    id:              g.id ?? generateId(),
    title:           g.title ?? '',
    formatDetail:    g.formatDetail ?? '',
    assignee:        g.assignee ?? '',
    status:          g.status ?? 'brief',
    previewImageId:  g.previewImageId ?? '',
    imageIds:        asArray(g.imageIds),
    brief:           g.brief ?? '',
    notes:           g.notes ?? '',
    order:           g.order ?? 0,
    createdAt:       g.createdAt ?? now(),
    articleId:       g.articleId ?? '',
    visualProjectId: g.visualProjectId ?? '',
    moodTileId:      g.moodTileId ?? '',
    dropboxLink:     g.dropboxLink ?? '',
    resultLinks,
  }
}

function normalizeGraphicsInspo(raw: unknown): GraphicsInspoItem {
  const i = (raw ?? {}) as Partial<GraphicsInspoItem>
  return {
    id:        i.id ?? generateId(),
    imageId:   i.imageId ?? '',
    caption:   i.caption ?? '',
    sourceUrl: i.sourceUrl ?? '',
    order:     i.order ?? 0,
    createdAt: i.createdAt ?? now(),
  }
}

function normalizeSpread(raw: unknown): Spread {
  const s = (raw ?? {}) as Partial<Spread> & {
    articleId?: string; graphicId?: string  // legacy single-link fields
  }
  // Migrate legacy single-links → links[] when no links are present yet.
  let links: SpreadLink[] = Array.isArray(s.links)
    ? s.links.map((l) => {
        const x = (l ?? {}) as Partial<SpreadLink>
        return { id: x.id ?? generateId(), type: x.type ?? 'article', refId: x.refId ?? '' }
      })
    : []
  if (links.length === 0) {
    if (s.articleId) links.push({ id: generateId(), type: 'article', refId: s.articleId })
    if (s.graphicId) links.push({ id: generateId(), type: 'graphic', refId: s.graphicId })
  }
  return {
    id:          s.id ?? generateId(),
    pages:       s.pages ?? '',
    contentType: s.contentType ?? 'editorial',
    section:     s.section ?? '',
    ownerId:     s.ownerId ?? '',
    links,
    status:      s.status ?? 'empty',
    notes:       s.notes ?? '',
    order:       s.order ?? 0,
    createdAt:   s.createdAt ?? now(),
  }
}

function normalizeVisualProject(raw: unknown): VisualProject {
  const v = (raw ?? {}) as Partial<VisualProject>
  return {
    id:          v.id ?? generateId(),
    name:        v.name ?? '',
    concept:     v.concept ?? '',
    status:      v.status ?? 'planning',
    shootDate:   v.shootDate ?? '',
    location:    v.location ?? '',
    assignedTo:  v.assignedTo ?? '',
    articleId:   v.articleId ?? '',
    shots:       asArray(v.shots).map(normalizeVisualShot),
    resultLinks: asArray(v.resultLinks).map(normalizeResultLink),
    notes:       v.notes ?? '',
    order:       v.order ?? 0,
    createdAt:   v.createdAt ?? now(),
    updatedAt:   v.updatedAt ?? now(),
  }
}

function normalizeProject(raw: unknown): MagazineProject {
  const p = (raw ?? {}) as Partial<MagazineProject>
  return {
    id:              p.id ?? generateId(),
    name:            p.name ?? 'Untitled issue',
    description:     p.description ?? '',
    editionNumber:   p.editionNumber ?? '',
    publicationDate: p.publicationDate ?? '',
    theme:           p.theme ?? '',
    status:          p.status ?? 'planning',
    createdAt:       p.createdAt ?? now(),
    updatedAt:       p.updatedAt ?? now(),
    // Team & tasks
    teamMembers:     asArray(p.teamMembers),
    tasks:           asArray(p.tasks).map(normalizeTask),
    // Section data — articles are deep-normalized; the rest are guaranteed arrays
    articles:        asArray(p.articles).map(normalizeArticle),
    moodTiles:       asArray(p.moodTiles),
    visualProjects:  asArray(p.visualProjects).map(normalizeVisualProject),
    graphics:        asArray(p.graphics).map(normalizeGraphic),
    graphicsInspo:   asArray(p.graphicsInspo).map(normalizeGraphicsInspo),
    spreads:         asArray(p.spreads).map(normalizeSpread),
    outreach:        asArray(p.outreach),
    // Writing workspace data (added later — often absent in legacy data)
    articleComments: asArray(p.articleComments),
    articleVersions: asArray(p.articleVersions),
    writerHours:     asArray(p.writerHours),
    // Budget
    totalBudget:     p.totalBudget ?? 0,
    budgetItems:     asArray(p.budgetItems),
    // Ready-to-print files (added later — absent in legacy data)
    printFiles:      asArray(p.printFiles),
    notes:           p.notes ?? '',
  }
}

function swapOrder<T extends { id: string; order: number }>(
  items: T[], id: string, direction: 'up' | 'down'
): T[] {
  const sorted = [...items].sort((a, b) => a.order - b.order)
  const idx = sorted.findIndex((x) => x.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return items
  const orderA = sorted[idx].order
  const orderB = sorted[swapIdx].order
  return items.map((x) => {
    if (x.id === sorted[idx].id) return { ...x, order: orderB }
    if (x.id === sorted[swapIdx].id) return { ...x, order: orderA }
    return x
  })
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMagazineStore = create<MagazineStoreState>()(
  persist(
    (set, get) => {
      const patch = (
        projectId: string,
        updater: (p: MagazineProject) => Partial<MagazineProject>
      ) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId ? { ...p, ...updater(p), updatedAt: now() } : p
          ),
        }))

      return {
        projects: createSeedMagazineProjects(),

        // ── Project ────────────────────────────────────────────────────────────
        addProject: (name, description = '') => {
          const project = createDefaultMagazineProject(name, description)
          set((s) => ({ projects: [...s.projects, project] }))
          return project
        },
        updateProject: (projectId, p) => patch(projectId, () => p),
        removeProject: (projectId) => {
          set((s) => ({ projects: s.projects.filter((p) => p.id !== projectId) }))
          useUserStore.getState().purgeProjectAccess('magazine', projectId)
        },
        clearAll: () => {
          set({ projects: [] })
          useUserStore.getState().purgeModuleAccess('magazine')
        },

        // ── Hydration (Phase 5B — remote → local, summary fields only) ──────────
        // Guarded authority flip: the caller (useMagazineProjectHydration) only
        // invokes this when the bootstrap reports zero unexpected drift. Overwrites
        // ONLY the 8 summary fields; id, createdAt, updatedAt, and all content arrays
        // are preserved. Change-aware so a clean (in-sync) hydration is a true no-op.
        hydrateProjectSummaries: (summaries) => {
          const byId = new Map(summaries.map((s) => [s.id, s]))
          let changed = false
          const next = get().projects.map((p) => {
            const s = byId.get(p.id)
            if (!s) return p   // local-only (seeds / un-pushed) — preserved untouched
            if (
              p.name            === s.name &&
              p.description     === s.description &&
              p.editionNumber   === s.editionNumber &&
              p.publicationDate === s.publicationDate &&
              p.theme           === s.theme &&
              p.status          === s.status &&
              p.totalBudget     === s.totalBudget &&
              p.notes           === s.notes
            ) return p   // already identical — keep the same object reference
            changed = true
            return {
              ...p,                      // preserve id, timestamps, every content array
              name:            s.name,
              description:     s.description,
              editionNumber:   s.editionNumber,
              publicationDate: s.publicationDate,
              theme:           s.theme,
              status:          s.status,
              totalBudget:     s.totalBudget,
              notes:           s.notes,
            }
          })
          // Write only when something actually changed → no spurious notify / persist /
          // write-sync echo when local already matches remote (the clean-gate case).
          if (changed) set({ projects: next })
        },

        upsertRemoteMagazineProjects: (summaries) => {
          const have = new Set(get().projects.map((p) => p.id))
          const add = summaries
            .filter((sm) => !have.has(sm.id))
            .map((sm) => ({
              ...createDefaultMagazineProject(sm.name, sm.description),
              id:              sm.id,
              name:            sm.name,
              description:     sm.description,
              editionNumber:   sm.editionNumber,
              publicationDate: sm.publicationDate,
              theme:           sm.theme,
              status:          sm.status,
              totalBudget:     sm.totalBudget,
              notes:           sm.notes,
              createdAt:       sm.createdAt,
              updatedAt:       sm.updatedAt,
            }))
          if (add.length) set((st) => ({ projects: [...st.projects, ...add] }))
        },

        // ── Articles ───────────────────────────────────────────────────────────
        addArticle: (projectId) => {
          const item: Article = {
            id: generateId(), title: '', type: 'article', author: '',
            assignedWriterId: '', section: '', brief: '', body: '',
            wordCountTarget: 0, wordCountActual: 0,
            deadline: '', status: 'idea', notes: '',
            approverId: '', approvedById: '', approvedByName: '', approvedAt: '',
            order: Date.now(), createdAt: now(),
          }
          patch(projectId, (p) => ({ articles: [...p.articles, item] }))
        },
        updateArticle: (projectId, id, ap) =>
          patch(projectId, (p) => ({
            articles: p.articles.map((a) => (a.id === id ? { ...a, ...ap } : a)),
          })),
        removeArticle: (projectId, id) =>
          patch(projectId, (p) => ({
            articles:        p.articles.filter((a) => a.id !== id),
            // Cascade: drop the article's workspace items so nothing is orphaned
            articleComments: p.articleComments.filter((c) => c.articleId !== id),
            articleVersions: p.articleVersions.filter((v) => v.articleId !== id),
            writerHours:     p.writerHours.filter((h) => h.articleId !== id),
          })),
        moveArticle: (projectId, id, direction) =>
          patch(projectId, (p) => ({ articles: swapOrder(p.articles, id, direction) })),

        // ── Mood tiles ─────────────────────────────────────────────────────────
        addMoodTile: (projectId) => {
          const item: MoodTile = {
            id: generateId(), imageId: '', caption: '', color: '',
            order: Date.now(), createdAt: now(),
          }
          patch(projectId, (p) => ({ moodTiles: [...p.moodTiles, item] }))
        },
        addMoodTileWithImage: (projectId, imageId) => {
          const item: MoodTile = {
            id: generateId(), imageId, caption: '', color: '',
            order: Date.now(), createdAt: now(),
          }
          patch(projectId, (p) => ({ moodTiles: [...p.moodTiles, item] }))
        },
        updateMoodTile: (projectId, id, mp) =>
          patch(projectId, (p) => ({
            moodTiles: p.moodTiles.map((m) => (m.id === id ? { ...m, ...mp } : m)),
          })),
        removeMoodTile: (projectId, id) =>
          patch(projectId, (p) => ({ moodTiles: p.moodTiles.filter((m) => m.id !== id) })),
        moveMoodTile: (projectId, id, direction) =>
          patch(projectId, (p) => ({ moodTiles: swapOrder(p.moodTiles, id, direction) })),

        // ── Visual production projects ─────────────────────────────────────────
        addVisualProject: (projectId) => {
          const item: VisualProject = {
            id: generateId(), name: '', concept: '', status: 'planning',
            shootDate: '', location: '', assignedTo: '', articleId: '',
            shots: [], resultLinks: [], notes: '',
            order: Date.now(), createdAt: now(), updatedAt: now(),
          }
          patch(projectId, (p) => ({ visualProjects: [...p.visualProjects, item] }))
        },
        updateVisualProject: (projectId, id, vp) =>
          patch(projectId, (p) => ({
            visualProjects: p.visualProjects.map((v) =>
              v.id === id ? { ...v, ...vp, updatedAt: now() } : v
            ),
          })),
        removeVisualProject: (projectId, id) =>
          patch(projectId, (p) => ({ visualProjects: p.visualProjects.filter((v) => v.id !== id) })),

        // ── Graphics ───────────────────────────────────────────────────────────
        addGraphic: (projectId) => {
          const item: Graphic = {
            id: generateId(), title: '', formatDetail: '', assignee: '',
            status: 'brief', previewImageId: '', imageIds: [], brief: '', notes: '',
            articleId: '', visualProjectId: '', moodTileId: '',
            dropboxLink: '', resultLinks: [],
            order: Date.now(), createdAt: now(),
          }
          patch(projectId, (p) => ({ graphics: [...p.graphics, item] }))
        },
        updateGraphic: (projectId, id, gp) =>
          patch(projectId, (p) => ({
            graphics: p.graphics.map((g) => (g.id === id ? { ...g, ...gp } : g)),
          })),
        removeGraphic: (projectId, id) =>
          patch(projectId, (p) => ({ graphics: p.graphics.filter((g) => g.id !== id) })),
        moveGraphic: (projectId, id, direction) =>
          patch(projectId, (p) => ({ graphics: swapOrder(p.graphics, id, direction) })),

        // ── Graphics inspiration board ─────────────────────────────────────────
        addGraphicsInspo: (projectId) => {
          const item: GraphicsInspoItem = {
            id: generateId(), imageId: '', caption: '', sourceUrl: '',
            order: Date.now(), createdAt: now(),
          }
          patch(projectId, (p) => ({ graphicsInspo: [...p.graphicsInspo, item] }))
        },
        addGraphicsInspoWithImage: (projectId, imageId) => {
          const item: GraphicsInspoItem = {
            id: generateId(), imageId, caption: '', sourceUrl: '',
            order: Date.now(), createdAt: now(),
          }
          patch(projectId, (p) => ({ graphicsInspo: [...p.graphicsInspo, item] }))
        },
        updateGraphicsInspo: (projectId, id, ip) =>
          patch(projectId, (p) => ({
            graphicsInspo: p.graphicsInspo.map((it) => (it.id === id ? { ...it, ...ip } : it)),
          })),
        removeGraphicsInspo: (projectId, id) =>
          patch(projectId, (p) => ({ graphicsInspo: p.graphicsInspo.filter((it) => it.id !== id) })),

        // ── Spreads ────────────────────────────────────────────────────────────
        addSpread: (projectId) => {
          const item: Spread = {
            id: generateId(), pages: '', contentType: 'editorial',
            section: '', ownerId: '', links: [],
            status: 'empty', notes: '',
            order: Date.now(), createdAt: now(),
          }
          patch(projectId, (p) => ({ spreads: [...p.spreads, item] }))
        },
        updateSpread: (projectId, id, sp) =>
          patch(projectId, (p) => ({
            spreads: p.spreads.map((s) => (s.id === id ? { ...s, ...sp } : s)),
          })),
        removeSpread: (projectId, id) =>
          patch(projectId, (p) => ({ spreads: p.spreads.filter((s) => s.id !== id) })),
        moveSpread: (projectId, id, direction) =>
          patch(projectId, (p) => ({ spreads: swapOrder(p.spreads, id, direction) })),

        // ── Outreach ───────────────────────────────────────────────────────────
        addOutreachContact: (projectId, data) => {
          const contact: OutreachContact = { ...data, id: generateId(), createdAt: now() }
          patch(projectId, (p) => ({ outreach: [...p.outreach, contact] }))
        },
        updateOutreachContact: (projectId, id, op) =>
          patch(projectId, (p) => ({
            outreach: p.outreach.map((o) => (o.id === id ? { ...o, ...op } : o)),
          })),
        removeOutreachContact: (projectId, id) =>
          patch(projectId, (p) => ({ outreach: p.outreach.filter((o) => o.id !== id) })),

        // ── Budget ─────────────────────────────────────────────────────────────
        updateTotalBudget: (projectId, total) =>
          patch(projectId, () => ({ totalBudget: total })),
        addBudgetItem: (projectId, data) => {
          const item: BudgetItem = { ...data, id: generateId(), createdAt: now() }
          patch(projectId, (p) => ({ budgetItems: [...p.budgetItems, item] }))
        },
        updateBudgetItem: (projectId, id, bp) =>
          patch(projectId, (p) => ({
            budgetItems: p.budgetItems.map((b) => (b.id === id ? { ...b, ...bp } : b)),
          })),
        removeBudgetItem: (projectId, id) =>
          patch(projectId, (p) => ({ budgetItems: p.budgetItems.filter((b) => b.id !== id) })),

        // ── Team members ──────────────────────────────────────────────────────
        addTeamMember: (projectId, data) => {
          const member: MagazineTeamMember = { ...data, id: generateId(), createdAt: now() }
          patch(projectId, (p) => ({ teamMembers: [...p.teamMembers, member] }))
        },
        updateTeamMember: (projectId, id, mp) =>
          patch(projectId, (p) => ({
            teamMembers: p.teamMembers.map((m) => (m.id === id ? { ...m, ...mp } : m)),
          })),
        removeTeamMember: (projectId, id) =>
          patch(projectId, (p) => ({ teamMembers: p.teamMembers.filter((m) => m.id !== id) })),

        // ── Tasks ─────────────────────────────────────────────────────────────
        addTask: (projectId, data) => {
          const task: MagazineTask = { ...data, id: generateId(), createdAt: now() }
          patch(projectId, (p) => ({ tasks: [...p.tasks, task] }))
        },
        updateTask: (projectId, id, tp) =>
          patch(projectId, (p) => ({
            tasks: p.tasks.map((t) => (t.id === id ? { ...t, ...tp } : t)),
          })),
        removeTask: (projectId, id) =>
          patch(projectId, (p) => ({ tasks: p.tasks.filter((t) => t.id !== id) })),
        swapTaskOrder: (projectId, aId, bId) =>
          patch(projectId, (p) => {
            const a = p.tasks.find((t) => t.id === aId)
            const b = p.tasks.find((t) => t.id === bId)
            if (!a || !b) return {}
            const ao = a.order, bo = b.order
            return {
              tasks: p.tasks.map((t) =>
                t.id === aId ? { ...t, order: bo } : t.id === bId ? { ...t, order: ao } : t
              ),
            }
          }),

        // ── Article comments / suggestions ────────────────────────────────────
        addArticleComment: (projectId, data) => {
          const comment: ArticleComment = { ...data, id: generateId(), createdAt: now() }
          patch(projectId, (p) => ({ articleComments: [...p.articleComments, comment] }))
        },
        removeArticleComment: (projectId, id) =>
          patch(projectId, (p) => ({
            articleComments: p.articleComments.filter((c) => c.id !== id),
          })),
        resolveArticleComment: (projectId, id, status, resolvedById, resolvedByName) =>
          patch(projectId, (p) => ({
            articleComments: p.articleComments.map((c) =>
              c.id === id
                ? {
                    ...c, status,
                    resolvedById:   status === 'open' ? '' : resolvedById,
                    resolvedByName: status === 'open' ? '' : resolvedByName,
                    resolvedAt:     status === 'open' ? '' : now(),
                  }
                : c
            ),
          })),

        // ── Article versions (snapshots) ──────────────────────────────────────
        addArticleVersion: (projectId, data) => {
          const version: ArticleVersion = { ...data, id: generateId(), createdAt: now() }
          patch(projectId, (p) => ({ articleVersions: [...p.articleVersions, version] }))
        },
        removeArticleVersion: (projectId, id) =>
          patch(projectId, (p) => ({
            articleVersions: p.articleVersions.filter((v) => v.id !== id),
          })),
        restoreArticleVersion: (projectId, articleId, versionId) =>
          patch(projectId, (p) => {
            const version = p.articleVersions.find((v) => v.id === versionId)
            if (!version) return {}
            return {
              articles: p.articles.map((a) =>
                a.id === articleId
                  ? { ...a, body: version.body, wordCountActual: version.wordCount }
                  : a
              ),
            }
          }),

        // ── Writer hours log ──────────────────────────────────────────────────
        addWriterHours: (projectId, data) => {
          const entry: WriterHoursEntry = { ...data, id: generateId(), createdAt: now() }
          patch(projectId, (p) => ({ writerHours: [...p.writerHours, entry] }))
        },
        updateWriterHours: (projectId, id, hp) =>
          patch(projectId, (p) => ({
            writerHours: p.writerHours.map((h) => (h.id === id ? { ...h, ...hp } : h)),
          })),
        removeWriterHours: (projectId, id) =>
          patch(projectId, (p) => ({ writerHours: p.writerHours.filter((h) => h.id !== id) })),

        // ── Ready-to-print files ──────────────────────────────────────────────
        addPrintFile: (projectId, meta) =>
          patch(projectId, (p) => {
            const isFirst = p.printFiles.length === 0
            const file: PrintFile = { ...meta, isCurrent: isFirst, createdAt: now() }
            return { printFiles: [...p.printFiles, file] }
          }),
        removePrintFile: (projectId, id) =>
          patch(projectId, (p) => {
            const removed = p.printFiles.find((f) => f.id === id)
            let next = p.printFiles.filter((f) => f.id !== id)
            // If the current asset was removed, promote the most recent remaining file.
            if (removed?.isCurrent && next.length > 0 && !next.some((f) => f.isCurrent)) {
              const latest = next.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b))
              next = next.map((f) => ({ ...f, isCurrent: f.id === latest.id }))
            }
            return { printFiles: next }
          }),
        setCurrentPrintFile: (projectId, id) =>
          patch(projectId, (p) => ({
            printFiles: p.printFiles.map((f) => ({ ...f, isCurrent: f.id === id })),
          })),
      }
    },
    {
      name: 'brand-ops-magazine-v1',
      // Normalize rehydrated data so legacy projects/articles that predate newer
      // fields (section, body, workspace arrays, …) are backfilled before render.
      // Keeps the live action functions from `current`; only `projects` is replaced.
      merge: (persisted, current) => {
        const p = persisted as { projects?: unknown } | undefined
        return {
          ...current,
          projects: Array.isArray(p?.projects)
            ? p!.projects.map(normalizeProject)
            : current.projects,
        }
      },
    }
  )
)
