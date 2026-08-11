import { useState } from 'react'
import { ChevronDown, MessageSquare, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Shot, ShotStatus, ShotPriority, ShotFormat } from '@/types/shoot'
import {
  SHOT_STATUSES, SHOT_STATUS_META, SHOT_PRIORITIES, SHOT_PRIORITY_META,
  SHOT_FORMATS, SHOT_FORMAT_LABELS, shotStatus,
} from '@/lib/shotMeta'
import ImageThumbWithModal from '@/components/ui/ImageThumbWithModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import CommentThread from '@/components/ui/CommentThread'
import { inputCls } from '@/components/ui/FormField'
import { useCommentStore } from '@/store/useCommentStore'
import { MEDIA_ENTITY } from '@/lib/mediaEntityTypes'
import { buildMediaContext } from '@/hooks/useImageStorage'

interface ShotRowProps {
  shot: Shot
  isFirst: boolean
  isLast: boolean
  onUpdate: (patch: Partial<Shot>) => void
  onRemove: () => void
  onMove: (direction: 'up' | 'down') => void
  /** The project UUID — passed to CommentThread for Supabase sync. */
  projectId: string
  /** When true, hides reorder/delete/upload controls and makes fields read-only. */
  readOnly?: boolean
}

export default function ShotRow({ shot, isFirst, isLast, onUpdate, onRemove, onMove, projectId, readOnly }: ShotRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const commentCount = useCommentStore((s) => s.getFor('shot', shot.id).length)

  const shotMediaContext = buildMediaContext(projectId, MEDIA_ENTITY.shotReference, shot.id)

  return (
    <>
      <div className={cn('border border-surface-3 rounded bg-white', expanded && 'shadow-sm')}>
        {/* Compact row */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-1/40 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          {/* Reference thumbnail */}
          <ImageThumbWithModal
            imageId={shot.imageId}
            size="sm"
            onUpload={readOnly ? undefined : (id) => onUpdate({ imageId: id })}
            onRemove={readOnly ? undefined : () => onUpdate({ imageId: '' })}
            className="shrink-0"
            mediaContext={shotMediaContext}
          />

          {/* Shot ID */}
          <span className="text-xs font-bold text-ink-faint w-8 shrink-0">{shot.shotId}</span>

          {/* Name */}
          <span className="flex-1 text-sm text-ink min-w-0 truncate">{shot.name || 'Untitled shot'}</span>

          {/* Format · priority · status — visible at a glance on the day */}
          {shot.format && (
            <span className="text-2xs text-ink-faint shrink-0">{SHOT_FORMAT_LABELS[shot.format]}</span>
          )}
          {shot.priority && (
            <span className={cn('text-2xs px-1.5 py-0.5 rounded border shrink-0', SHOT_PRIORITY_META[shot.priority].chip)}>
              {SHOT_PRIORITY_META[shot.priority].label}
            </span>
          )}
          <span className={cn('text-2xs px-1.5 py-0.5 rounded border shrink-0', SHOT_STATUS_META[shotStatus(shot)].chip)}>
            {SHOT_STATUS_META[shotStatus(shot)].label}
          </span>

          {/* Reorder */}
          {!readOnly && (
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => onMove('up')} disabled={isFirst}
                className="p-0.5 rounded text-ink-faint hover:text-ink disabled:opacity-30 transition-colors">
                <ArrowUp size={11} />
              </button>
              <button onClick={() => onMove('down')} disabled={isLast}
                className="p-0.5 rounded text-ink-faint hover:text-ink disabled:opacity-30 transition-colors">
                <ArrowDown size={11} />
              </button>
            </div>
          )}

          {/* Comment trigger */}
          <button
            onClick={(e) => { e.stopPropagation(); setCommentsOpen((o) => !o) }}
            title="Comments"
            className={cn(
              'flex items-center gap-0.5 shrink-0 rounded px-1 py-0.5 transition-colors',
              commentsOpen
                ? 'text-accent bg-accent/10'
                : 'text-ink-faint hover:text-ink-muted'
            )}
          >
            <MessageSquare size={11} />
            {commentCount > 0 && (
              <span className="text-2xs tabular-nums">{commentCount}</span>
            )}
          </button>

          <ChevronDown size={12} className={cn('text-ink-faint shrink-0 transition-transform', expanded && 'rotate-180')} />
        </div>

        {/* Expanded panel */}
        {expanded && (
          <div className="border-t border-surface-3 px-3 pb-3 pt-2.5 space-y-2.5">
            <div className="flex gap-4">
              {/* Larger reference image */}
              <ImageThumbWithModal
                imageId={shot.imageId}
                size="lg"
                onUpload={readOnly ? undefined : (id) => onUpdate({ imageId: id })}
                onRemove={readOnly ? undefined : () => onUpdate({ imageId: '' })}
                className="w-40 shrink-0"
                mediaContext={shotMediaContext}
              />

              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <label className="text-2xs uppercase tracking-wide text-ink-faint block">Shot ID</label>
                    <input type="text" value={shot.shotId} readOnly={readOnly}
                      onChange={(e) => onUpdate({ shotId: e.target.value })} className={inputCls} />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-2xs uppercase tracking-wide text-ink-faint block">Name</label>
                    <input type="text" value={shot.name} readOnly={readOnly}
                      onChange={(e) => onUpdate({ name: e.target.value })} className={inputCls} />
                  </div>
                </div>

                {/* On-day tracking */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-2xs uppercase tracking-wide text-ink-faint block">Status</label>
                    <select value={shotStatus(shot)} disabled={readOnly}
                      onChange={(e) => onUpdate({ status: e.target.value as ShotStatus })}
                      className={inputCls}>
                      {SHOT_STATUSES.map((s) => <option key={s} value={s}>{SHOT_STATUS_META[s].label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-2xs uppercase tracking-wide text-ink-faint block">Priority</label>
                    <select value={shot.priority ?? ''} disabled={readOnly}
                      onChange={(e) => onUpdate({ priority: (e.target.value || undefined) as ShotPriority | undefined })}
                      className={inputCls}>
                      <option value="">—</option>
                      {SHOT_PRIORITIES.map((p) => <option key={p} value={p}>{SHOT_PRIORITY_META[p].label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-2xs uppercase tracking-wide text-ink-faint block">Format</label>
                    <select value={shot.format ?? ''} disabled={readOnly}
                      onChange={(e) => onUpdate({ format: (e.target.value || undefined) as ShotFormat | undefined })}
                      className={inputCls}>
                      <option value="">—</option>
                      {SHOT_FORMATS.map((f) => <option key={f} value={f}>{SHOT_FORMAT_LABELS[f]}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-2xs uppercase tracking-wide text-ink-faint block">Location / Set</label>
                  <input type="text" value={shot.location ?? ''} readOnly={readOnly}
                    onChange={(e) => onUpdate({ location: e.target.value })}
                    placeholder="e.g. Outdoors / Plains" className={inputCls} />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs uppercase tracking-wide text-ink-faint block">Description</label>
                  <textarea value={shot.description} readOnly={readOnly}
                    onChange={(e) => onUpdate({ description: e.target.value })}
                    rows={2} placeholder="Describe the shot…"
                    className={cn(inputCls, 'resize-none')} />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs uppercase tracking-wide text-ink-faint block">Notes</label>
                  <input type="text" value={shot.notes} readOnly={readOnly}
                    onChange={(e) => onUpdate({ notes: e.target.value })}
                    placeholder="Director's notes" className={inputCls} />
                </div>
              </div>
            </div>

            {!readOnly && (
              <div className="flex justify-end pt-1 border-t border-surface-3">
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={11} /> Delete shot
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Comment thread ──────────────────────────────────── */}
        {commentsOpen && (
          <div className="border-t border-surface-2 px-3 py-3">
            <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-2.5">
              Comments{commentCount > 0 ? ` (${commentCount})` : ''}
            </p>
            <CommentThread entityType="shot" entityId={shot.id} projectId={projectId} />
          </div>
        )}
      </div>

      <ConfirmDialog open={confirmDelete} title="Delete shot"
        message={`Delete "${shot.name || shot.shotId}"?`}
        onConfirm={() => { onRemove(); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)} />
    </>
  )
}
