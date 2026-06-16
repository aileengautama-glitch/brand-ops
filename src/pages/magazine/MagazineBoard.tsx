import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMagazineStore } from '@/store/useMagazineStore'
import { useCurrentMagazineProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import BudgetSummaryBar from '@/components/budget/BudgetSummaryBar'
import { cn, formatDate } from '@/lib/utils'
import { MagazineProjectRepository } from '@/repositories'
import type { MagazineProjectSummary } from '@/repositories'
import type { MagazineProjectStatus } from '@/types/magazine'

// ─── Status stepper config ────────────────────────────────────────────────────

const STATUS_STEPS: { key: MagazineProjectStatus; label: string }[] = [
  { key: 'planning',   label: 'Planning'   },
  { key: 'production', label: 'Production' },
  { key: 'review',     label: 'Review'     },
  { key: 'published',  label: 'Published'  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MagazineBoard() {
  const { id } = useParams<{ id: string }>()
  const project           = useCurrentMagazineProject()  // store: content arrays + write target
  const updateProject     = useMagazineStore((s) => s.updateProject)
  const updateTotalBudget = useMagazineStore((s) => s.updateTotalBudget)
  const { canEdit }       = useCurrentUser()

  // Repo-backed summary — drives summary-field display (name, status, meta, budget, notes).
  // Effect dep on `project` so the local path stays reactive after store writes:
  //   write fires → project reference changes → effect re-runs → setSummary(null) clears
  //   stale data → ?? falls back to fresh project.* for one microtask → repo resolves.
  const [summary, setSummary] = useState<MagazineProjectSummary | null>(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    setSummary(null)  // clear stale data so ?? fallback shows fresh store values during re-fetch
    MagazineProjectRepository.getMagazineProject(id).then((data) => {
      if (!cancelled) setSummary(data)
    })
    return () => { cancelled = true }
  }, [id, project])  // re-read when project in store changes — keeps local path reactive on writes

  if (!project || !id) {
    return <div className="p-6 text-sm text-ink-muted">Project not found.</div>
  }

  const canEditBoard = canEdit('magazine.writing', id) // broad proxy for project-level metadata

  // ── Summary-level display fields ─────────────────────────────────────────
  // Prefer repo data (summary) when loaded; fall back to store (project) which is
  // always current. For local path these are identical (same source). For Supabase,
  // repo may hold fresher DB data once write-sync is wired.
  const displayName        = summary?.name            ?? project.name
  const displayDescription = summary?.description     ?? project.description
  const displayEdition     = summary?.editionNumber   ?? project.editionNumber
  const displayPubDate     = summary?.publicationDate ?? project.publicationDate
  const displayTheme       = summary?.theme           ?? project.theme
  const displayStatus      = summary?.status          ?? project.status
  const displayBudget      = summary?.totalBudget     ?? project.totalBudget
  const displayNotes       = summary?.notes           ?? project.notes

  // ── Metric values ────────────────────────────────────────────────────────
  const inProgressArticles = project.articles.filter(
    (a) => a.status === 'drafting' || a.status === 'review'
  ).length
  const finalArticles  = project.articles.filter((a) => a.status === 'final').length
  const plannedSpreads = project.spreads.filter((s) => s.status !== 'empty').length
  const confirmedOutreach = project.outreach.filter((o) => o.status === 'confirmed').length

  // ── Section progress rows ────────────────────────────────────────────────
  const sectionProgress = [
    {
      label: 'Writing',
      total: project.articles.length,
      done:  finalArticles,
      path:  'writing',
    },
    {
      label: 'Graphics',
      total: project.graphics.length,
      done:  project.graphics.filter((g) => g.status === 'final').length,
      path:  'graphics',
    },
    {
      label: 'Spread',
      total: project.spreads.length,
      done:  project.spreads.filter((s) => s.status === 'final').length,
      path:  'spread',
    },
    {
      label: 'Outreach',
      total: project.outreach.length,
      done:  confirmedOutreach,
      path:  'outreach',
    },
  ]

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === displayStatus)

  return (
    <div className="p-6 max-w-5xl">
      <ProjectHeader
        name={displayName}
        description={displayDescription}
        onUpdateName={(name) => updateProject(id, { name })}
        onUpdateDescription={(description) => updateProject(id, { description })}
        meta={[
          {
            label: 'Edition',
            value: displayEdition,
            editable: canEditBoard,
            onEdit: (v) => updateProject(id, { editionNumber: v }),
          },
          {
            label: 'Pub Date',
            value: displayPubDate ? formatDate(displayPubDate) : '',
            editable: canEditBoard,
            onEdit: (v) => updateProject(id, { publicationDate: v }),
          },
          {
            label: 'Theme',
            value: displayTheme,
            editable: canEditBoard,
            onEdit: (v) => updateProject(id, { theme: v }),
          },
        ]}
        actions={
          <StatusStepper
            steps={STATUS_STEPS}
            currentIdx={currentStepIdx}
            canEdit={canEditBoard}
            onChange={(key) => updateProject(id, { status: key })}
          />
        }
      />

      {/* ── Metric tiles ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <MetricTile label="Articles In-Progress" value={inProgressArticles} />
        <MetricTile
          label="Articles Final"
          value={finalArticles}
          accent={
            finalArticles > 0 &&
            finalArticles === project.articles.length
          }
        />
        <MetricTile
          label="Spreads Planned"
          value={plannedSpreads}
          sub={project.spreads.length > 0 ? `of ${project.spreads.length}` : undefined}
        />
        <MetricTile
          label="Outreach Confirmed"
          value={confirmedOutreach}
          sub={project.outreach.length > 0 ? `of ${project.outreach.length}` : undefined}
        />
      </div>

      {/* ── Issue Brief + Section Progress (two-column) ───────────────── */}
      <div className="grid grid-cols-5 gap-5 mb-6">
        {/* Issue Brief */}
        <div className="col-span-3">
          <PageSection label="Issue Brief">
            <textarea
              value={displayNotes}
              onChange={(e) => updateProject(id, { notes: e.target.value })}
              placeholder="Add editorial direction, tone of voice, or key themes for this issue…"
              rows={7}
              disabled={!canEditBoard}
              className="w-full text-sm text-ink bg-transparent resize-none focus:outline-none placeholder:text-ink-faint disabled:opacity-60"
            />
          </PageSection>
        </div>

        {/* Section progress */}
        <div className="col-span-2">
          <PageSection label="Section Progress">
            <div className="space-y-3">
              {sectionProgress.map(({ label, total, done, path }) => (
                <div key={path}>
                  <div className="flex items-center justify-between mb-1">
                    <Link
                      to={`/magazine/${id}/${path}`}
                      className="text-xs text-ink-muted hover:text-accent transition-colors"
                    >
                      {label}
                    </Link>
                    <span className="text-2xs text-ink-faint">
                      {total === 0 ? 'none yet' : `${done} / ${total}`}
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        total === 0
                          ? ''
                          : done === total
                          ? 'bg-green-500'
                          : 'bg-accent/60'
                      )}
                      style={{
                        width: total > 0 ? `${Math.round((done / total) * 100)}%` : '0%',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </PageSection>
        </div>
      </div>

      {/* ── Budget snapshot ────────────────────────────────────────────── */}
      <PageSection label="Budget Snapshot">
        <BudgetSummaryBar
          totalBudget={displayBudget}
          items={project.budgetItems}
          onEditTotal={(total) => updateTotalBudget(id, total)}
        />
      </PageSection>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="bg-surface-1 border border-surface-3 rounded p-3">
      <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-accent' : 'text-ink'}`}>{value}</p>
      {sub && <p className="text-xs text-ink-faint mt-0.5">{sub}</p>}
    </div>
  )
}

function StatusStepper({
  steps,
  currentIdx,
  canEdit: canEditProp,
  onChange,
}: {
  steps: { key: MagazineProjectStatus; label: string }[]
  currentIdx: number
  canEdit: boolean
  onChange: (key: MagazineProjectStatus) => void
}) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => (
        <button
          key={step.key}
          disabled={!canEditProp}
          onClick={() => canEditProp && onChange(step.key)}
          className={cn(
            'text-2xs font-medium px-2.5 py-1 rounded transition-colors',
            i === currentIdx
              ? 'bg-accent text-white'
              : i < currentIdx
              ? 'bg-surface-3 text-ink-muted'
              : 'text-ink-faint hover:text-ink-muted disabled:cursor-default',
          )}
        >
          {step.label}
        </button>
      ))}
    </div>
  )
}
