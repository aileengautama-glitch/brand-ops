import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, PenLine, MessageSquare, ArrowRight, Clock, AlertCircle } from 'lucide-react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { MagazineArticleRepository } from '@/repositories'
import { useCurrentMagazineProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import { FormField, inputCls } from '@/components/ui/FormField'
import { cn, formatDate } from '@/lib/utils'
import type { Article, ArticleType, ArticleStatus } from '@/types/magazine'

// ─── Status / type configs ─────────────────────────────────────────────────────

export const ARTICLE_STATUS_CONFIG: Record<ArticleStatus, { label: string; className: string }> = {
  idea:     { label: 'Idea',      className: 'bg-surface-3 text-ink-muted'  },
  drafting: { label: 'Drafting',  className: 'bg-amber-100 text-amber-700'  },
  review:   { label: 'In Review', className: 'bg-blue-100 text-blue-700'    },
  final:    { label: 'Final',     className: 'bg-green-100 text-green-700'  },
}

export const ARTICLE_TYPE_CONFIG: Record<ArticleType, { label: string; className: string }> = {
  article:   { label: 'Article',   className: 'bg-surface-2 text-ink-secondary' },
  interview: { label: 'Interview', className: 'bg-purple-50 text-purple-600'    },
  column:    { label: 'Column',    className: 'bg-sky-50 text-sky-600'          },
  feature:   { label: 'Feature',   className: 'bg-rose-50 text-rose-600'        },
  ad:        { label: 'Ad',        className: 'bg-surface-3 text-ink-faint'     },
}

const STATUS_ORDER: Record<ArticleStatus, number> = { idea: 0, drafting: 1, review: 2, final: 3 }

const ctrlCls = 'text-xs border border-surface-3 rounded px-2 py-1 bg-white text-ink-secondary'

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((w) => w[0]?.toUpperCase() ?? '').join('') || '—'
}

// ─── Control types ─────────────────────────────────────────────────────────────

type GroupBy      = 'section' | 'writer' | 'status' | 'none'
type SortBy       = 'manual' | 'deadline' | 'status' | 'title'
type StatusFilter = ArticleStatus | 'all'

// ─── ArticleCard ───────────────────────────────────────────────────────────────

