import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Clock } from 'lucide-react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { MagazineWriterHoursRepository } from '@/repositories'
import { useCurrentMagazineProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import PageSection from '@/components/layout/PageSection'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { inputCls } from '@/components/ui/FormField'
import { cn, formatDate } from '@/lib/utils'
import type { WriterHoursEntry } from '@/types/magazine'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtHours(h: number): string {
  return `${h % 1 === 0 ? h : h.toFixed(2).replace(/0$/, '')}h`
}

const GENERAL = '__general__' // sentinel for the article filter "General / unlinked"

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MagazineWritingHours() {
  const { id }      = useParams<{ id: string }>()
  const project     = useCurrentMagazineProject()
  const addHours    = useMagazineStore((s) => s.addWriterHours)
  const updateHours = useMagazineStore((s) => s.updateWriterHours)
  const removeHours = useMagazineStore((s) => s.removeWriterHours)
  const { canEdit } = useCurrentUser()
  const readOnly    = !canEdit('magazine.writing', id)

  const todayISO = new Date().toISOString().slice(0, 10)

  // Add-entry form state (supports general/unlinked time via articleId '')
  const [date, setDate]         = useState(todayISO)
  const [hours, setHours]       = useState('')
  const [writerId, setWriterId] = useState('')
  const [articleId, setArticleId] = useState('') // '' = General / unlinked
  const [note, setNote]         = useState('')
  const [billable, setBillable] = useState(true)

  // Filters
  const [fWriter, setFWriter]   = useState<string>('all')   // 'all' | member id | 'unassigned'
  const [fArticle, setFArticle] = useState<string>('all')   // 'all' | article id | GENERAL
  const [fBillable, setFBillable] = useState<'all' | 'billable' | 'non'>('all')

  const [confirmDelete, setConfirmDelete] = useState<WriterHoursEntry | null>(null)

  // Phase 5M — Supabase-first read of this project's writer hours. Fetched once per
  // project; null = no Supabase answer (disabled / non-UUID / error / no rows).
  const [remoteWriterHours, setRemoteWriterHours] = useState<WriterHoursEntry[] | null>(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    MagazineWriterHoursRepository.list(id).then((rows) => {
      if (!cancelled) setRemoteWriterHours(rows)
    })
    return () => { cancelled = true }
  }, [id])

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const teamMembers = project.teamMembers ?? []
  const articles    = project.articles ?? []
  // Read authority: Supabase rows when present, else the local store copy. Until the
  // table is populated by the dual-write, this falls back to local (no behavior change).
  const allEntries  = remoteWriterHours ?? project.writerHours ?? []

  const writerLabel  = (wid: string) => teamMembers.find((m) => m.id === wid)?.name ?? 'Unassigned'
  const articleLabel = (aid: string) =>
    aid ? (articles.find((a) => a.id === aid)?.title || 'Untitled article') : 'General / unlinked'

  const add = () => {
    const h = Number(hours)
    if (!h || h <= 0) return
    addHours(id, {
      date: date || todayISO, hours: h, note: note.trim(),
      articleId, writerId, billable,
    })
    setHours(''); setNote('') // keep date / writer / article / billable for fast multi-entry
  }

  // ── Filter ────────────────────────────────────────────────────────────────
  let entries = [...allEntries]
  if (fWriter === 'unassigned') entries = entries.filter((e) => !e.writerId)
  else if (fWriter !== 'all')   entries = entries.filter((e) => e.writerId === fWriter)
  if (fArticle === GENERAL)     entries = entries.filter((e) => !e.articleId)
  else if (fArticle !== 'all')  entries = entries.filter((e) => e.articleId === fArticle)
  if (fBillable === 'billable') entries = entries.filter((e) => e.billable)
  else if (fBillable === 'non') entries = entries.filter((e) => !e.billable)

  entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)) // newest first

  // ── Totals (reflect current filter) ─────────────────────────────────────────
  const total    = entries.reduce((s, e) => s + e.hours, 0)
  const billTotal = entries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0)
  const nonTotal  = total - billTotal

  // Per-writer breakdown
  const byWriter = new Map<string, number>()
  for (const e of entries) {
    const key = e.writerId || 'unassigned'
    byWriter.set(key, (byWriter.get(key) ?? 0) + e.hours)
  }
  const writerRows = [...byWriter.entries()]
    .map(([key, h]) => ({ key, name: key === 'unassigned' ? 'Unassigned' : writerLabel(key), hours: h }))
    .sort((a, b) => b.hours - a.hours)

  const filtersActive = fWriter !== 'all' || fArticle !== 'all' || fBillable !== 'all'

  return (
    <div className="p-6 max-w-5xl">
      <Link
        to={`/magazine/${id}/board`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors mb-4"
      >
        <ArrowLeft size={14} /> Board
      </Link>

      <div className="pb-5 border-b border-surface-3 mb-6">
        <h1 className="text-2xl font-bold text-ink">Writing Hours</h1>
        <p className="text-sm text-ink-muted">
          {project.name} — across all articles and general writing time.
        </p>
      </div>

      {/* ── Summary ─────────────────────────────────────────────────────────── */}
      <PageSection label={`Summary${filtersActive ? ' (filtered)' : ''}`}>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <StatTile label="Total" value={fmtHours(total)} />
          <StatTile label="Billable" value={fmtHours(billTotal)} accent="green" />
          <StatTile label="Non-billable" value={fmtHours(nonTotal)} />
        </div>
        {writerRows.length > 0 && (
          <div className="border border-surface-3 rounded-lg bg-white divide-y divide-surface-2">
            {writerRows.map((w) => (
              <div key={w.key} className="flex items-center justify-between px-3 py-1.5">
                <span className="text-xs text-ink-secondary">{w.name}</span>
                <span className="text-xs font-medium text-ink tabular-nums">{fmtHours(w.hours)}</span>
              </div>
            ))}
          </div>
        )}
      </PageSection>

      {/* ── Add entry ───────────────────────────────────────────────────────── */}
      {!readOnly && (
        <PageSection label="Log time">
          <div className="border border-surface-3 rounded-lg bg-white p-3">
            <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end">
              <div className="sm:col-span-3 space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Hours</label>
                <input
                  type="number" value={hours} onChange={(e) => setHours(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && add()}
                  min="0" step="0.25" placeholder="0.0" className={inputCls}
                />
              </div>
              <div className="sm:col-span-4 space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Writer</label>
                <select value={writerId} onChange={(e) => setWriterId(e.target.value)} className={inputCls}>
                  <option value="">— Unassigned —</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3 space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Billable</label>
                <button
                  onClick={() => setBillable((b) => !b)}
                  className={cn(
                    'w-full text-xs px-2 py-1.5 rounded border transition-colors',
                    billable
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-surface-1 border-surface-3 text-ink-muted'
                  )}
                >
                  {billable ? 'Billable' : 'Non-billable'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end mt-2">
              <div className="sm:col-span-5 space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Article</label>
                <select value={articleId} onChange={(e) => setArticleId(e.target.value)} className={inputCls}>
                  <option value="">General / unlinked</option>
                  {articles.map((a) => (
                    <option key={a.id} value={a.id}>{a.title || 'Untitled article'}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-5 space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Note</label>
                <input
                  type="text" value={note} onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && add()}
                  placeholder="What was worked on…" className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  onClick={add}
                  disabled={!Number(hours)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40"
                >
                  <Plus size={12} /> Log
                </button>
              </div>
            </div>
          </div>
        </PageSection>
      )}

      {/* ── Entries ─────────────────────────────────────────────────────────── */}
      <PageSection label={`Entries — ${entries.length}`}>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3 pb-3 border-b border-surface-2">
          <div className="flex items-center gap-1.5">
            <span className="text-2xs uppercase tracking-wide text-ink-faint">Writer</span>
            <select value={fWriter} onChange={(e) => setFWriter(e.target.value)} className="text-xs border border-surface-3 rounded px-2 py-1 bg-white text-ink-secondary">
              <option value="all">All</option>
              <option value="unassigned">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-2xs uppercase tracking-wide text-ink-faint">Article</span>
            <select value={fArticle} onChange={(e) => setFArticle(e.target.value)} className="text-xs border border-surface-3 rounded px-2 py-1 bg-white text-ink-secondary">
              <option value="all">All</option>
              <option value={GENERAL}>General / unlinked</option>
              {articles.map((a) => (
                <option key={a.id} value={a.id}>{a.title || 'Untitled article'}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-0.5">
            {([['all', 'All'], ['billable', 'Billable'], ['non', 'Non-bill.']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFBillable(key)}
                className={cn(
                  'text-2xs px-2 py-1 rounded transition-colors',
                  fBillable === key ? 'bg-ink text-white' : 'text-ink-muted hover:bg-surface-2'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-10">
            <Clock size={22} className="text-ink-faint mx-auto mb-2" />
            <p className="text-sm text-ink-muted">
              {allEntries.length === 0 ? 'No hours logged yet.' : 'No entries match these filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-3 py-2 border border-surface-3 rounded bg-white">
                <Clock size={12} className="text-ink-faint shrink-0" />
                <span className="text-xs text-ink-muted shrink-0 w-16 tabular-nums">{formatDate(e.date, 'dd MMM')}</span>
                <span className="text-sm font-medium text-ink shrink-0 w-12 tabular-nums">{fmtHours(e.hours)}</span>
                <span className="text-xs text-ink-muted shrink-0 w-28 truncate">{writerLabel(e.writerId)}</span>
                <span
                  className={cn(
                    'text-2xs shrink-0 w-32 truncate',
                    e.articleId ? 'text-ink-secondary' : 'text-ink-faint italic'
                  )}
                  title={articleLabel(e.articleId)}
                >
                  {articleLabel(e.articleId)}
                </span>
                <span className="flex-1 text-xs text-ink-secondary truncate">
                  {e.note || <span className="text-ink-faint italic">No note</span>}
                </span>
                <button
                  onClick={() => !readOnly && updateHours(id, e.id, { billable: !e.billable })}
                  disabled={readOnly}
                  title={readOnly ? undefined : 'Toggle billable'}
                  className={cn(
                    'text-2xs font-medium px-1.5 py-0.5 rounded shrink-0 transition-colors',
                    e.billable ? 'bg-green-50 text-green-600' : 'bg-surface-2 text-ink-faint',
                    !readOnly && 'hover:opacity-80 cursor-pointer'
                  )}
                >
                  {e.billable ? 'Billable' : 'Non-bill.'}
                </button>
                {!readOnly && (
                  <button
                    onClick={() => setConfirmDelete(e)}
                    title="Delete entry"
                    className="p-0.5 rounded text-ink-faint hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </PageSection>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete hours entry"
        message={confirmDelete ? `Delete the ${fmtHours(confirmDelete.hours)} entry from ${formatDate(confirmDelete.date, 'dd MMM yyyy')}?` : ''}
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDelete) { removeHours(id, confirmDelete.id); setConfirmDelete(null) } }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}

// ─── StatTile ────────────────────────────────────────────────────────────────

function StatTile({ label, value, accent }: { label: string; value: string; accent?: 'green' }) {
  return (
    <div className="border border-surface-3 rounded-lg bg-white p-3">
      <p className="text-2xs uppercase tracking-wide text-ink-faint mb-1">{label}</p>
      <p className={cn('text-lg font-semibold tabular-nums', accent === 'green' ? 'text-green-700' : 'text-ink')}>
        {value}
      </p>
    </div>
  )
}
