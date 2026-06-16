import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, BookOpen, ChevronDown, ChevronUp, Trash2, PenLine, Camera, Layers, X } from 'lucide-react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { MagazineSpreadRepository } from '@/repositories'
import { useCurrentMagazineProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { FormField, inputCls } from '@/components/ui/FormField'
import { cn, generateId } from '@/lib/utils'
import type {
  Spread, SpreadContentType, SpreadStatus, SpreadLinkType,
  Article, VisualProject, Graphic, MagazineTeamMember,
} from '@/types/magazine'

// ─── Configs ───────────────────────────────────────────────────────────────────

const SPREAD_CONTENT_CONFIG: Record<SpreadContentType, { label: string; className: string }> = {
  editorial: { label: 'Editorial', className: 'bg-purple-50 text-purple-600'  },
  article:   { label: 'Article',   className: 'bg-sky-50 text-sky-600'        },
  ad:        { label: 'Ad',        className: 'bg-surface-3 text-ink-muted'   },
  blank:     { label: 'Blank',     className: 'bg-surface-2 text-ink-faint'   },
}

const SPREAD_STATUS_CONFIG: Record<SpreadStatus, { label: string; className: string }> = {
  empty:       { label: 'Empty',    className: 'bg-surface-3 text-ink-faint'  },
  planned:     { label: 'Planned',  className: 'bg-amber-100 text-amber-700'  },
  'laid-out':  { label: 'Laid Out', className: 'bg-blue-100  text-blue-700'   },
  final:       { label: 'Final',    className: 'bg-green-100 text-green-700'  },
}

const LINK_ORDER: SpreadLinkType[] = ['article', 'visual', 'graphic']
const CAT: Record<SpreadLinkType, { label: string; icon: typeof PenLine; chip: string }> = {
  article: { label: 'Writing',  icon: PenLine, chip: 'bg-rose-50 text-rose-600'     },
  visual:  { label: 'Visual',   icon: Camera,  chip: 'bg-sky-50 text-sky-600'       },
  graphic: { label: 'Graphics', icon: Layers,  chip: 'bg-purple-50 text-purple-600' },
}

const SECTION_SUGGESTIONS = ['Cover', 'Front of Book', 'Features', 'Opinion', 'Advertising', 'Back of Book']

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '—'
}

// Lookups shared with rows for resolving link labels + navigation targets
type Lookups = {
  projectId: string
  articles: Article[]
  visualProjects: VisualProject[]
  graphics: Graphic[]
}
function resolveLink(type: SpreadLinkType, refId: string, lk: Lookups): { label: string; to: string; found: boolean } {
  if (type === 'article') {
    const a = lk.articles.find((x) => x.id === refId)
    return { found: !!a, label: a ? (a.title || 'Untitled article') : '(removed)', to: `/magazine/${lk.projectId}/writing/${refId}` }
  }
  if (type === 'visual') {
    const v = lk.visualProjects.find((x) => x.id === refId)
    return { found: !!v, label: v ? (v.name || 'Untitled visual') : '(removed)', to: `/magazine/${lk.projectId}/visual/${refId}` }
  }
  const g = lk.graphics.find((x) => x.id === refId)
  return { found: !!g, label: g ? (g.title || 'Untitled graphic') : '(removed)', to: `/magazine/${lk.projectId}/graphics` }
}
function itemsForType(type: SpreadLinkType, lk: Lookups): { id: string; label: string }[] {
  if (type === 'article') return lk.articles.map((a) => ({ id: a.id, label: a.title || 'Untitled article' }))
  if (type === 'visual')  return lk.visualProjects.map((v) => ({ id: v.id, label: v.name || 'Untitled visual' }))
  return lk.graphics.map((g) => ({ id: g.id, label: g.title || 'Untitled graphic' }))
}

// ─── SpreadRow ─────────────────────────────────────────────────────────────────