function ArticleCard({
  article,
  writerName,
  openComments,
  overdue,
}: {
  article: Article
  writerName: string
  openComments: number
  overdue: boolean
}) {
  const statusCfg = ARTICLE_STATUS_CONFIG[article.status] ?? ARTICLE_STATUS_CONFIG.idea
  const typeCfg   = ARTICLE_TYPE_CONFIG[article.type] ?? ARTICLE_TYPE_CONFIG.article

  const target = article.wordCountTarget ?? 0
  const actual = article.wordCountActual ?? 0
  const pct    = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0

  return (
    <Link
      to={article.id}
      className={cn(
        'group flex flex-col bg-white border rounded-lg p-3.5 hover:shadow-sm transition-all',
        overdue ? 'border-red-200 hover:border-red-300' : 'border-surface-3 hover:border-accent/40'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="text-sm font-semibold text-ink leading-snug line-clamp-2 group-hover:text-accent transition-colors">
          {article.title || 'Untitled article'}
        </h3>
        <span className={cn('text-2xs font-medium px-1.5 py-0.5 rounded shrink-0', statusCfg.className)}>
          {statusCfg.label}
        </span>
      </div>

      {/* Type + writer (ownership) */}
      <div className="flex items-center gap-2 mb-3 min-w-0">
        <span className={cn('text-2xs font-medium px-1.5 py-0.5 rounded shrink-0', typeCfg.className)}>
          {typeCfg.label}
        </span>
        {writerName ? (
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="w-4 h-4 rounded-full bg-surface-2 text-ink-secondary text-[9px] font-semibold flex items-center justify-center shrink-0">
              {initials(writerName)}
            </span>
            <span className="text-xs text-ink-faint truncate">{writerName}</span>
          </span>
        ) : (
          <span className="text-xs text-ink-faint italic">Unassigned</span>
        )}
      </div>

      {/* Word progress */}
      {target > 0 ? (
        <div className="mb-2.5">
          <div className="flex items-center justify-between text-2xs text-ink-faint mb-1 tabular-nums">
            <span>{actual.toLocaleString()} / {target.toLocaleString()} words</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-green-500' : 'bg-accent')}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mb-2.5 text-2xs text-ink-faint">No word target</div>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2.5 text-2xs">
          {article.deadline ? (
            <span className={cn('flex items-center gap-1', overdue ? 'text-red-500 font-medium' : 'text-ink-faint')}>
              {overdue && <AlertCircle size={11} />}
              {overdue ? 'Overdue · ' : 'Due '}{formatDate(article.deadline, 'dd MMM')}
            </span>
          ) : (
            <span className="text-ink-faint/70">No deadline</span>
          )}
          {openComments > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <MessageSquare size={11} /> {openComments} open
            </span>
          )}
        </div>
        <ArrowRight size={13} className="text-ink-faint group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  )
}

// ─── Draft type ────────────────────────────────────────────────────────────────

type ArticleDraft = Pick<Article, 'title' | 'type' | 'author' | 'section' | 'wordCountTarget' | 'status'>
const BLANK: ArticleDraft = { title: '', type: 'article', author: '', section: '', wordCountTarget: 0, status: 'idea' }

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MagazineWriting() {
  const { id }        = useParams<{ id: string }>()
  const project       = useCurrentMagazineProject()
  const updateProject = useMagazineStore((s) => s.updateProject)
  const addArticle    = useMagazineStore((s) => s.addArticle)
  const updateArticle = useMagazineStore((s) => s.updateArticle)
  const { canEdit }   = useCurrentUser()
  const readOnly      = !canEdit('magazine.writing', id)

  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft]     = useState<ArticleDraft>(BLANK)

  // Workflow controls
  const [groupBy, setGroupBy]           = useState<GroupBy>('section')
  const [sortBy, setSortBy]             = useState<SortBy>('manual')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [filterWriter, setFilterWriter] = useState<string>('all') // 'all' | 'unassigned' | member id

  // Phase 5G — Supabase-first read of this project's articles. Fetched once per
  // project; null = no Supabase answer (disabled / non-UUID / error / no rows).
  const [remoteArticles, setRemoteArticles] = useState<Article[] | null>(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    MagazineArticleRepository.list(id).then((rows) => {
      if (!cancelled) setRemoteArticles(rows)
    })
    return () => { cancelled = true }
  }, [id])

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const d = (k: keyof ArticleDraft, v: unknown) => setDraft((p) => ({ ...p, [k]: v }))

  const handleAdd = () => {
    if (!draft.title.trim()) return
    addArticle(id)
    const freshArticles =
      useMagazineStore.getState().projects.find((p) => p.id === id)?.articles ?? []
    const newest = [...freshArticles].sort((a, b) => b.order - a.order)[0]
    if (newest) updateArticle(id, newest.id, draft)
    setDraft(BLANK)
    setShowAdd(false)
  }

  // Defensive accessors — tolerate legacy/incomplete articles even after normalization
  const teamMembers     = project.teamMembers ?? []
  const articleComments = project.articleComments ?? []
  // Read authority: Supabase rows when present, else the local store copy. Until the
  // table is populated by the dual-write, this falls back to local (no behavior change).
  // articleComments stays on the store — workspace arrays are deferred (Phase 5G scope).
  const allArticles     = remoteArticles ?? project.articles ?? []

  const writerName = (a: Article): string => {
    if (a.assignedWriterId) {
      const tm = teamMembers.find((m) => m.id === a.assignedWriterId)
      if (tm) return tm.name
    }
    return a.author ?? ''
  }
  const openCommentCount = (articleId: string): number =>
    articleComments.filter((c) => c.articleId === articleId && c.status === 'open').length

  const todayISO  = new Date().toISOString().slice(0, 10)
  const isOverdue = (a: Article): boolean =>
    !!a.deadline && a.deadline < todayISO && a.status !== 'final'

  const finalCount = allArticles.filter((a) => a.status === 'final').length

  // ── Filter ────────────────────────────────────────────────────────────────
  let visible = [...allArticles]
  if (filterStatus !== 'all') visible = visible.filter((a) => a.status === filterStatus)
  if (filterWriter === 'unassigned') {
    visible = visible.filter((a) => !a.assignedWriterId && !(a.author ?? '').trim())
  } else if (filterWriter !== 'all') {
    visible = visible.filter((a) => a.assignedWriterId === filterWriter)
  }

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sortFns: Record<SortBy, (a: Article, b: Article) => number> = {
    manual:   (a, b) => (a.order ?? 0) - (b.order ?? 0),
    deadline: (a, b) => (a.deadline || '9999-99-99').localeCompare(b.deadline || '9999-99-99'),
    status:   (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9),
    title:    (a, b) => (a.title || '').localeCompare(b.title || ''),
  }
  visible.sort(sortFns[sortBy])

  // ── Group ─────────────────────────────────────────────────────────────────
  const keyFor = (a: Article): { key: string; label: string } => {
    switch (groupBy) {
      case 'section': {
        const s = (a.section ?? '').trim()
        return s ? { key: s, label: s } : { key: '__none__', label: 'Unsectioned' }
      }
      case 'writer': {
        const n = writerName(a).trim()
        const key = a.assignedWriterId || (n ? `name:${n}` : '__unassigned__')
        return { key, label: n || 'Unassigned' }
      }
      case 'status': {
        const c = ARTICLE_STATUS_CONFIG[a.status] ?? ARTICLE_STATUS_CONFIG.idea
        return { key: a.status, label: c.label }
      }
      default:
        return { key: '__all__', label: '' }
    }
  }

  const groupMap = new Map<string, { label: string; items: Article[] }>()
  for (const a of visible) {
    const { key, label } = keyFor(a)
    if (!groupMap.has(key)) groupMap.set(key, { label, items: [] })
    groupMap.get(key)!.items.push(a)
  }
  let groupsArr = [...groupMap.entries()].map(([key, v]) => ({ key, label: v.label, items: v.items }))
  if (groupBy === 'status') {
    groupsArr.sort((x, y) => (STATUS_ORDER[x.key as ArticleStatus] ?? 99) - (STATUS_ORDER[y.key as ArticleStatus] ?? 99))
  } else if (groupBy === 'section') {
    groupsArr.sort((x, y) => (x.key === '__none__' ? 1 : 0) - (y.key === '__none__' ? 1 : 0))
  } else if (groupBy === 'writer') {
    groupsArr.sort((x, y) =>
      ((x.key === '__unassigned__' ? 1 : 0) - (y.key === '__unassigned__' ? 1 : 0)) ||
      x.label.localeCompare(y.label)
    )
  }

  const filtersActive = filterStatus !== 'all' || filterWriter !== 'all'

  const addButton = !readOnly ? (
    <button
      onClick={() => setShowAdd(true)}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors"
    >
      <Plus size={13} /> Add article
    </button>
  ) : undefined

  const headerActions = (
    <div className="flex items-center gap-2">
      <Link
        to={`/magazine/${id}/writing-hours`}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
      >
        <Clock size={13} /> Hours
      </Link>
      {addButton}
    </div>
  )

  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all',      label: 'All' },
    { key: 'idea',     label: 'Idea' },
    { key: 'drafting', label: 'Drafting' },
    { key: 'review',   label: 'Review' },
    { key: 'final',    label: 'Final' },
  ]

  return (
    <div className="p-6 max-w-5xl">
      <ProjectHeader
        name={project.name}
        description={project.description}
        onUpdateName={(name) => updateProject(id, { name })}
        onUpdateDescription={(description) => updateProject(id, { description })}
        actions={headerActions}
      />

      <PageSection
        label={`Articles — ${finalCount} final / ${allArticles.length} total${
          filtersActive ? ` · ${visible.length} shown` : ''
        }`}
      >
        {allArticles.length === 0 ? (
          <EmptyState
            icon={PenLine}
            title="No articles yet"
            description="Add articles, interviews, and features for this issue. Open any card to write, review, and approve."
            action={addButton}
          />
        ) : (
          <>
            {/* ── Controls toolbar ──────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4 pb-3 border-b border-surface-2">
              <div className="flex items-center gap-1.5">
                <span className="text-2xs uppercase tracking-wide text-ink-faint">Group</span>
                <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className={ctrlCls}>
                  <option value="section">Section</option>
                  <option value="writer">Writer</option>
                  <option value="status">Status</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xs uppercase tracking-wide text-ink-faint">Sort</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className={ctrlCls}>
                  <option value="manual">Manual order</option>
                  <option value="deadline">Deadline</option>
                  <option value="status">Status</option>
                  <option value="title">Title</option>
                </select>
              </div>

              <div className="flex-1" />

              <div className="flex items-center gap-1.5">
                <span className="text-2xs uppercase tracking-wide text-ink-faint">Writer</span>
                <select value={filterWriter} onChange={(e) => setFilterWriter(e.target.value)} className={ctrlCls}>
                  <option value="all">All</option>
                  <option value="unassigned">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-0.5">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilterStatus(f.key)}
                    className={cn(
                      'text-2xs px-2 py-1 rounded transition-colors',
                      filterStatus === f.key ? 'bg-ink text-white' : 'text-ink-muted hover:bg-surface-2'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Grouped grid ──────────────────────────────────────────────── */}
            {visible.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-ink-muted mb-2">No articles match these filters.</p>
                <button
                  onClick={() => { setFilterStatus('all'); setFilterWriter('all') }}
                  className="text-xs text-accent hover:text-accent-dark transition-colors"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {groupsArr.map((g) => (
                  <div key={g.key}>
                    {groupBy !== 'none' && (
                      <h2 className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-2.5">
                        {g.label} <span className="text-ink-faint/60">· {g.items.length}</span>
                      </h2>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {g.items.map((a) => (
                        <ArticleCard
                          key={a.id}
                          article={a}
                          writerName={writerName(a)}
                          openComments={openCommentCount(a.id)}
                          overdue={isOverdue(a)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </PageSection>

      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setDraft(BLANK) }}
        title="Add Article"
        footer={
          <>
            <button
              onClick={() => { setShowAdd(false); setDraft(BLANK) }}
              className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!draft.title.trim()}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40"
            >
              Add article
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="Title" required>
            <input
              autoFocus type="text" value={draft.title}
              onChange={(e) => d('title', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Article title" className={inputCls}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type">
              <select value={draft.type} onChange={(e) => d('type', e.target.value as ArticleType)} className={inputCls}>
                {(Object.entries(ARTICLE_TYPE_CONFIG) as [ArticleType, { label: string }][]).map(([v, c]) => (
                  <option key={v} value={v}>{c.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Status">
              <select value={draft.status} onChange={(e) => d('status', e.target.value as ArticleStatus)} className={inputCls}>
                {(Object.entries(ARTICLE_STATUS_CONFIG) as [ArticleStatus, { label: string }][]).map(([v, c]) => (
                  <option key={v} value={v}>{c.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Section">
              <input
                type="text" value={draft.section}
                onChange={(e) => d('section', e.target.value)}
                placeholder="e.g. Features" className={inputCls}
              />
            </FormField>
            <FormField label="Byline">
              <input
                type="text" value={draft.author}
                onChange={(e) => d('author', e.target.value)}
                placeholder="Author name" className={inputCls}
              />
            </FormField>
            <FormField label="Word count target">
              <input
                type="number" value={draft.wordCountTarget || ''}
                onChange={(e) => d('wordCountTarget', Number(e.target.value) || 0)}
                min="0" step="100" placeholder="e.g. 1200" className={inputCls}
              />
            </FormField>
          </div>
        </div>
      </Modal>
    </div>
  )
}
