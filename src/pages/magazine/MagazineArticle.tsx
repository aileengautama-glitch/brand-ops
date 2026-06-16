import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, RotateCcw, Trash2, History, Save,
  MessageSquare, Lightbulb, Check, X, Clock, Plus, Quote, Crosshair,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { MagazineArticleVersionRepository, MagazineArticleCommentRepository } from '@/repositories'
import { useCurrentMagazineProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import PageSection from '@/components/layout/PageSection'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Modal from '@/components/ui/Modal'
import { FormField, inputCls } from '@/components/ui/FormField'
import { cn, now, formatDate, formatDateTime } from '@/lib/utils'
import type {
  Article, ArticleStatus, ArticleVersion,
  ArticleComment, ArticleCommentAnchor, ArticleNoteKind, WriterHoursEntry, MagazineTeamMember,
} from '@/types/magazine'
import { ARTICLE_TYPE_CONFIG, ARTICLE_STATUS_CONFIG } from './MagazineWriting'

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function countWords(s: string | undefined | null): number {
  const t = (s ?? '').trim()
  return t ? t.split(/\s+/).length : 0
}

// Editorial draft statuses (final is reached only via the Approve action)
const DRAFT_STATUSES: ArticleStatus[] = ['idea', 'drafting', 'review']

// ─── VersionHistory ──────────────────────────────────────────────────────────

function VersionHistory({
  projectId, article, versions, readOnly, userId, userName,
}: {
  projectId: string
  article: Article
  versions: ArticleVersion[]
  readOnly: boolean
  userId: string
  userName: string
}) {
  const addVersion     = useMagazineStore((s) => s.addArticleVersion)
  const removeVersion  = useMagazineStore((s) => s.removeArticleVersion)
  const restoreVersion = useMagazineStore((s) => s.restoreArticleVersion)

  const [showSave, setShowSave]   = useState(false)
  const [label, setLabel]         = useState('')
  const [note, setNote]           = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [confirmRestore, setConfirmRestore] = useState<ArticleVersion | null>(null)
  const [confirmDelete, setConfirmDelete]   = useState<ArticleVersion | null>(null)

  const sorted = [...versions].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  const openSave = () => {
    setLabel(`v${versions.length + 1}`)
    setNote('')
    setShowSave(true)
  }
  const handleSave = () => {
    addVersion(projectId, {
      articleId: article.id,
      label: label.trim() || `v${versions.length + 1}`,
      body: article.body,
      wordCount: countWords(article.body),
      authorId: userId, authorName: userName,
      note: note.trim(),
    })
    setShowSave(false)
  }
  const handleRestore = (v: ArticleVersion) => {
    // Non-destructive: snapshot the current body first, then restore
    addVersion(projectId, {
      articleId: article.id,
      label: 'Auto-save before restore',
      body: article.body,
      wordCount: countWords(article.body),
      authorId: userId, authorName: userName,
      note: `Snapshot taken before restoring "${v.label}"`,
    })
    restoreVersion(projectId, article.id, v.id)
    setConfirmRestore(null)
  }

  return (
    <PageSection
      label="Version history"
      actions={!readOnly ? (
        <button
          onClick={openSave}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-surface-2 text-ink-secondary rounded hover:bg-surface-3 transition-colors"
        >
          <Save size={12} /> Save version
        </button>
      ) : undefined}
    >
      {sorted.length === 0 ? (
        <p className="text-xs text-ink-faint italic px-1 py-2">
          No saved versions yet. Save a snapshot to enable backtracking.
        </p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map((v) => {
            const expanded = previewId === v.id
            return (
              <div key={v.id} className="border border-surface-3 rounded bg-white">
                <div className="flex items-center gap-3 px-3 py-2">
                  <History size={13} className="text-ink-faint shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink font-medium truncate">{v.label}</p>
                    <p className="text-2xs text-ink-faint">
                      {v.authorName || 'Unknown'} · {formatDateTime(v.createdAt)} · {v.wordCount.toLocaleString()} words
                    </p>
                    {v.note && <p className="text-xs text-ink-muted mt-0.5 truncate">{v.note}</p>}
                  </div>
                  <button
                    onClick={() => setPreviewId(expanded ? null : v.id)}
                    className="text-2xs text-ink-muted hover:text-ink px-1.5 py-0.5 rounded hover:bg-surface-1 transition-colors shrink-0"
                  >
                    {expanded ? 'Hide' : 'Preview'}
                  </button>
                  {!readOnly && (
                    <>
                      <button
                        onClick={() => setConfirmRestore(v)}
                        title="Restore this version"
                        className="flex items-center gap-1 text-2xs text-accent hover:text-accent-dark px-1.5 py-0.5 rounded hover:bg-accent/10 transition-colors shrink-0"
                      >
                        <RotateCcw size={11} /> Restore
                      </button>
                      <button
                        onClick={() => setConfirmDelete(v)}
                        title="Delete version"
                        className="p-0.5 rounded text-ink-faint hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 size={11} />
                      </button>
                    </>
                  )}
                </div>
                {expanded && (
                  <div className="border-t border-surface-3 px-3 py-2.5">
                    <pre className="text-xs text-ink-muted whitespace-pre-wrap font-serif leading-6 max-h-64 overflow-y-auto">
                      {v.body || '(empty)'}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={showSave}
        onClose={() => setShowSave(false)}
        title="Save version"
        footer={
          <>
            <button onClick={() => setShowSave(false)} className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">Save snapshot</button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-ink-muted">
            Snapshots the current draft ({countWords(article.body).toLocaleString()} words) so you can return to it later.
          </p>
          <FormField label="Label">
            <input autoFocus type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. v3, Draft sent to editor" className={inputCls} />
          </FormField>
          <FormField label="What changed (optional)">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmRestore !== null}
        title="Restore version"
        message={confirmRestore ? `Restore "${confirmRestore.label}"? Your current draft will be snapshotted first, so nothing is lost.` : ''}
        confirmLabel="Restore"
        destructive={false}
        onConfirm={() => confirmRestore && handleRestore(confirmRestore)}
        onCancel={() => setConfirmRestore(null)}
      />
      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete version"
        message={confirmDelete ? `Delete snapshot "${confirmDelete.label}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDelete) { removeVersion(projectId, confirmDelete.id); setConfirmDelete(null) } }}
        onCancel={() => setConfirmDelete(null)}
      />
    </PageSection>
  )
}

// ─── CommentThread (comments + revision suggestions) ─────────────────────────

// Resolution wording differs by kind so the action reads naturally
function noteStatusLabel(kind: ArticleNoteKind, status: ArticleComment['status']): string {
  if (status === 'open') return 'Open'
  if (kind === 'suggestion') return status === 'approved' ? 'Accepted' : 'Declined'
  return status === 'approved' ? 'Resolved' : 'Dismissed'
}
const NOTE_STATUS_CLASS: Record<ArticleComment['status'], string> = {
  open:     'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-surface-3 text-ink-faint',
}

// How well an anchor still matches the live body: exact offsets, relocated, or gone.
function anchorState(articleBody: string, anchor: ArticleCommentAnchor): 'exact' | 'moved' | 'stale' {
  if (articleBody.slice(anchor.start, anchor.end) === anchor.quote) return 'exact'
  return anchor.quote && articleBody.includes(anchor.quote) ? 'moved' : 'stale'
}

function CommentThread({
  projectId, articleId, comments, readOnly, userId, userName,
  articleBody, pendingAnchor, onClearPending, onLocate,
}: {
  projectId: string
  articleId: string
  comments: ArticleComment[]
  readOnly: boolean
  userId: string
  userName: string
  articleBody: string
  pendingAnchor: ArticleCommentAnchor | null
  onClearPending: () => void
  onLocate: (anchor: ArticleCommentAnchor) => boolean
}) {
  const addComment     = useMagazineStore((s) => s.addArticleComment)
  const removeComment  = useMagazineStore((s) => s.removeArticleComment)
  const resolveComment = useMagazineStore((s) => s.resolveArticleComment)

  const [kind, setKind]   = useState<ArticleNoteKind>('comment')
  const [body, setBody]   = useState('')
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [confirmDelete, setConfirmDelete] = useState<ArticleComment | null>(null)

  const sorted  = [...comments].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)) // oldest first
  const visible = sorted.filter((c) =>
    filter === 'all' ? true : filter === 'open' ? c.status === 'open' : c.status !== 'open'
  )
  const openCount = comments.filter((c) => c.status === 'open').length

  const post = () => {
    if (!body.trim()) return
    addComment(projectId, {
      articleId, kind, authorId: userId, authorName: userName,
      body: body.trim(), status: 'open',
      resolvedById: '', resolvedByName: '', resolvedAt: '',
      ...(pendingAnchor ? { anchor: pendingAnchor } : {}),
    })
    setBody(''); setKind('comment')
    if (pendingAnchor) onClearPending()
  }
  const resolve = (c: ArticleComment, status: ArticleComment['status']) =>
    resolveComment(projectId, c.id, status, userId, userName)

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'all',      label: `All · ${comments.length}` },
    { key: 'open',     label: `Open · ${openCount}` },
    { key: 'resolved', label: 'Resolved' },
  ]

  return (
    <PageSection
      label="Comments & suggestions"
      actions={
        <div className="flex items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'text-2xs px-2 py-0.5 rounded transition-colors',
                filter === f.key ? 'bg-ink text-white' : 'text-ink-muted hover:bg-surface-2'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      }
    >
      {/* Composer */}
      {!readOnly && (
        <div className="border border-surface-3 rounded-lg bg-white p-3 mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <button
              onClick={() => setKind('comment')}
              className={cn(
                'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors',
                kind === 'comment' ? 'bg-ink text-white' : 'bg-surface-2 text-ink-secondary hover:bg-surface-3'
              )}
            >
              <MessageSquare size={12} /> Comment
            </button>
            <button
              onClick={() => setKind('suggestion')}
              className={cn(
                'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors',
                kind === 'suggestion' ? 'bg-amber-500 text-white' : 'bg-surface-2 text-ink-secondary hover:bg-surface-3'
              )}
            >
              <Lightbulb size={12} /> Suggestion
            </button>
          </div>
          {pendingAnchor ? (
            <div className="flex items-start gap-1.5 mb-2 text-2xs bg-accent/5 border border-accent/20 rounded px-2 py-1.5">
              <Quote size={11} className="text-accent shrink-0 mt-0.5" />
              <span className="flex-1 text-ink-secondary line-clamp-2">
                Attaching to: <span className="italic">“{pendingAnchor.quote}”</span>
              </span>
              <button onClick={onClearPending} className="text-ink-faint hover:text-red-500 transition-colors shrink-0" title="Detach from text">
                <X size={11} />
              </button>
            </div>
          ) : (
            <p className="text-2xs text-ink-faint mb-2">Select text in the draft above to attach this to a passage.</p>
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder={kind === 'suggestion' ? 'Propose a revision…' : 'Add a comment…'}
            className="w-full text-sm border border-surface-3 rounded p-2 bg-white text-ink resize-y leading-relaxed"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={post}
              disabled={!body.trim()}
              className="px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40"
            >
              Post {kind === 'suggestion' ? 'suggestion' : 'comment'}
            </button>
          </div>
        </div>
      )}

      {/* Thread */}
      {visible.length === 0 ? (
        <p className="text-xs text-ink-faint italic px-1 py-2">
          {comments.length === 0 ? 'No comments or suggestions yet.' : 'Nothing in this filter.'}
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((c) => {
            const isSuggestion = c.kind === 'suggestion'
            const resolved     = c.status !== 'open'
            return (
              <div
                key={c.id}
                className={cn(
                  'border rounded-lg bg-white p-3',
                  resolved ? 'border-surface-3 opacity-80' : isSuggestion ? 'border-amber-200' : 'border-surface-3'
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={cn(
                      'flex items-center gap-1 text-2xs font-medium px-1.5 py-0.5 rounded',
                      isSuggestion ? 'bg-amber-50 text-amber-600' : 'bg-surface-2 text-ink-secondary'
                    )}
                  >
                    {isSuggestion ? <Lightbulb size={10} /> : <MessageSquare size={10} />}
                    {isSuggestion ? 'Suggestion' : 'Comment'}
                  </span>
                  <span className="text-xs font-medium text-ink">{c.authorName || 'Unknown'}</span>
                  <span className="text-2xs text-ink-faint">{formatDateTime(c.createdAt)}</span>
                  <span className={cn('ml-auto text-2xs font-medium px-1.5 py-0.5 rounded', NOTE_STATUS_CLASS[c.status])}>
                    {noteStatusLabel(c.kind, c.status)}
                  </span>
                </div>

                {/* Anchored passage */}
                {c.anchor && (() => {
                  const state = anchorState(articleBody, c.anchor)
                  return (
                    <div className="mb-1.5">
                      <div className="flex items-start gap-1.5 border-l-2 border-accent/40 bg-surface-1 rounded-r px-2 py-1">
                        <Quote size={10} className="text-ink-faint shrink-0 mt-0.5" />
                        <span className={cn('flex-1 text-2xs italic line-clamp-2', state === 'stale' ? 'text-ink-faint line-through' : 'text-ink-muted')}>
                          {c.anchor.quote}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {state !== 'stale' && (
                          <button
                            onClick={() => onLocate(c.anchor!)}
                            className="flex items-center gap-1 text-2xs text-accent hover:text-accent-dark transition-colors"
                          >
                            <Crosshair size={10} /> Jump to text
                          </button>
                        )}
                        {state === 'moved' && <span className="text-2xs text-amber-600">· passage moved</span>}
                        {state === 'stale' && <span className="text-2xs text-red-500">· passage no longer in draft</span>}
                      </div>
                    </div>
                  )
                })()}

                <p className="text-sm text-ink-secondary whitespace-pre-wrap leading-relaxed">{c.body}</p>

                {/* Resolution line / actions */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-surface-2">
                  {resolved && (
                    <p className="text-2xs text-ink-faint flex-1">
                      {noteStatusLabel(c.kind, c.status)}
                      {c.resolvedByName ? ` by ${c.resolvedByName}` : ''}
                      {c.resolvedAt ? ` · ${formatDateTime(c.resolvedAt)}` : ''}
                    </p>
                  )}
                  {!readOnly && (
                    <div className={cn('flex items-center gap-1.5', !resolved && 'flex-1 justify-end')}>
                      {!resolved ? (
                        <>
                          <button
                            onClick={() => resolve(c, 'approved')}
                            className="flex items-center gap-1 text-2xs text-green-700 px-2 py-0.5 rounded hover:bg-green-50 transition-colors"
                          >
                            <Check size={11} /> {isSuggestion ? 'Accept' : 'Resolve'}
                          </button>
                          <button
                            onClick={() => resolve(c, 'rejected')}
                            className="flex items-center gap-1 text-2xs text-ink-muted px-2 py-0.5 rounded hover:bg-surface-2 transition-colors"
                          >
                            <X size={11} /> {isSuggestion ? 'Decline' : 'Dismiss'}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => resolve(c, 'open')}
                          className="flex items-center gap-1 text-2xs text-ink-muted px-2 py-0.5 rounded hover:bg-surface-2 transition-colors"
                        >
                          <RotateCcw size={11} /> Reopen
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(c)}
                        title="Delete"
                        className="p-0.5 rounded text-ink-faint hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete item"
        message={confirmDelete ? `Delete this ${confirmDelete.kind}? This cannot be undone.` : ''}
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDelete) { removeComment(projectId, confirmDelete.id); setConfirmDelete(null) } }}
        onCancel={() => setConfirmDelete(null)}
      />
    </PageSection>
  )
}

// ─── HoursLog (writer time log) ──────────────────────────────────────────────

function fmtHours(h: number): string {
  return `${h % 1 === 0 ? h : h.toFixed(2).replace(/0$/, '')}h`
}

function HoursLog({
  projectId, articleId, entries, teamMembers, defaultWriterId, readOnly,
}: {
  projectId: string
  articleId: string
  entries: WriterHoursEntry[]
  teamMembers: MagazineTeamMember[]
  defaultWriterId: string
  readOnly: boolean
}) {
  const addHours    = useMagazineStore((s) => s.addWriterHours)
  const updateHours = useMagazineStore((s) => s.updateWriterHours)
  const removeHours = useMagazineStore((s) => s.removeWriterHours)

  const todayISO = new Date().toISOString().slice(0, 10)
  const [date, setDate]         = useState(todayISO)
  const [hours, setHours]       = useState('')
  const [writerId, setWriterId] = useState(defaultWriterId)
  const [note, setNote]         = useState('')
  const [billable, setBillable] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<WriterHoursEntry | null>(null)

  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1)) // newest date first
  const total         = entries.reduce((s, e) => s + e.hours, 0)
  const billableTotal = entries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0)

  const writerName = (wid: string) => teamMembers.find((m) => m.id === wid)?.name ?? '—'

  const add = () => {
    const h = Number(hours)
    if (!h || h <= 0) return
    addHours(projectId, {
      date: date || todayISO, hours: h, note: note.trim(),
      articleId, writerId, billable,
    })
    setHours(''); setNote('') // keep date / writer / billable for fast multi-entry
  }

  return (
    <PageSection
      label="Writer hours"
      actions={
        <span className="text-2xs text-ink-faint tabular-nums">
          {fmtHours(total)} total
          <span className="text-ink-faint/60"> · {fmtHours(billableTotal)} billable</span>
        </span>
      }
    >
      {/* Add row */}
      {!readOnly && (
        <div className="border border-surface-3 rounded-lg bg-white p-3 mb-3">
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
          <div className="flex items-end gap-2 mt-2">
            <div className="flex-1 space-y-1">
              <label className="text-2xs uppercase tracking-wide text-ink-faint block">Note</label>
              <input
                type="text" value={note} onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && add()}
                placeholder="What was worked on…" className={inputCls}
              />
            </div>
            <button
              onClick={add}
              disabled={!Number(hours)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40 shrink-0"
            >
              <Plus size={12} /> Log
            </button>
          </div>
        </div>
      )}

      {/* Entries */}
      {sorted.length === 0 ? (
        <p className="text-xs text-ink-faint italic px-1 py-2">No hours logged for this article yet.</p>
      ) : (
        <div className="space-y-1">
          {sorted.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-3 py-2 border border-surface-3 rounded bg-white">
              <Clock size={12} className="text-ink-faint shrink-0" />
              <span className="text-xs text-ink-muted shrink-0 w-16 tabular-nums">{formatDate(e.date, 'dd MMM')}</span>
              <span className="text-sm font-medium text-ink shrink-0 w-12 tabular-nums">{fmtHours(e.hours)}</span>
              <span className="text-xs text-ink-muted shrink-0 w-28 truncate">{writerName(e.writerId)}</span>
              <span className="flex-1 text-xs text-ink-secondary truncate">{e.note || <span className="text-ink-faint italic">No note</span>}</span>
              <button
                onClick={() => !readOnly && updateHours(projectId, e.id, { billable: !e.billable })}
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

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete hours entry"
        message={confirmDelete ? `Delete the ${fmtHours(confirmDelete.hours)} entry from ${formatDate(confirmDelete.date, 'dd MMM yyyy')}?` : ''}
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDelete) { removeHours(projectId, confirmDelete.id); setConfirmDelete(null) } }}
        onCancel={() => setConfirmDelete(null)}
      />
    </PageSection>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MagazineArticle() {
  const { id, articleId } = useParams<{ id: string; articleId: string }>()
  const project       = useCurrentMagazineProject()
  const updateArticle = useMagazineStore((s) => s.updateArticle)
  const removeArticle = useMagazineStore((s) => s.removeArticle)
  const { canEdit, user } = useCurrentUser()
  const readOnly      = !canEdit('magazine.writing', id)

  const [confirmDelete, setConfirmDelete]   = useState(false)
  const [confirmApprove, setConfirmApprove] = useState(false)

  // Document-review text anchoring
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const [pendingAnchor, setPendingAnchor] = useState<ArticleCommentAnchor | null>(null)

  // Phase 5N — Supabase-first read of this project's article versions. Fetched once per
  // project; null = no Supabase answer (disabled / non-UUID / error / no rows). Filtered
  // per-article at the read site below (behavior unchanged).
  const [remoteArticleVersions, setRemoteArticleVersions] = useState<ArticleVersion[] | null>(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    MagazineArticleVersionRepository.list(id).then((rows) => {
      if (!cancelled) setRemoteArticleVersions(rows)
    })
    return () => { cancelled = true }
  }, [id])

  // Phase 5O — Supabase-first read of this project's article comments. Independent of the
  // versions fetch above (separate state + effect, same [id] key). Filtered per-article at
  // the read sites below (behavior unchanged).
  const [remoteArticleComments, setRemoteArticleComments] = useState<ArticleComment[] | null>(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    MagazineArticleCommentRepository.list(id).then((rows) => {
      if (!cancelled) setRemoteArticleComments(rows)
    })
    return () => { cancelled = true }
  }, [id])

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>
  const article = (project.articles ?? []).find((a) => a.id === articleId)
  if (!article) {
    return (
      <div className="p-6 max-w-4xl">
        <Link to={`/magazine/${id}/board`} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors mb-4">
          <ArrowLeft size={14} /> Board
        </Link>
        <p className="text-sm text-ink-muted">Article not found.</p>
      </div>
    )
  }

  const upd = (patch: Parameters<typeof updateArticle>[2]) => updateArticle(id, article.id, patch)

  const teamMembers = project.teamMembers ?? []
  const typeCfg   = ARTICLE_TYPE_CONFIG[article.type] ?? ARTICLE_TYPE_CONFIG.article
  const statusCfg = ARTICLE_STATUS_CONFIG[article.status] ?? ARTICLE_STATUS_CONFIG.idea
  const isFinal   = article.status === 'final'

  const liveWords = countWords(article.body)
  const target    = article.wordCountTarget ?? 0

  // Review-readiness — outstanding items the approver should clear before finalising
  const myComments     = (remoteArticleComments ?? project.articleComments ?? []).filter((c) => c.articleId === article.id)
  const openSuggestions = myComments.filter((c) => c.kind === 'suggestion' && c.status === 'open').length
  const openComments    = myComments.filter((c) => c.kind === 'comment' && c.status === 'open').length
  const openItems       = openSuggestions + openComments

  const approve = () =>
    upd({
      status: 'final',
      approvedById: user?.id ?? '',
      approvedByName: user?.name ?? 'Unknown',
      approvedAt: now(),
    })
  // Warn (don't block) when finalising with unresolved discussion items
  const requestApprove = () => {
    if (openItems > 0) setConfirmApprove(true)
    else approve()
  }
  const reopen = () =>
    upd({ status: 'review', approvedById: '', approvedByName: '', approvedAt: '' })

  // Editing the body invalidates a pending selection anchor — reset it for reliability.
  const handleBody = (v: string) => {
    if (pendingAnchor) setPendingAnchor(null)
    upd({ body: v, wordCountActual: countWords(v) })
  }

  // Capture the current textarea selection as a pending anchor (non-empty only).
  const captureSelection = () => {
    const el = bodyRef.current
    if (!el) return
    const start = el.selectionStart
    const end   = el.selectionEnd
    if (end > start) setPendingAnchor({ start, end, quote: el.value.slice(start, end) })
  }

  // Re-select an anchor's range in the body: verify offsets, else re-find by quote.
  const locateAnchor = (anchor: ArticleCommentAnchor): boolean => {
    const el = bodyRef.current
    if (!el) return false
    const text = el.value
    let { start, end } = anchor
    if (text.slice(start, end) !== anchor.quote) {
      const idx = anchor.quote ? text.indexOf(anchor.quote) : -1
      if (idx === -1) return false
      start = idx
      end   = idx + anchor.quote.length
    }
    el.focus()
    el.setSelectionRange(start, end)
    return true
  }

  const openItemsLabel = [
    openSuggestions > 0 ? `${openSuggestions} open suggestion${openSuggestions > 1 ? 's' : ''}` : '',
    openComments > 0 ? `${openComments} open comment${openComments > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ')

  return (
    <div className="p-6 max-w-4xl">
      {/* Back link */}
      <Link to={`/magazine/${id}/board`} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors mb-4">
        <ArrowLeft size={14} /> Board
      </Link>

      {/* ── Header card ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-surface-3 rounded-lg p-4 mb-5">
        <div className="flex items-start gap-3">
          <span className={cn('text-2xs font-medium px-1.5 py-0.5 rounded shrink-0 mt-1.5', typeCfg.className)}>
            {typeCfg.label}
          </span>
          <input
            type="text"
            value={article.title}
            onChange={(e) => upd({ title: e.target.value })}
            disabled={readOnly}
            placeholder="Untitled article"
            className="flex-1 text-xl font-semibold text-ink bg-transparent outline-none placeholder:text-ink-faint disabled:opacity-70"
          />
          {isFinal ? (
            <span className={cn('text-2xs font-medium px-2 py-1 rounded shrink-0', statusCfg.className)}>
              {statusCfg.label}
            </span>
          ) : (
            <select
              value={article.status}
              onChange={(e) => upd({ status: e.target.value as ArticleStatus })}
              disabled={readOnly}
              className="text-xs border border-surface-3 rounded px-2 py-1 bg-white text-ink-secondary shrink-0 disabled:opacity-60"
            >
              {DRAFT_STATUSES.map((s) => (
                <option key={s} value={s}>{ARTICLE_STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wide text-ink-faint block">Assigned writer</label>
            <select
              value={article.assignedWriterId}
              onChange={(e) => upd({ assignedWriterId: e.target.value })}
              disabled={readOnly}
              className="w-full text-sm border border-surface-3 rounded px-2 py-1.5 bg-white text-ink disabled:opacity-60"
            >
              <option value="">— Unassigned —</option>
              {project.teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{m.role ? ` · ${m.role}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wide text-ink-faint block">Approver</label>
            <select
              value={article.approverId}
              onChange={(e) => upd({ approverId: e.target.value })}
              disabled={readOnly}
              className="w-full text-sm border border-surface-3 rounded px-2 py-1.5 bg-white text-ink disabled:opacity-60"
            >
              <option value="">— Unassigned —</option>
              {project.teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{m.role ? ` · ${m.role}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wide text-ink-faint block">Section</label>
            <input
              type="text" value={article.section}
              onChange={(e) => upd({ section: e.target.value })}
              disabled={readOnly}
              placeholder="—"
              className="w-full text-sm border border-surface-3 rounded px-2 py-1.5 bg-white text-ink disabled:opacity-60"
            />
          </div>
          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wide text-ink-faint block">Deadline</label>
            <input
              type="date" value={article.deadline}
              onChange={(e) => upd({ deadline: e.target.value })}
              disabled={readOnly}
              className="w-full text-sm border border-surface-3 rounded px-2 py-1.5 bg-white text-ink disabled:opacity-60"
            />
          </div>
        </div>

        {/* Free-text byline (fallback / external) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div className="space-y-1 col-span-2">
            <label className="text-2xs uppercase tracking-wide text-ink-faint block">Byline (free text)</label>
            <input
              type="text" value={article.author}
              onChange={(e) => upd({ author: e.target.value })}
              disabled={readOnly}
              placeholder="Used when no team writer is assigned"
              className="w-full text-sm border border-surface-3 rounded px-2 py-1.5 bg-white text-ink disabled:opacity-60"
            />
          </div>
          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wide text-ink-faint block">Word target</label>
            <input
              type="number" value={article.wordCountTarget || ''}
              onChange={(e) => upd({ wordCountTarget: Number(e.target.value) || 0 })}
              disabled={readOnly}
              min="0" step="100" placeholder="0"
              className="w-full text-sm border border-surface-3 rounded px-2 py-1.5 bg-white text-ink disabled:opacity-60"
            />
          </div>
        </div>

        {/* ── Sign-off bar ──────────────────────────────────────────────────── */}
        <div className="mt-4 pt-3 border-t border-surface-3 flex items-center justify-between gap-3">
          {isFinal ? (
            <p className="text-xs text-green-700 flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              Approved{article.approvedByName ? ` by ${article.approvedByName}` : ''}
              {article.approvedAt ? ` · ${formatDateTime(article.approvedAt)}` : ''}
            </p>
          ) : (
            <div className="text-xs min-w-0">
              <span className="text-ink-faint">
                {article.approverId
                  ? `Approver: ${teamMembers.find((m) => m.id === article.approverId)?.name ?? '—'}`
                  : 'No approver assigned'}
              </span>
              {openItems > 0 ? (
                <span className="text-amber-600"> · {openItemsLabel}</span>
              ) : (
                <span className="text-green-600"> · ready to finalise</span>
              )}
            </div>
          )}
          {!readOnly && (
            isFinal ? (
              <button
                onClick={reopen}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors shrink-0"
              >
                <RotateCcw size={12} /> Reopen
              </button>
            ) : (
              <button
                onClick={requestApprove}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors shrink-0"
              >
                <CheckCircle2 size={12} /> Approve &amp; finalise
              </button>
            )
          )}
        </div>
      </div>

      {/* ── Brief ───────────────────────────────────────────────────────────── */}
      <PageSection label="Brief">
        <textarea
          value={article.brief}
          onChange={(e) => upd({ brief: e.target.value })}
          disabled={readOnly}
          rows={4}
          placeholder="The editorial angle / brief to the writer…"
          className="w-full text-sm border border-surface-3 rounded p-3 bg-white text-ink resize-y leading-relaxed disabled:opacity-70"
        />
      </PageSection>

      {/* ── Draft body ──────────────────────────────────────────────────────── */}
      <PageSection
        label="Draft"
        actions={
          <span className="text-2xs text-ink-faint tabular-nums">
            {liveWords.toLocaleString()} words
            {target > 0 && <span className="text-ink-faint/60"> / {target.toLocaleString()} target</span>}
          </span>
        }
      >
        <textarea
          ref={bodyRef}
          value={article.body}
          onChange={(e) => handleBody(e.target.value)}
          onSelect={captureSelection}
          readOnly={readOnly}
          rows={18}
          placeholder="Write the draft here…"
          className={cn(
            'w-full text-sm border border-surface-3 rounded p-4 bg-white text-ink resize-y leading-7 font-serif',
            readOnly && 'opacity-80'
          )}
        />
        {!readOnly && (
          <p className="text-2xs text-ink-faint mt-1">
            Tip: select text in the draft, then add a comment or suggestion to attach it to that passage.
          </p>
        )}
      </PageSection>

      {/* ── Comments & suggestions ──────────────────────────────────────────── */}
      <CommentThread
        projectId={id}
        articleId={article.id}
        comments={(remoteArticleComments ?? project.articleComments).filter((c) => c.articleId === article.id)}
        readOnly={readOnly}
        userId={user?.id ?? ''}
        userName={user?.name ?? 'Unknown'}
        articleBody={article.body}
        pendingAnchor={pendingAnchor}
        onClearPending={() => setPendingAnchor(null)}
        onLocate={locateAnchor}
      />

      {/* ── Status notes ────────────────────────────────────────────────────── */}
      <PageSection label="Status notes">
        <textarea
          value={article.notes}
          onChange={(e) => upd({ notes: e.target.value })}
          disabled={readOnly}
          rows={3}
          placeholder="Revision notes, status updates…"
          className="w-full text-sm border border-surface-3 rounded p-3 bg-white text-ink resize-y leading-relaxed disabled:opacity-70"
        />
      </PageSection>

      {/* ── Version history ─────────────────────────────────────────────────── */}
      <VersionHistory
        projectId={id}
        article={article}
        versions={(remoteArticleVersions ?? project.articleVersions).filter((v) => v.articleId === article.id)}
        readOnly={readOnly}
        userId={user?.id ?? ''}
        userName={user?.name ?? 'Unknown'}
      />

      {/* ── Writer hours ────────────────────────────────────────────────────── */}
      <HoursLog
        projectId={id}
        articleId={article.id}
        entries={project.writerHours.filter((h) => h.articleId === article.id)}
        teamMembers={project.teamMembers}
        defaultWriterId={article.assignedWriterId}
        readOnly={readOnly}
      />

      {/* ── Danger zone ─────────────────────────────────────────────────────── */}
      {!readOnly && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            <Trash2 size={12} /> Delete article
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete article"
        message={`Delete "${article.title || 'Untitled article'}"? This also removes its comments, versions, and hours.`}
        onConfirm={() => { removeArticle(id, article.id); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={confirmApprove}
        title="Finalise with open items?"
        message={`This article still has ${openItemsLabel}. Approve and finalise anyway?`}
        confirmLabel="Finalise anyway"
        destructive={false}
        onConfirm={() => { approve(); setConfirmApprove(false) }}
        onCancel={() => setConfirmApprove(false)}
      />
    </div>
  )
}
