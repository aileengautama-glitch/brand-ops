import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Newspaper, ChevronRight, Trash2 } from 'lucide-react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { formatDate } from '@/lib/utils'
import PageHeader from '@/components/layout/PageHeader'
import SeasonDateFields from '@/components/ui/SeasonDateFields'
import SeasonFilterBar, { ALL_SEASONS } from '@/components/ui/SeasonFilterBar'
import { defaultSeason, groupBySeason, seasonsPresent, UNASSIGNED_SEASON_LABEL } from '@/lib/seasons'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { MagazineProjectRepository } from '@/repositories'
import type { MagazineProjectSummary } from '@/repositories'
import type { MagazineProject } from '@/types/magazine'

// Local MagazineProject → summary. Existence on this page is store-driven (the store is
// authoritative until Auth/RLS), so seed / not-yet-synced issues always show; mirrors the
// repo's own projectToSummary mapping.
function toSummary(p: MagazineProject): MagazineProjectSummary {
  return {
    id:              p.id,
    season:          p.season,
    name:            p.name,
    description:     p.description,
    editionNumber:   p.editionNumber,
    publicationDate: p.publicationDate,
    theme:           p.theme,
    status:          p.status,
    totalBudget:     p.totalBudget,
    notes:           p.notes,
    createdAt:       p.createdAt,
    updatedAt:       p.updatedAt,
  }
}

// ─── Access denied view ───────────────────────────────────────────────────────

function MagazineAccessDenied() {
  return (
    <div className="p-6 max-w-3xl">
      <div className="text-center py-14">
        <Newspaper size={28} className="mx-auto mb-3 text-ink-faint opacity-30" />
        <p className="text-sm font-medium text-ink-muted">No access to Magazine Projects</p>
        <p className="text-xs text-ink-faint mt-1">
          Contact your admin if you need access to this module.
        </p>
      </div>
    </div>
  )
}

// ─── Project card ─────────────────────────────────────────────────────────────

