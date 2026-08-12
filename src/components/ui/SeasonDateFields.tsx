/**
 * SeasonDateFields — season + anchor dates on the creation form.
 *
 * These are required at creation rather than "fill it in later" on purpose: the
 * whole scheduling engine counts back from these dates, so a project created
 * without them starts with every gate undated, which is the state this app exists
 * to prevent.
 *
 * Season is a datalist, not a select — the suggestions cover the seasons in play
 * but "Resort 27" or "Always-on" still work without a code change.
 */
import { suggestedSeasons } from '@/lib/seasons'

export default function SeasonDateFields({
  season, onSeason,
  primaryDate, onPrimaryDate, primaryLabel, primaryHint,
  launchDate, onLaunchDate, launchLabel, launchHint,
  showLaunch = true,
}: {
  season: string
  onSeason: (v: string) => void
  primaryDate: string
  onPrimaryDate: (v: string) => void
  primaryLabel: string
  primaryHint?: string
  launchDate?: string
  onLaunchDate?: (v: string) => void
  launchLabel?: string
  launchHint?: string
  /** Events/magazine use a single date — hide the second field. */
  showLaunch?: boolean
}) {
  const inputCls =
    'w-full px-3 py-1.5 text-sm border border-surface-3 rounded bg-white focus:outline-none focus:border-accent placeholder:text-ink-faint'

  return (
    <div className={`grid gap-2 ${showLaunch ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
      <div className="space-y-0.5">
        <label className="text-2xs font-bold uppercase tracking-widest text-ink-faint block">
          Season <span className="text-accent">*</span>
        </label>
        <input
          type="text" list="season-suggestions" value={season} placeholder="e.g. S/S27"
          onChange={(e) => onSeason(e.target.value)} className={inputCls}
        />
        <datalist id="season-suggestions">
          {suggestedSeasons().map((s) => <option key={s} value={s} />)}
        </datalist>
      </div>

      <div className="space-y-0.5">
        <label className="text-2xs font-bold uppercase tracking-widest text-ink-faint block">
          {primaryLabel} <span className="text-accent">*</span>
        </label>
        <input type="date" value={primaryDate} onChange={(e) => onPrimaryDate(e.target.value)} className={inputCls} />
        {primaryHint && <p className="text-2xs text-ink-faint">{primaryHint}</p>}
      </div>

      {showLaunch && (
        <div className="space-y-0.5">
          <label className="text-2xs font-bold uppercase tracking-widest text-ink-faint block">
            {launchLabel ?? 'Launch date'} <span className="text-accent">*</span>
          </label>
          <input
            type="date" value={launchDate ?? ''}
            onChange={(e) => onLaunchDate?.(e.target.value)} className={inputCls}
          />
          {launchHint && <p className="text-2xs text-ink-faint">{launchHint}</p>}
        </div>
      )}
    </div>
  )
}
