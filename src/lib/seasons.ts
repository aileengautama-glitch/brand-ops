/**
 * Seasons — the grouping every project hangs off.
 *
 * Deliberately just a string on the project, not a Season entity: the season brief
 * and creative platform live in Notion, and duplicating them here would create the
 * second source of truth the production brief warns about. All the app needs is a
 * label it can group and filter by.
 *
 * The suggestion list is generated so it never goes stale, but the field accepts
 * free text — a project can sit in "Resort 27" or "Always-on" without a code change.
 */

export type SeasonCode = string

/** Fashion seasons in calendar order within a year. */
const SEASON_PREFIXES = ['S/S', 'A/W'] as const

/**
 * Suggested seasons around now — two years back through two years forward, so the
 * current season and the ones being planned are always one click away.
 */
export function suggestedSeasons(today = new Date()): SeasonCode[] {
  const year = today.getUTCFullYear()
  const out: SeasonCode[] = []
  for (let y = year - 1; y <= year + 2; y++) {
    const yy = String(y % 100).padStart(2, '0')
    for (const p of SEASON_PREFIXES) out.push(`${p}${yy}`)
  }
  return out
}

/**
 * The season a project would most likely be for right now — S/S is planned in the
 * back half of the previous year, A/W in the front half of the same year.
 */
export function defaultSeason(today = new Date()): SeasonCode {
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth() // 0-11
  // Jan–Jun → A/W of this year; Jul–Dec → S/S of next year.
  return month <= 5
    ? `A/W${String(year % 100).padStart(2, '0')}`
    : `S/S${String((year + 1) % 100).padStart(2, '0')}`
}

/** Sort key so S/S26 → A/W26 → S/S27 orders correctly; unknown labels sort last. */
export function seasonSortKey(season: string): number {
  const m = /^([SA])\/([SW])\s*(\d{2})$/.exec(season.trim())
  if (!m) return Number.MAX_SAFE_INTEGER
  const year = Number(m[3])
  const half = m[1] === 'S' ? 0 : 1
  return year * 10 + half
}

/** Group any project-like list by season, ordered, with unassigned last. */
export function groupBySeason<T extends { season?: string }>(
  items: T[],
): { season: string; items: T[] }[] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = item.season?.trim() || ''
    const bucket = map.get(key)
    if (bucket) bucket.push(item)
    else map.set(key, [item])
  }
  return [...map.entries()]
    .map(([season, items]) => ({ season, items }))
    .sort((a, b) => {
      if (a.season === '') return 1      // unassigned last
      if (b.season === '') return -1
      const ka = seasonSortKey(a.season)
      const kb = seasonSortKey(b.season)
      if (ka !== kb) return ka - kb
      return a.season.localeCompare(b.season)
    })
}

/** Distinct seasons present in a list, ordered — used to build filter chips. */
export function seasonsPresent<T extends { season?: string }>(items: T[]): string[] {
  return groupBySeason(items).map((g) => g.season).filter(Boolean)
}

export const UNASSIGNED_SEASON_LABEL = 'No season'