// NOTE: content-level stats (articles done, spreads planned, outreach confirmed)
// are intentionally absent here — they require the full content arrays which are
// not part of MagazineProjectSummary. They will return when content repos are wired.
function MagazineProjectCard({
  project,
  onDelete,
}: {
  project: MagazineProjectSummary
  onDelete: () => void
}) {
  const statusColors: Record<string, string> = {
    planning:   'bg-surface-3 text-ink-muted',
    production: 'bg-amber-100 text-amber-700',
    review:     'bg-blue-100 text-blue-700',
    published:  'bg-green-100 text-green-700',
  }
  const statusLabels: Record<string, string> = {
    planning:   'Planning',
    production: 'In Production',
    review:     'In Review',
    published:  'Published',
  }

  return (
    <div className="flex items-stretch group card-soft card-interactive">
      <Link
        to={`/magazine/${project.id}/board`}
        className="flex-1 flex items-center justify-between px-4 py-3.5 min-w-0"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-ink truncate">{project.name}</p>
            {project.status && (
              <span className={`text-2xs font-medium px-1.5 py-0.5 rounded shrink-0 ${statusColors[project.status] ?? statusColors.planning}`}>
                {statusLabels[project.status] ?? project.status}
              </span>
            )}
          </div>
          {project.description && (
            <p className="text-xs text-ink-muted mt-0.5 truncate">{project.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {project.editionNumber && (
              <span className="text-2xs text-ink-faint">{project.editionNumber}</span>
            )}
            {project.theme && (
              <span className="text-2xs text-ink-faint truncate max-w-[160px]">
                Theme: {project.theme}
              </span>
            )}
            {project.publicationDate && (
              <span className="text-2xs text-ink-faint">
                Pub: {formatDate(project.publicationDate, 'dd MMM yyyy')}
              </span>
            )}
            <span className="text-2xs text-ink-faint/60">
              Updated {formatDate(project.updatedAt)}
            </span>
          </div>
        </div>
        <ChevronRight
          size={14}
          className="text-ink-faint group-hover:text-ink-muted transition-colors ml-3 shrink-0"
        />
      </Link>
      <button
        onClick={onDelete}
        className="px-3 text-ink-faint hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
        title="Delete project"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MagazineHome() {
  // Writes + reactivity signal: store subscription drives effect re-runs on create/delete
  const storeProjects = useMagazineStore((s) => s.projects)
  const addProject    = useMagazineStore((s) => s.addProject)
  const updateProject = useMagazineStore((s) => s.updateProject)
  const removeProject = useMagazineStore((s) => s.removeProject)
  const navigate      = useNavigate()

  const { isLoggedIn, allowedModules, canView } = useCurrentUser()

  // Repo-backed project list (dual-path: local reads store, Supabase reads DB)
  const [summaries, setSummaries] = useState<MagazineProjectSummary[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    MagazineProjectRepository.listMagazineProjects().then((data) => {
      if (!cancelled) { setSummaries(data); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [storeProjects]) // re-reads repo whenever store changes — keeps local path reactive on create/delete

  const [showForm, setShowForm]       = useState(false)
  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [deleteId, setDeleteId]       = useState<string | null>(null)
  const [season, setSeason]           = useState(defaultSeason())
  const [publishDate, setPublishDate] = useState('')
  const [seasonFilter, setSeasonFilter] = useState<string>(ALL_SEASONS)

  // Module-level access gate — configurable in Settings → Team Access
  if (isLoggedIn && !allowedModules.includes('magazine')) {
    return <MagazineAccessDenied />
  }

  // Existence is driven by the LOCAL store (authoritative until Auth/RLS): seed and
  // not-yet-synced issues must always be visible. Remote summaries (when present) enrich
  // a matching project; remote-only projects are appended. This restores visibility that
  // the Supabase-first repo read alone would hide when the DB is empty / anon-gated.
  const remoteById = new Map(summaries.map((s) => [s.id, s]))
  const localIds   = new Set(storeProjects.map((p) => p.id))
  const allSummaries: MagazineProjectSummary[] = [
    ...storeProjects.map((p) => remoteById.get(p.id) ?? toSummary(p)),
    ...summaries.filter((s) => !localIds.has(s.id)),
  ]

  // Visibility — centralized in useCurrentUser.canView:
  //   admin → all · scoped grants → granted projects only · legacy (no grants) → all
  const visibleProjects = isLoggedIn ? allSummaries.filter((p) => canView('magazine', p.id)) : allSummaries

  // Season grouping / filtering
  const seasonOptions = seasonsPresent(visibleProjects)
  const seasonCounts: Record<string, number> = {}
  for (const p of visibleProjects) seasonCounts[p.season?.trim() || ''] = (seasonCounts[p.season?.trim() || ''] ?? 0) + 1
  const hasUnassigned = visibleProjects.some((p) => !p.season?.trim())
  const filtered = seasonFilter === ALL_SEASONS
    ? visibleProjects
    : visibleProjects.filter((p) => (p.season?.trim() || '') === seasonFilter)
  const seasonGroups = groupBySeason(filtered)

  const canCreate = Boolean(name.trim() && season.trim() && publishDate)

  const handleCreate = () => {
    if (!canCreate) return
    const project = addProject(name.trim(), description.trim())
    // Season + publish date immediately, so magazine gates anchored to launch
    // have a real date from the first render.
    updateProject(project.id, { season: season.trim(), publicationDate: publishDate })
    setName('')
    setDescription('')
    setPublishDate('')
    setShowForm(false)
    navigate(`/magazine/${project.id}/board`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) handleCreate()
    if (e.key === 'Escape') { setShowForm(false); setName(''); setDescription('') }
  }

  const projectToDelete = allSummaries.find((p) => p.id === deleteId)

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        title="Magazine Projects"
        subtitle="Brand editorial magazine issues — pre-production and content planning."
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-sm rounded hover:bg-accent-dark transition-colors"
          >
            <Plus size={13} /> New Magazine Project
          </button>
        }
      />

      {showForm && (
        <div className="mb-5 p-4 bg-surface-1 border border-surface-3 rounded">
          <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-3">
            New Magazine Project
          </p>
          <div className="space-y-2">
            <input
              autoFocus
              type="text"
              placeholder="Project name (e.g. AW26 Magazine — Issue 12)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-1.5 text-sm border border-surface-3 rounded bg-white focus:outline-none focus:border-accent placeholder:text-ink-faint"
            />
            <input
              type="text"
              placeholder="Short description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-1.5 text-sm border border-surface-3 rounded bg-white focus:outline-none focus:border-accent placeholder:text-ink-faint"
            />
            <SeasonDateFields
              season={season} onSeason={setSeason}
              primaryDate={publishDate} onPrimaryDate={setPublishDate}
              primaryLabel="Publish date"
              primaryHint="Offline work counts back from this."
              showLaunch={false}
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreate}
                disabled={!canCreate}
                className="px-3 py-1.5 bg-accent text-white text-sm rounded disabled:opacity-40 hover:bg-accent-dark transition-colors"
              >
                Create project
              </button>
              <button
                onClick={() => { setShowForm(false); setName(''); setDescription(''); setPublishDate('') }}
                className="px-3 py-1.5 text-sm text-ink-muted hover:text-ink border border-surface-3 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && allSummaries.length === 0 ? (
        <div className="py-14 text-center text-xs text-ink-faint">Loading…</div>
      ) : allSummaries.length === 0 ? (
        <div className="text-center py-14 text-ink-faint">
          <Newspaper size={28} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium text-ink-muted">No magazine projects yet.</p>
          <p className="text-xs mt-1">Create your first issue to get started.</p>
        </div>
      ) : (
        <>
          <SeasonFilterBar
            seasons={seasonOptions}
            value={seasonFilter}
            onChange={setSeasonFilter}
            counts={seasonCounts}
            hasUnassigned={hasUnassigned}
          />
          {filtered.length === 0 ? (
            <p className="text-sm text-ink-muted py-8 text-center">No issues in this season.</p>
          ) : (
            <div className="space-y-6">
              {seasonGroups.map((group) => (
                <section key={group.season || 'none'}>
                  <div className="flex items-baseline gap-2 mb-2">
                    <h2 className="text-2xs font-bold uppercase tracking-[0.16em] text-ink-faint">
                      {group.season || UNASSIGNED_SEASON_LABEL}
                    </h2>
                    <span className="text-2xs text-ink-faint tabular-nums">{group.items.length}</span>
                  </div>
                  <div className="space-y-2.5">
                    {group.items.map((project) => (
                      <MagazineProjectCard
                        key={project.id}
                        project={project}
                        onDelete={() => setDeleteId(project.id)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete magazine project"
        message={`Delete "${projectToDelete?.name}"? All articles, visuals, graphics, spreads, outreach, and budget data will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={() => { if (deleteId) removeProject(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
