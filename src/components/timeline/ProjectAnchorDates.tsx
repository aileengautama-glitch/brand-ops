/**
 * ProjectAnchorDates — the dates every gate counts back from.
 *
 * Set the shoot/event date and the launch date here; every milestone with an
 * anchor recomputes its deadline from them (see lib/scheduleEngine.ts). Changing
 * one date moves the whole chain — no deadline is typed twice.
 */
import { CalendarClock } from 'lucide-react'
import { inputCls } from '@/components/ui/FormField'

export default function ProjectAnchorDates({
  module, primaryDate, launchDate, onChangePrimary, onChangeLaunch, readOnly, gateCount,
}: {
  module: 'shoot' | 'event'
  /** Shoot date (shoots) or event/install date (events), ISO. */
  primaryDate: string
  launchDate: string
  onChangePrimary: (v: string) => void
  onChangeLaunch: (v: string) => void
  readOnly?: boolean
  /** How many milestones currently follow these anchors. */
  gateCount: number
}) {
  const primaryLabel = module === 'shoot' ? 'Shoot date' : 'Event date'

  return (
    <div className="bg-surface-1 border border-surface-3 rounded p-3">
      <div className="flex items-start gap-2 mb-2.5">
        <CalendarClock size={14} className="text-accent shrink-0 mt-0.5" />
        <div>
          <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">Anchor Dates</p>
          <p className="text-xs text-ink-muted mt-0.5">
            Gate deadlines are counted back from these.{' '}
            {gateCount > 0
              ? `Changing a date moves ${gateCount} gate${gateCount === 1 ? '' : 's'}.`
              : 'Give a milestone an anchor to schedule it automatically.'}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className="space-y-1">
          <label className="text-2xs uppercase tracking-wide text-ink-faint block">{primaryLabel}</label>
          <input
            type="date"
            value={primaryDate}
            onChange={(e) => onChangePrimary(e.target.value)}
            readOnly={readOnly}
            disabled={readOnly}
            className={inputCls}
          />
          <p className="text-2xs text-ink-faint">Pre-production counts back from this.</p>
        </div>
        <div className="space-y-1">
          <label className="text-2xs uppercase tracking-wide text-ink-faint block">Launch date</label>
          <input
            type="date"
            value={launchDate}
            onChange={(e) => onChangeLaunch(e.target.value)}
            readOnly={readOnly}
            disabled={readOnly}
            className={inputCls}
          />
          <p className="text-2xs text-ink-faint">Post-production &amp; offline work count back from this.</p>
        </div>
      </div>
    </div>
  )
}
