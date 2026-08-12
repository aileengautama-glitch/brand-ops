/**
 * seasonBudget — envelope vs committed vs actual, rolled up per season.
 *
 * Definitions (kept explicit because "committed" means different things to
 * different people):
 *   envelope   the approved budget for the season. Set per season; when unset it
 *              falls back to the sum of the projects' own totalBudget so the
 *              dashboard is useful before anyone sets one.
 *   committed  money that is spoken for — every quoted line that isn't cancelled,
 *              i.e. actual where we have it, otherwise the quote.
 *   actual     what has actually been spent (actualCost lines only).
 *   remaining  envelope − actual.
 *
 * Quoted is reported alongside so a quote-with-no-actual is visible rather than
 * silently counted as spend.
 */
import type { BudgetItem } from '@/types/common'
import type { ShootProject } from '@/types/shoot'
import type { EventProject } from '@/types/event'

export interface ProjectBudgetRoll {
  projectId: string
  projectName: string
  module: 'shoot' | 'event'
  season: string
  ownEnvelope: number
  quoted: number
  actual: number
  committed: number
  /** Lines with a quote but no actual — the "can't close the project" signal. */
  openQuotes: number
  lineCount: number
}

export interface SeasonBudgetRoll {
  season: string
  /** Explicit season envelope when set, else the sum of project envelopes. */
  envelope: number
  envelopeIsDerived: boolean
  quoted: number
  actual: number
  committed: number
  remaining: number
  openQuotes: number
  projects: ProjectBudgetRoll[]
}

function rollLines(items: BudgetItem[]) {
  let quoted = 0, actual = 0, committed = 0, openQuotes = 0
  for (const b of items) {
    const q = Number(b.estimatedCost) || 0
    const a = Number(b.actualCost) || 0
    quoted += q
    actual += a
    // Committed = the best current figure for this line.
    committed += a > 0 ? a : q
    if (q > 0 && a === 0) openQuotes += 1
  }
  return { quoted, actual, committed, openQuotes }
}

function projectRoll(
  p: ShootProject | EventProject, module: 'shoot' | 'event',
): ProjectBudgetRoll {
  const items = p.budgetItems ?? []
  const { quoted, actual, committed, openQuotes } = rollLines(items)
  return {
    projectId: p.id,
    projectName: p.name,
    module,
    season: p.season?.trim() ?? '',
    ownEnvelope: Number(p.totalBudget) || 0,
    quoted, actual, committed, openQuotes,
    lineCount: items.length,
  }
}

/**
 * Roll every project up by season.
 * `envelopes` is the per-season approved figure; a season missing from it derives
 * its envelope from the projects underneath.
 */
export function buildSeasonBudgets(
  shoots: ShootProject[],
  events: EventProject[],
  envelopes: Record<string, number>,
): SeasonBudgetRoll[] {
  const rolls = [
    ...shoots.map((p) => projectRoll(p, 'shoot')),
    ...events.map((p) => projectRoll(p, 'event')),
  ]

  const bySeason = new Map<string, ProjectBudgetRoll[]>()
  for (const r of rolls) {
    const list = bySeason.get(r.season)
    if (list) list.push(r)
    else bySeason.set(r.season, [r])
  }

  const out: SeasonBudgetRoll[] = []
  for (const [season, projects] of bySeason) {
    const quoted = projects.reduce((s, p) => s + p.quoted, 0)
    const actual = projects.reduce((s, p) => s + p.actual, 0)
    const committed = projects.reduce((s, p) => s + p.committed, 0)
    const openQuotes = projects.reduce((s, p) => s + p.openQuotes, 0)
    const explicit = envelopes[season]
    const derived = projects.reduce((s, p) => s + p.ownEnvelope, 0)
    const envelope = typeof explicit === 'number' && explicit > 0 ? explicit : derived
    out.push({
      season,
      envelope,
      envelopeIsDerived: !(typeof explicit === 'number' && explicit > 0),
      quoted, actual, committed,
      remaining: envelope - actual,
      openQuotes,
      projects: projects.sort((a, b) => b.committed - a.committed),
    })
  }
  return out
}

export const money = (n: number) =>
  `$${Math.round(n).toLocaleString()}`

/** Share of the envelope already committed, clamped for the bar. */
export function committedPct(roll: SeasonBudgetRoll): number {
  if (roll.envelope <= 0) return 0
  return Math.min(100, Math.round((roll.committed / roll.envelope) * 100))
}
