/**
 * SeasonFilterBar — "All seasons" plus a chip per season actually in use.
 *
 * Only renders when there is more than one season to choose between, so a
 * workspace with a single season in flight doesn't grow a pointless control.
 */
import { cn } from '@/lib/utils'
import { UNASSIGNED_SEASON_LABEL } from '@/lib/seasons'

export const ALL_SEASONS = '__all__'

export default function SeasonFilterBar({
  seasons, value, onChange, counts, hasUnassigned,
}: {
  /** Seasons present, already ordered. */
  seasons: string[]
  value: string
  onChange: (v: string) => void
  /** season → project count. */
  counts: Record<string, number>
  hasUnassigned?: boolean
}) {
  const options = [...seasons, ...(hasUnassigned ? [''] : [])]
  if (options.length < 2) return null

  const chip = (key: string, label: string, count: number) => (
    <button
      key={key || 'none'}
      onClick={() => onChange(key)}
      className={cn(
        'text-xs px-2.5 py-1 rounded border transition-colors',
        value === key
          ? 'bg-accent text-white border-accent'
          : 'bg-white text-ink-muted border-surface-3 hover:border-accent/40',
      )}
    >
      {label}
      <span className="ml-1 opacity-70 tabular-nums">{count}</span>
    </button>
  )

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-4">
      <span className="text-2xs font-bold uppercase tracking-widest text-ink-faint mr-1">Season</span>
      {chip(ALL_SEASONS, 'All', total)}
      {options.map((s) => chip(s, s || UNASSIGNED_SEASON_LABEL, counts[s] ?? 0))}
    </div>
  )
}
