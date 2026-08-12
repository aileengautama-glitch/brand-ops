/**
 * SeasonBudget — envelope vs committed vs actual, per season, with drill-down.
 *
 * The number that was previously impossible to get: budgets were per project with
 * no season key and no actuals rollup, so nothing aggregated. This reads the same
 * budget lines the projects already keep and rolls them up.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ExternalLink, Wallet, AlertTriangle } from 'lucide-react'
import { useShootStore } from '@/store/useShootStore'
import { useEventStore } from '@/store/useEventStore'
import { useSeasonBudgetStore } from '@/store/useSeasonBudgetStore'
import { buildSeasonBudgets, money, committedPct, type SeasonBudgetRoll } from '@/lib/seasonBudget'
import { seasonSortKey, UNASSIGNED_SEASON_LABEL } from '@/lib/seasons'
import { cn } from '@/lib/utils'

export default function SeasonBudget() {
  const shoots = useShootStore((s) => s.projects)
  const events = useEventStore((s) => s.projects)
  const envelopes = useSeasonBudgetStore((s) => s.envelopes)
  const setEnvelope = useSeasonBudgetStore((s) => s.setEnvelope)

  const rolls = useMemo(
    () => buildSeasonBudgets(shoots, events, envelopes)
      .sort((a, b) => {
        if (a.season === '') return 1
        if (b.season === '') return -1
        return seasonSortKey(a.season) - seasonSortKey(b.season)
      }),
    [shoots, events, envelopes],
  )

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-ink">Season Budgets</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Envelope, committed and actual rolled up per season. Set an envelope to track against it.
          </p>
        </div>
        <Link to="/reporting"
          className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors shrink-0">
          Back to reporting
        </Link>
      </div>

      {rolls.length === 0 ? (
        <div className="bg-surface-1 border border-dashed border-surface-3 rounded-lg p-10 text-center">
          <Wallet size={22} className="text-ink-faint mx-auto mb-2" />
          <p className="text-sm text-ink-muted">No budget data yet</p>
          <p className="text-xs text-ink-faint mt-1">Add budget lines to a project and they roll up here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rolls.map((roll) => (
            <SeasonCard key={roll.season || 'none'} roll={roll} onSetEnvelope={setEnvelope} />
          ))}
        </div>
      )}
    </div>
  )
}

function SeasonCard({
  roll, onSetEnvelope,
}: {
  roll: SeasonBudgetRoll
  onSetEnvelope: (season: string, amount: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(roll.envelope || ''))

  const over = roll.envelope > 0 && roll.committed > roll.envelope
  const pct = committedPct(roll)

  const save = () => {
    const n = Number(draft.replace(/[^0-9.]/g, '')) || 0
    onSetEnvelope(roll.season, n)
    setEditing(false)
  }

  return (
    <div className="bg-white border border-surface-3 rounded overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
          <h2 className="text-sm font-semibold text-ink">{roll.season || UNASSIGNED_SEASON_LABEL}</h2>
          <span className="text-2xs text-ink-faint">
            {roll.projects.length} project{roll.projects.length === 1 ? '' : 's'}
          </span>
          {over && (
            <span className="flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded border bg-red-50 text-red-700 border-red-200">
              <AlertTriangle size={9} /> Over envelope
            </span>
          )}
          {roll.openQuotes > 0 && (
            <span className="text-2xs px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200"
              title="Lines with a quote but no actual — a project can't close with these open">
              {roll.openQuotes} quote{roll.openQuotes === 1 ? '' : 's'} without an actual
            </span>
          )}
          <button onClick={() => setOpen((v) => !v)}
            className="ml-auto flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors">
            {roll.projects.length} project{roll.projects.length === 1 ? '' : 's'}
            <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
          </button>
        </div>

        {/* Figures */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2.5">
          <Figure
            label="Envelope"
            value={
              editing ? (
                <input
                  autoFocus type="text" value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={save}
                  onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
                  className="w-24 text-sm border-b border-accent bg-transparent focus:outline-none text-ink"
                />
              ) : (
                <button onClick={() => { setDraft(String(roll.envelope || '')); setEditing(true) }}
                  className="text-ink hover:text-accent transition-colors" title="Set the approved envelope">
                  {money(roll.envelope)}
                </button>
              )
            }
            hint={roll.envelopeIsDerived ? 'from project budgets' : 'approved'}
          />
          <Figure label="Committed" value={money(roll.committed)} hint={`quoted ${money(roll.quoted)}`} />
          <Figure label="Actual" value={money(roll.actual)} />
          <Figure
            label="Remaining"
            value={<span className={roll.remaining < 0 ? 'text-red-600' : 'text-ink'}>{money(roll.remaining)}</span>}
            hint="envelope − actual"
          />
        </div>

        {/* Committed against envelope */}
        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', over ? 'bg-red-500' : 'bg-accent')}
            style={{ width: `${pct}%` }} />
        </div>
      </div>

      {open && (
        <div className="border-t border-surface-3 bg-surface-1/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-3">
                <th className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-4 py-2">Project</th>
                <th className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-3 py-2 w-24">Quoted</th>
                <th className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-3 py-2 w-24">Actual</th>
                <th className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-3 py-2 w-24">Committed</th>
                <th className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-3 py-2 w-20">Lines</th>
              </tr>
            </thead>
            <tbody>
              {roll.projects.map((p) => (
                <tr key={p.projectId} className="border-b border-surface-3 last:border-0">
                  <td className="px-4 py-2">
                    <Link to={`/${p.module}s/${p.projectId}/budget`}
                      className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                      {p.projectName} <ExternalLink size={10} />
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-muted">{money(p.quoted)}</td>
                  <td className="px-3 py-2 text-xs text-ink">{money(p.actual)}</td>
                  <td className="px-3 py-2 text-xs text-ink">{money(p.committed)}</td>
                  <td className="px-3 py-2 text-xs text-ink-faint">
                    {p.lineCount}
                    {p.openQuotes > 0 && <span className="text-amber-600"> · {p.openQuotes} open</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Figure({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div>
      <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">{label}</p>
      <p className="text-lg font-semibold text-ink tabular-nums leading-tight">{value}</p>
      {hint && <p className="text-2xs text-ink-faint">{hint}</p>}
    </div>
  )
}