function SpreadRow({
  spread, lookups, teamMembers, onUpdate, onRemove,
  onMoveUp, onMoveDown, canMoveUp, canMoveDown, showReorder, readOnly,
}: {
  spread: Spread
  lookups: Lookups
  teamMembers: MagazineTeamMember[]
  onUpdate: (patch: Partial<Spread>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  showReorder: boolean
  readOnly: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const contentCfg = SPREAD_CONTENT_CONFIG[spread.contentType] ?? SPREAD_CONTENT_CONFIG.editorial
  const statusCfg  = SPREAD_STATUS_CONFIG[spread.status] ?? SPREAD_STATUS_CONFIG.empty
  const owner      = spread.ownerId ? teamMembers.find((m) => m.id === spread.ownerId) : undefined

  const orderedLinks = [...spread.links].sort(
    (a, b) => LINK_ORDER.indexOf(a.type) - LINK_ORDER.indexOf(b.type)
  )

  const addLink = (type: SpreadLinkType, refId: string) => {
    if (!refId) return
    if (spread.links.some((l) => l.type === type && l.refId === refId)) return
    onUpdate({ links: [...spread.links, { id: generateId(), type, refId }] })
  }
  const removeLink = (linkId: string) =>
    onUpdate({ links: spread.links.filter((l) => l.id !== linkId) })

  return (
    <>
      <div className={cn('border border-surface-3 rounded bg-white', expanded && 'shadow-sm')}>
        {/* Compact entry */}
        <div
          className="px-3 py-2.5 cursor-pointer hover:bg-surface-1/40 transition-colors"
          onClick={() => setExpanded((e) => !e)}
        >
          {/* Line 1 — identity / ownership / status */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-ink shrink-0 min-w-[52px]">
              {spread.pages || <span className="text-ink-faint italic font-normal">—</span>}
            </span>
            <span className={cn('text-2xs font-medium px-1.5 py-0.5 rounded shrink-0', contentCfg.className)}>
              {contentCfg.label}
            </span>
            {spread.section && (
              <span className="text-2xs px-1.5 py-0.5 rounded bg-surface-2 text-ink-secondary shrink-0">
                {spread.section}
              </span>
            )}

            <div className="flex-1" />

            {owner && (
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="w-4 h-4 rounded-full bg-surface-2 text-ink-secondary text-[9px] font-semibold flex items-center justify-center">
                  {initials(owner.name)}
                </span>
                <span className="text-xs text-ink-muted hidden sm:inline">{owner.name.split(' ')[0]}</span>
              </span>
            )}

            <span className={cn('text-2xs font-medium px-1.5 py-0.5 rounded shrink-0', statusCfg.className)}>
              {statusCfg.label}
            </span>

            {showReorder && !readOnly && (
              <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button onClick={onMoveUp} disabled={!canMoveUp} className="p-0.5 rounded text-ink-faint hover:text-ink hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-default" title="Move up">
                  <ChevronUp size={11} />
                </button>
                <button onClick={onMoveDown} disabled={!canMoveDown} className="p-0.5 rounded text-ink-faint hover:text-ink hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-default" title="Move down">
                  <ChevronDown size={11} />
                </button>
              </div>
            )}
            <ChevronDown size={12} className={cn('text-ink-faint shrink-0 transition-transform', expanded && 'rotate-180')} />
          </div>

          {/* Line 2 — categorised linked content (scan at a glance) */}
          {orderedLinks.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 pl-[64px]">
              {orderedLinks.map((l) => {
                const info = resolveLink(l.type, l.refId, lookups)
                const cat = CAT[l.type]
                const Icon = cat.icon
                const chip = (
                  <span className={cn('flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded max-w-[160px]', cat.chip, !info.found && 'opacity-50')}>
                    <Icon size={10} className="shrink-0" />
                    <span className="truncate">{info.label}</span>
                  </span>
                )
                return info.found ? (
                  <Link key={l.id} to={info.to} onClick={(e) => e.stopPropagation()} className="hover:opacity-80 transition-opacity" title={`${cat.label}: ${info.label}`}>
                    {chip}
                  </Link>
                ) : (
                  <span key={l.id}>{chip}</span>
                )
              })}
            </div>
          )}
        </div>

        {/* Expanded editor */}
        {expanded && (
          <div className="border-t border-surface-3 px-3 pb-3 pt-2.5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Page label</label>
                <input type="text" value={spread.pages} onChange={(e) => onUpdate({ pages: e.target.value })} disabled={readOnly} placeholder="e.g. p.4–7, Cover" className={cn(inputCls, readOnly && 'opacity-60')} />
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Content type</label>
                <select value={spread.contentType} onChange={(e) => onUpdate({ contentType: e.target.value as SpreadContentType })} disabled={readOnly} className={cn(inputCls, readOnly && 'opacity-60')}>
                  {(Object.entries(SPREAD_CONTENT_CONFIG) as [SpreadContentType, { label: string }][]).map(([v, c]) => (
                    <option key={v} value={v}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Status</label>
                <select value={spread.status} onChange={(e) => onUpdate({ status: e.target.value as SpreadStatus })} disabled={readOnly} className={cn(inputCls, readOnly && 'opacity-60')}>
                  {(Object.entries(SPREAD_STATUS_CONFIG) as [SpreadStatus, { label: string }][]).map(([v, c]) => (
                    <option key={v} value={v}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Section</label>
                <input type="text" list="spread-sections" value={spread.section} onChange={(e) => onUpdate({ section: e.target.value })} disabled={readOnly} placeholder="e.g. Features" className={cn(inputCls, readOnly && 'opacity-60')} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Owner</label>
                <select value={spread.ownerId} onChange={(e) => onUpdate({ ownerId: e.target.value })} disabled={readOnly} className={cn(inputCls, readOnly && 'opacity-60')}>
                  <option value="">— Unassigned —</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}{m.role ? ` · ${m.role}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Linked content by category */}
            <div className="space-y-2.5 border-t border-surface-2 pt-2.5">
              <p className="text-2xs uppercase tracking-wide text-ink-faint">Linked content</p>
              {LINK_ORDER.map((type) => {
                const cat = CAT[type]
                const Icon = cat.icon
                const catLinks = spread.links.filter((l) => l.type === type)
                const avail = itemsForType(type, lookups).filter(
                  (it) => !spread.links.some((l) => l.type === type && l.refId === it.id)
                )
                return (
                  <div key={type} className="flex items-start gap-2">
                    <span className="flex items-center gap-1 text-2xs text-ink-muted w-20 shrink-0 pt-1">
                      <Icon size={11} /> {cat.label}
                    </span>
                    <div className="flex-1 flex flex-wrap items-center gap-1.5">
                      {catLinks.length === 0 && readOnly && <span className="text-2xs text-ink-faint italic pt-1">None</span>}
                      {catLinks.map((l) => {
                        const info = resolveLink(l.type, l.refId, lookups)
                        return (
                          <span key={l.id} className={cn('flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded', cat.chip, !info.found && 'opacity-50')}>
                            <span className="truncate max-w-[150px]">{info.label}</span>
                            {!readOnly && (
                              <button onClick={() => removeLink(l.id)} className="hover:text-red-500 transition-colors" title="Remove">
                                <X size={10} />
                              </button>
                            )}
                          </span>
                        )
                      })}
                      {!readOnly && avail.length > 0 && (
                        <select
                          value=""
                          onChange={(e) => { if (e.target.value) addLink(type, e.target.value) }}
                          className="text-2xs border border-surface-3 rounded px-1.5 py-0.5 bg-white text-ink-muted"
                        >
                          <option value="">+ Add {cat.label.toLowerCase()}</option>
                          {avail.map((it) => (
                            <option key={it.id} value={it.id}>{it.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wide text-ink-faint block">Notes</label>
              <textarea value={spread.notes} onChange={(e) => onUpdate({ notes: e.target.value })} disabled={readOnly} rows={2} placeholder="Any notes…" className={cn(inputCls, 'resize-none', readOnly && 'opacity-60')} />
            </div>

            {!readOnly && (
              <div className="flex justify-end pt-1 border-t border-surface-3">
                <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={11} /> Delete spread
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete spread"
        message={`Delete spread "${spread.pages || '(no page label)'}"?`}
        confirmLabel="Delete"
        onConfirm={() => { onRemove(); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

// ─── Draft ───────────────────────────────────────────────────────────────────

type SpreadDraft = Pick<Spread, 'pages' | 'contentType' | 'status' | 'section' | 'ownerId'>
const BLANK: SpreadDraft = { pages: '', contentType: 'editorial', status: 'empty', section: '', ownerId: '' }

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MagazineSpread() {
  const { id }        = useParams<{ id: string }>()
  const project       = useCurrentMagazineProject()
  const updateProject = useMagazineStore((s) => s.updateProject)
  const addSpread     = useMagazineStore((s) => s.addSpread)
  const updateSpread  = useMagazineStore((s) => s.updateSpread)
  const removeSpread  = useMagazineStore((s) => s.removeSpread)
  const moveSpread    = useMagazineStore((s) => s.moveSpread)
  const { canEdit }   = useCurrentUser()
  const readOnly      = !canEdit('magazine.spread', id)

  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft]     = useState<SpreadDraft>(BLANK)
  const [view, setView]       = useState<'page' | 'section'>('page')

  // Phase 5E — Supabase-first read of this project's spreads. Fetched once per
  // project; null = no Supabase answer (disabled / non-UUID / error / no rows).
  const [remoteSpreads, setRemoteSpreads] = useState<Spread[] | null>(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    MagazineSpreadRepository.list(id).then((rows) => {
      if (!cancelled) setRemoteSpreads(rows)
    })
    return () => { cancelled = true }
  }, [id])

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const teamMembers = project.teamMembers ?? []
  const lookups: Lookups = {
    projectId: id,
    articles: project.articles ?? [],
    visualProjects: project.visualProjects ?? [],
    graphics: project.graphics ?? [],
  }

  const d = (k: keyof SpreadDraft, v: unknown) => setDraft((p) => ({ ...p, [k]: v }))

  const handleAdd = () => {
    addSpread(id)
    const freshSpreads = useMagazineStore.getState().projects.find((p) => p.id === id)?.spreads ?? []
    const newest = [...freshSpreads].sort((a, b) => b.order - a.order)[0]
    if (newest) updateSpread(id, newest.id, draft)
    setDraft(BLANK)
    setShowAdd(false)
  }

  // Read authority: Supabase rows when present, else the local store copy. Until the
  // table is populated by the dual-write, this falls back to local (no behavior change).
  const sortedSpreads = [...(remoteSpreads ?? project.spreads ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const finalCount    = sortedSpreads.filter((s) => s.status === 'final').length

  // Group by editorial section for the table-of-contents view
  const sectionRank = (key: string) =>
    key === '__none__' ? 999 : (SECTION_SUGGESTIONS.indexOf(key) === -1 ? 500 : SECTION_SUGGESTIONS.indexOf(key))
  const sectionGroups = (() => {
    const map = new Map<string, Spread[]>()
    for (const s of sortedSpreads) {
      const key = (s.section ?? '').trim() || '__none__'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return [...map.entries()]
      .map(([key, items]) => ({ key, label: key === '__none__' ? 'Uncategorised' : key, items }))
      .sort((a, b) => sectionRank(a.key) - sectionRank(b.key))
  })()

  const renderRow = (spread: Spread, idx: number, showReorder: boolean) => (
    <SpreadRow
      key={spread.id}
      spread={spread}
      lookups={lookups}
      teamMembers={teamMembers}
      onUpdate={(patch) => updateSpread(id, spread.id, patch)}
      onRemove={() => removeSpread(id, spread.id)}
      onMoveUp={() => moveSpread(id, spread.id, 'up')}
      onMoveDown={() => moveSpread(id, spread.id, 'down')}
      canMoveUp={idx > 0}
      canMoveDown={idx < sortedSpreads.length - 1}
      showReorder={showReorder}
      readOnly={readOnly}
    />
  )

  const addBtn = !readOnly ? (
    <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
      <Plus size={13} /> Add spread
    </button>
  ) : undefined

  return (
    <div className="p-6 max-w-5xl">
      <datalist id="spread-sections">
        {SECTION_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
      </datalist>

      <ProjectHeader
        name={project.name}
        description={project.description}
        onUpdateName={(name) => updateProject(id, { name })}
        onUpdateDescription={(description) => updateProject(id, { description })}
        actions={addBtn}
      />

      <PageSection label={`Table of Contents — ${finalCount} final / ${sortedSpreads.length} total`}>
        {sortedSpreads.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No spreads planned yet"
            description="Map the page plan as a table of contents — add each spread and link the writing, visuals, and graphics that belong on it."
            action={addBtn}
          />
        ) : (
          <>
            {/* View toggle */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-2xs text-ink-faint">
                {view === 'page' ? 'Page order — drag-free reorder with the arrows.' : 'Grouped by editorial section.'}
              </p>
              <div className="flex items-center gap-0.5">
                {([['page', 'Page order'], ['section', 'By section']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    className={cn('text-2xs px-2 py-1 rounded transition-colors', view === key ? 'bg-ink text-white' : 'text-ink-muted hover:bg-surface-2')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {view === 'page' ? (
              <div className="space-y-1">
                {sortedSpreads.map((spread, idx) => renderRow(spread, idx, true))}
              </div>
            ) : (
              <div className="space-y-5">
                {sectionGroups.map((g) => (
                  <div key={g.key}>
                    <h3 className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-2">
                      {g.label} <span className="text-ink-faint/60">· {g.items.length}</span>
                    </h3>
                    <div className="space-y-1">
                      {g.items.map((spread) => renderRow(spread, 0, false))}
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
        title="Add Spread"
        footer={
          <>
            <button onClick={() => { setShowAdd(false); setDraft(BLANK) }} className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">Cancel</button>
            <button onClick={handleAdd} className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">Add spread</button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Page label" required>
              <input autoFocus type="text" value={draft.pages} onChange={(e) => d('pages', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="e.g. p.4–7, Cover" className={inputCls} />
            </FormField>
            <FormField label="Content type">
              <select value={draft.contentType} onChange={(e) => d('contentType', e.target.value as SpreadContentType)} className={inputCls}>
                {(Object.entries(SPREAD_CONTENT_CONFIG) as [SpreadContentType, { label: string }][]).map(([v, c]) => (
                  <option key={v} value={v}>{c.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Section">
              <input type="text" list="spread-sections" value={draft.section} onChange={(e) => d('section', e.target.value)} placeholder="e.g. Features" className={inputCls} />
            </FormField>
            <FormField label="Status">
              <select value={draft.status} onChange={(e) => d('status', e.target.value as SpreadStatus)} className={inputCls}>
                {(Object.entries(SPREAD_STATUS_CONFIG) as [SpreadStatus, { label: string }][]).map(([v, c]) => (
                  <option key={v} value={v}>{c.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Owner">
              <select value={draft.ownerId} onChange={(e) => d('ownerId', e.target.value)} className={inputCls}>
                <option value="">— Unassigned —</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </FormField>
          </div>
          <p className="text-2xs text-ink-faint">Link writing, visuals, and graphics after creating the spread — open it to add linked content.</p>
        </div>
      </Modal>
    </div>
  )
}
