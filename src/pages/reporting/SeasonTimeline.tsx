/**
 * SeasonTimeline — one season, every project as a bar, gates plotted along it.
 *
 * The season-planning view: where the shoots, events and their launches sit
 * relative to each other, so overlaps and clashes are visible before they bite.
 * Bars run from the project's own start anchor (shoot/event date) to its launch.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import type { ShootProject } from '@/types/shoot'
import type { EventProject } from '@/types/event'
import { cn, formatDate } from '@/lib/utils'
import { seasonsPresent } from '@/lib/seasons'
import { defaultSeason } from '@/lib/seasons'
import type { GateRow } from '@/lib/reportingIndex'

interface Bar {
  projectId: string
  projectName: string
  module: 'shoot' | 'event'
  season: string
  start: string
  end: string
  gates: GateRow[]
}

const DAY = 86_400_000
const iso = (d: Date) => d.toISOString().slice(0, 10)
const parse = (s: string) => (s ? new Date(`${s.slice(0, 10)}T00:00:00Z`) : null)

export default function SeasonTimeline({
  gates, shoots, events,
}: {
  gates: GateRow[]
  shoots: ShootProject[]
  events: EventProject[]
}) {
  const allSeasons = useMemo(
    () => seasonsPresent([...shoots, ...events]),
    [shoots, events],
  )
  const [season, setSeason] = useState<string>(
    () => (allSeasons.includes(defaultSeason()) ? defaultSeason() : allSeasons[0] ?? ''),
  )

  const bars = useMemo<Bar[]>(() => {
    const out: Bar[] = []
    const add = (
      p: ShootProject | EventProject, module: 'shoot' | 'event', start?: string, end?: string,
    ) => {
      if ((p.season?.trim() ?? '') !== season) return
      const s = start || end || ''
      const e = end || start || ''
      if (!s && !e) return
      out.push({
        projectId: p.id,
        projectName: p.name,
        module,
        season: p.season?.trim() ?? '',
        start: s < e ? s : e,
        end: s < e ? e : s,
        gates: gates.filter((g) => g.projectId === p.id && g.type === 'gate' && g.computedDueDate),
      })
    }
    for (const p of shoots) add(p, 'shoot', p.shootDateISO, p.launchDate)
    for (const p of events) add(p, 'event', p.eventDate, p.launchDate)
    return out.sort((a, b) => a.start.localeCompare(b.start))
  }, [shoots, events, gates, season])

  // Window: earliest bar/gate to latest, padded a little so ends aren't flush.
  const { min, max, span } = useMemo(() => {
    const dates: number[] = []
    for (const b of bars) {
      const s = parse(b.start), e = parse(b.end)
      if (s) dates.push(s.getTime())
      if (e) dates.push(e.getTime())
      for (const g of b.gates) {
        const d = parse(g.computedDueDate)
        if (d) dates.push(d.getTime())
      }
    }
    if (dates.length === 0) return { min: 0, max: 0, span: 1 }
    const lo = Math.min(...dates) - 5 * DAY
    const hi = Math.max(...dates) + 5 * DAY
    return { min: lo, max: hi, span: Math.max(hi - lo, DAY) }
  }, [bars])

  const pct = (d: string) => {
    const t = parse(d)?.getTime()
    if (!t) return 0
    return Math.max(0, Math.min(100, ((t - min) / span) * 100))
  }

  const todayPct = (() => {
    const t = new Date(`${iso(new Date())}T00:00:00Z`).getTime()
    return t >= min && t <= max ? ((t - min) / span) * 100 : null
  })()

  if (allSeasons.length === 0) {
    return (
      <div className="bg-surface-1 border border-dashed border-surface-3 rounded-lg p-10 text-center">
        <p className="text-sm text-ink-muted">No seasons set yet</p>
        <p className="text-xs text-ink-faint mt-1">Give a project a season and it appears here.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <span className="text-2xs font-bold uppercase tracking-widest text-ink-faint mr-1">Season</span>
        {allSeasons.map((s) => (
          <button key={s} onClick={() => setSeason(s)}
            className={cn('text-xs px-2.5 py-1 rounded border transition-colors',
              season === s ? 'bg-accent text-white border-accent'
                           : 'bg-white text-ink-muted border-surface-3 hover:border-accent/40')}>
            {s}
          </button>
        ))}
      </div>

      {bars.length === 0 ? (
        <div className="bg-surface-1 border border-dashed border-surface-3 rounded-lg p-10 text-center">
          <p className="text-sm text-ink-muted">No dated projects in {season}</p>
          <p className="text-xs text-ink-faint mt-1">Projects appear once they have a shoot/event or launch date.</p>
        </div>
      ) : (
        <div className="bg-white border border-surface-3 rounded p-4 space-y-3">
          {/* Scale */}
          <div className="relative h-4 text-2xs text-ink-faint">
            <span className="absolute left-0">{formatDate(iso(new Date(min)))}</span>
            <span className="absolute right-0">{formatDate(iso(new Date(max)))}</span>
          </div>

          {bars.map((b) => (
            <div key={b.projectId} className="group">
              <div className="flex items-baseline gap-2 mb-1">
                <Link to={`/${b.module}s/${b.projectId}/timeline`}
                  className="inline-flex items-center gap-1 text-sm text-ink hover:text-accent transition-colors">
                  {b.projectName} <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                <span className="text-2xs text-ink-faint uppercase tracking-wide">{b.module}</span>
                <span className="text-2xs text-ink-faint ml-auto">
                  {formatDate(b.start)} → {formatDate(b.end)} · {b.gates.length} gates
                </span>
              </div>

              <div className="relative h-7 bg-surface-1 rounded">
                {todayPct !== null && (
                  <div className="absolute top-0 bottom-0 w-px bg-red-400/70 z-10" style={{ left: `${todayPct}%` }} />
                )}
                {/* The project bar */}
                <div
                  className="absolute top-1.5 h-4 rounded bg-accent/25 border border-accent/40"
                  style={{ left: `${pct(b.start)}%`, width: `${Math.max(1.5, pct(b.end) - pct(b.start))}%` }}
                />
                {/* Gates along it */}
                {b.gates.map((g) => (
                  <div
                    key={`${g.source}-${g.id}`}
                    title={`${g.title} — ${formatDate(g.computedDueDate)}${g.owner ? ` · ${g.owner}` : ''}`}
                    className={cn('absolute top-1 w-1.5 h-5 rounded-sm z-20',
                      g.status === 'complete' ? 'bg-accent'
                        : (g.daysRemaining ?? 0) < 0 ? 'bg-red-500' : 'bg-ink/40')}
                    style={{ left: `${pct(g.computedDueDate)}%` }}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-surface-3 text-2xs text-ink-faint">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-accent/25 border border-accent/40" /> project span</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-3 rounded-sm bg-ink/40" /> gate</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-3 rounded-sm bg-accent" /> cleared</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-3 rounded-sm bg-red-500" /> overdue</span>
            <span className="flex items-center gap-1"><span className="w-px h-3 bg-red-400" /> today</span>
          </div>
        </div>
      )}
    </div>
  )
}
