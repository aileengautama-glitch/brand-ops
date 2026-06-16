import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Trash2, Plus, ChevronUp, ChevronDown, Check, ExternalLink, Link2 } from 'lucide-react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { useCurrentMagazineProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import PageSection from '@/components/layout/PageSection'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { cn, generateId, now } from '@/lib/utils'
import type { VisualProjectStatus, VisualShot, VisualResultLink } from '@/types/magazine'
import { VISUAL_STATUS_CONFIG } from './MagazineVisual'

const STATUS_FLOW: VisualProjectStatus[] = ['planning', 'scheduled', 'shot', 'delivered']

export default function MagazineVisualProject() {
  const { id, visualId } = useParams<{ id: string; visualId: string }>()
  const project        = useCurrentMagazineProject()
  const updateVisual   = useMagazineStore((s) => s.updateVisualProject)
  const removeVisual   = useMagazineStore((s) => s.removeVisualProject)
  const { canEdit }    = useCurrentUser()
  const readOnly       = !canEdit('magazine.visual', id)

  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>
  const vp = (project.visualProjects ?? []).find((v) => v.id === visualId)
  if (!vp) {
    return (
      <div className="p-6 max-w-4xl">
        <Link to={`/magazine/${id}/board`} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors mb-4">
          <ArrowLeft size={14} /> Board
        </Link>
        <p className="text-sm text-ink-muted">Visual project not found.</p>
      </div>
    )
  }

  const upd = (patch: Parameters<typeof updateVisual>[2]) => updateVisual(id, vp.id, patch)
  const statusCfg   = VISUAL_STATUS_CONFIG[vp.status] ?? VISUAL_STATUS_CONFIG.planning
  const teamMembers = project.teamMembers ?? []
  const articles    = project.articles ?? []

  // ── Shot list (nested array, persisted via updateVisualProject) ────────────
  const sortedShots = [...vp.shots].sort((a, b) => a.order - b.order)
  const shotsDone   = vp.shots.filter((s) => s.status === 'shot').length
  const setShots    = (next: VisualShot[]) => upd({ shots: next })

  const addShot = () => {
    const shot: VisualShot = {
      id: generateId(), title: '', description: '', status: 'planned',
      order: Date.now(), createdAt: now(),
    }
    setShots([...vp.shots, shot])
  }
  const updateShot = (shotId: string, patch: Partial<VisualShot>) =>
    setShots(vp.shots.map((s) => (s.id === shotId ? { ...s, ...patch } : s)))
  const removeShot = (shotId: string) => setShots(vp.shots.filter((s) => s.id !== shotId))
  const moveShot = (shotId: string, dir: 'up' | 'down') => {
    const idx = sortedShots.findIndex((s) => s.id === shotId)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sortedShots.length) return
    const a = sortedShots[idx], b = sortedShots[swapIdx]
    setShots(vp.shots.map((s) =>
      s.id === a.id ? { ...s, order: b.order } : s.id === b.id ? { ...s, order: a.order } : s
    ))
  }

  // ── Result / delivery links ────────────────────────────────────────────────
  const setLinks = (next: VisualResultLink[]) => upd({ resultLinks: next })
  const addLink = () => setLinks([...vp.resultLinks, { id: generateId(), label: '', url: '' }])
  const updateLink = (linkId: string, patch: Partial<VisualResultLink>) =>
    setLinks(vp.resultLinks.map((l) => (l.id === linkId ? { ...l, ...patch } : l)))
  const removeLink = (linkId: string) => setLinks(vp.resultLinks.filter((l) => l.id !== linkId))

  return (
    <div className="p-6 max-w-4xl">
      <Link to={`/magazine/${id}/board`} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors mb-4">
        <ArrowLeft size={14} /> Board
      </Link>

      {/* ── Header card ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-surface-3 rounded-lg p-4 mb-5">
        <div className="flex items-start gap-3">
          <input
            type="text"
            value={vp.name}
            onChange={(e) => upd({ name: e.target.value })}
            disabled={readOnly}
            placeholder="Untitled visual project"
            className="flex-1 text-xl font-semibold text-ink bg-transparent outline-none placeholder:text-ink-faint disabled:opacity-70"
          />
          {readOnly ? (
            <span className={cn('text-2xs font-medium px-2 py-1 rounded shrink-0', statusCfg.className)}>
              {statusCfg.label}
            </span>
          ) : (
            <select
              value={vp.status}
              onChange={(e) => upd({ status: e.target.value as VisualProjectStatus })}
              className="text-xs border border-surface-3 rounded px-2 py-1 bg-white text-ink-secondary shrink-0"
            >
              {STATUS_FLOW.map((s) => (
                <option key={s} value={s}>{VISUAL_STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wide text-ink-faint block">Shoot date</label>
            <input
              type="date" value={vp.shootDate}
              onChange={(e) => upd({ shootDate: e.target.value })}
              disabled={readOnly}
              className="w-full text-sm border border-surface-3 rounded px-2 py-1.5 bg-white text-ink disabled:opacity-60"
            />
          </div>
          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wide text-ink-faint block">Location</label>
            <input
              type="text" value={vp.location}
              onChange={(e) => upd({ location: e.target.value })}
              disabled={readOnly}
              placeholder="—"
              className="w-full text-sm border border-surface-3 rounded px-2 py-1.5 bg-white text-ink disabled:opacity-60"
            />
          </div>
          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wide text-ink-faint block">Lead / photographer</label>
            <select
              value={vp.assignedTo}
              onChange={(e) => upd({ assignedTo: e.target.value })}
              disabled={readOnly}
              className="w-full text-sm border border-surface-3 rounded px-2 py-1.5 bg-white text-ink disabled:opacity-60"
            >
              <option value="">— Unassigned —</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{m.role ? ` · ${m.role}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-2xs uppercase tracking-wide text-ink-faint block">For article</label>
            <select
              value={vp.articleId}
              onChange={(e) => upd({ articleId: e.target.value })}
              disabled={readOnly}
              className="w-full text-sm border border-surface-3 rounded px-2 py-1.5 bg-white text-ink disabled:opacity-60"
            >
              <option value="">— None —</option>
              {articles.map((a) => (
                <option key={a.id} value={a.id}>{a.title || 'Untitled article'}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Concept ─────────────────────────────────────────────────────────── */}
      <PageSection label="Concept">
        <textarea
          value={vp.concept}
          onChange={(e) => upd({ concept: e.target.value })}
          disabled={readOnly}
          rows={3}
          placeholder="Short brief / concept line for this shoot…"
          className="w-full text-sm border border-surface-3 rounded p-3 bg-white text-ink resize-y leading-relaxed disabled:opacity-70"
        />
      </PageSection>

      {/* ── Shot list ───────────────────────────────────────────────────────── */}
      <PageSection
        label="Shot list"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-2xs text-ink-faint tabular-nums">{shotsDone}/{vp.shots.length} shot</span>
            {!readOnly && (
              <button onClick={addShot} className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-surface-2 text-ink-secondary rounded hover:bg-surface-3 transition-colors">
                <Plus size={12} /> Add shot
              </button>
            )}
          </div>
        }
      >
        {sortedShots.length === 0 ? (
          <p className="text-xs text-ink-faint italic px-1 py-2">No shots planned yet.</p>
        ) : (
          <div className="space-y-1">
            {sortedShots.map((shot, idx) => {
              const done = shot.status === 'shot'
              return (
                <div key={shot.id} className="border border-surface-3 rounded bg-white p-2.5">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => !readOnly && updateShot(shot.id, { status: done ? 'planned' : 'shot' })}
                      disabled={readOnly}
                      title={done ? 'Shot — click to mark planned' : 'Planned — click to mark shot'}
                      className={cn(
                        'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
                        done ? 'border-green-500 bg-green-500 text-white' : 'border-surface-3 bg-white',
                        !readOnly && 'hover:scale-110'
                      )}
                    >
                      {done && <Check size={9} />}
                    </button>
                    <input
                      type="text" value={shot.title}
                      onChange={(e) => updateShot(shot.id, { title: e.target.value })}
                      disabled={readOnly}
                      placeholder="Shot title…"
                      className={cn('flex-1 text-sm bg-transparent outline-none text-ink placeholder:text-ink-faint', done && 'line-through text-ink-muted')}
                    />
                    {!readOnly && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => moveShot(shot.id, 'up')} disabled={idx === 0} className="p-0.5 rounded text-ink-faint hover:text-ink hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-default" title="Move up">
                          <ChevronUp size={11} />
                        </button>
                        <button onClick={() => moveShot(shot.id, 'down')} disabled={idx === sortedShots.length - 1} className="p-0.5 rounded text-ink-faint hover:text-ink hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-default" title="Move down">
                          <ChevronDown size={11} />
                        </button>
                        <button onClick={() => removeShot(shot.id)} className="p-0.5 rounded text-ink-faint hover:text-red-500 transition-colors" title="Delete shot">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="text" value={shot.description}
                    onChange={(e) => updateShot(shot.id, { description: e.target.value })}
                    disabled={readOnly}
                    placeholder="Notes / direction (optional)…"
                    className="w-full mt-1 ml-6 pl-0.5 text-xs bg-transparent outline-none text-ink-muted placeholder:text-ink-faint"
                  />
                </div>
              )
            })}
          </div>
        )}
      </PageSection>

      {/* ── Results / delivery links ────────────────────────────────────────── */}
      <PageSection
        label="Results &amp; delivery"
        actions={!readOnly ? (
          <button onClick={addLink} className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-surface-2 text-ink-secondary rounded hover:bg-surface-3 transition-colors">
            <Plus size={12} /> Add link
          </button>
        ) : undefined}
      >
        <p className="text-xs text-ink-faint mb-2">
          Dropbox folders, selects galleries, and final retouched sets for this shoot.
        </p>
        {vp.resultLinks.length === 0 ? (
          <p className="text-xs text-ink-faint italic px-1 py-2">No delivery links yet.</p>
        ) : (
          <div className="space-y-1.5">
            {vp.resultLinks.map((link) => (
              <div key={link.id} className="flex items-center gap-2 border border-surface-3 rounded bg-white px-2.5 py-2">
                <Link2 size={13} className="text-ink-faint shrink-0" />
                {readOnly ? (
                  <>
                    <span className="text-sm text-ink shrink-0 max-w-[40%] truncate">{link.label || 'Link'}</span>
                    <span className="flex-1 text-xs text-ink-faint truncate">{link.url}</span>
                  </>
                ) : (
                  <>
                    <input
                      type="text" value={link.label}
                      onChange={(e) => updateLink(link.id, { label: e.target.value })}
                      placeholder="Label"
                      className="w-1/3 text-sm bg-transparent outline-none text-ink placeholder:text-ink-faint border-r border-surface-2 pr-2"
                    />
                    <input
                      type="url" value={link.url}
                      onChange={(e) => updateLink(link.id, { url: e.target.value })}
                      placeholder="https://www.dropbox.com/…"
                      className="flex-1 text-xs bg-transparent outline-none text-ink-secondary placeholder:text-ink-faint"
                    />
                  </>
                )}
                {link.url && (
                  <a
                    href={link.url} target="_blank" rel="noopener noreferrer"
                    className="p-1 rounded text-ink-faint hover:text-accent hover:bg-surface-1 transition-colors shrink-0"
                    title="Open link"
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
                {!readOnly && (
                  <button onClick={() => removeLink(link.id)} className="p-1 rounded text-ink-faint hover:text-red-500 transition-colors shrink-0" title="Remove link">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </PageSection>

      {/* ── Notes ───────────────────────────────────────────────────────────── */}
      <PageSection label="Notes">
        <textarea
          value={vp.notes}
          onChange={(e) => upd({ notes: e.target.value })}
          disabled={readOnly}
          rows={3}
          placeholder="Logistics, access, coordination notes…"
          className="w-full text-sm border border-surface-3 rounded p-3 bg-white text-ink resize-y leading-relaxed disabled:opacity-70"
        />
      </PageSection>

      {/* ── Danger zone ─────────────────────────────────────────────────────── */}
      {!readOnly && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            <Trash2 size={12} /> Delete visual project
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete visual project"
        message={`Delete "${vp.name || 'Untitled visual project'}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => { removeVisual(id, vp.id); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
