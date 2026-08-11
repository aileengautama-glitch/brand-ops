/**
 * ShotBoard — on-the-day tick-off view of the shot list.
 *
 * Shots grouped by status so progress, cuts and re-shoots are visible at a glance
 * while the day is running (the thing that previously wasn't tracked at all). One
 * tap moves a shot between columns; hero/high priority is shown so what must not be
 * cut stays obvious when running behind.
 */
import { useStoredImage } from '@/hooks/useImageStorage'
import type { Shot, ShotStatus } from '@/types/shoot'
import { cn } from '@/lib/utils'
import {
  SHOT_STATUSES, SHOT_STATUS_META, SHOT_PRIORITY_META, SHOT_FORMAT_LABELS, shotStatus,
} from '@/lib/shotMeta'

export default function ShotBoard({
  shots, onUpdate, readOnly,
}: {
  shots: Shot[]
  onUpdate: (shotId: string, patch: Partial<Shot>) => void
  readOnly?: boolean
}) {
  const done = shots.filter((s) => shotStatus(s) === 'shot').length

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xs font-bold uppercase tracking-widest text-ink-faint">
          {done} / {shots.length} shot
        </span>
        {!readOnly && <span className="text-2xs text-ink-faint">Tap a shot to advance it.</span>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SHOT_STATUSES.map((status) => {
          const column = shots.filter((s) => shotStatus(s) === status)
          return (
            <div key={status} className="bg-surface-1/60 border border-surface-3 rounded p-2">
              <div className="flex items-center gap-1.5 mb-2 px-0.5">
                <span className={cn('w-2 h-2 rounded-full shrink-0', SHOT_STATUS_META[status].dot)} />
                <span className="text-2xs font-bold uppercase tracking-widest text-ink-faint">
                  {SHOT_STATUS_META[status].label}
                </span>
                <span className="text-2xs text-ink-faint ml-auto tabular-nums">{column.length}</span>
              </div>
              <div className="space-y-1.5">
                {column.length === 0 && <p className="text-2xs text-ink-faint italic px-0.5 py-1">—</p>}
                {column.map((shot) => (
                  <ShotCard
                    key={shot.id}
                    shot={shot}
                    onSetStatus={(s) => onUpdate(shot.id, { status: s })}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ShotCard({
  shot, onSetStatus, readOnly,
}: {
  shot: Shot
  onSetStatus: (s: ShotStatus) => void
  readOnly?: boolean
}) {
  const url = useStoredImage(shot.imageId || undefined)
  const current = shotStatus(shot)
  // Tap cycles to the next sensible state: to shoot → shot → re-shoot → to shoot.
  const next: ShotStatus = current === 'to_shoot' ? 'shot' : current === 'shot' ? 'reshoot' : 'to_shoot'

  return (
    <div className="bg-white border border-surface-3 rounded overflow-hidden">
      <div className="flex gap-2 p-1.5">
        <div className="w-10 h-12 shrink-0 rounded overflow-hidden bg-surface-1 border border-surface-3">
          {url
            ? <img src={url} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="font-mono text-2xs text-ink-secondary shrink-0">{shot.shotId || '—'}</span>
            {shot.priority && (
              <span className={cn('text-[9px] px-1 rounded border shrink-0', SHOT_PRIORITY_META[shot.priority].chip)}>
                {SHOT_PRIORITY_META[shot.priority].label}
              </span>
            )}
          </div>
          <p className="text-xs text-ink leading-snug line-clamp-2">{shot.name || 'Untitled shot'}</p>
          {shot.format && <span className="text-[9px] text-ink-faint">{SHOT_FORMAT_LABELS[shot.format]}</span>}
        </div>
      </div>
      {!readOnly && (
        <div className="flex border-t border-surface-3">
          <button
            onClick={() => onSetStatus(next)}
            className="flex-1 text-[10px] py-1 text-ink-muted hover:bg-surface-1 hover:text-ink transition-colors"
          >
            → {SHOT_STATUS_META[next].label}
          </button>
          {current !== 'skipped' && (
            <button
              onClick={() => onSetStatus('skipped')}
              className="px-2 text-[10px] py-1 text-ink-faint hover:bg-surface-1 hover:text-ink transition-colors border-l border-surface-3"
              title="Skip this shot"
            >
              Skip
            </button>
          )}
        </div>
      )}
    </div>
  )
}
