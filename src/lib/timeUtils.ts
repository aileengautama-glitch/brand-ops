/**
 * Small, pure time helpers for shoot scheduling (detailed schedule + D-Day shot list).
 *
 * Times are stored as the native <input type="time"> value: "HH:MM" (24-hour), or ''.
 * These helpers never throw — unparseable/blank input yields null/'' so callers can
 * fall back gracefully (e.g. blank-time rows sort last, no duration shown).
 */

/** "HH:MM" → minutes since midnight, or null if blank/unparseable. */
export function timeToMinutes(t: string | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((t ?? '').trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/**
 * Human duration between two "HH:MM" times, e.g. "1h15m" / "45m" / "2h".
 * Returns '' when either time is missing or the span is not positive
 * (we intentionally don't guess across-midnight spans in v1).
 */
export function durationLabel(start: string | undefined, end: string | undefined): string {
  const s = timeToMinutes(start)
  const e = timeToMinutes(end)
  if (s === null || e === null) return ''
  const diff = e - s
  if (diff <= 0) return ''
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join('') || '0m'
}

/**
 * Comparator: order by start time ascending, with blank/unparseable times sorted
 * last, tie-broken by the row's manual `order`. Lets time-driven views (schedule,
 * scheduled shot list, deck) read chronologically while still honouring manual
 * ordering for untimed rows and exact ties.
 */
export function compareByTimeThenOrder(
  a: { timeStart?: string; order: number },
  b: { timeStart?: string; order: number },
): number {
  const am = timeToMinutes(a.timeStart)
  const bm = timeToMinutes(b.timeStart)
  if (am !== bm) {
    if (am === null) return 1
    if (bm === null) return -1
    return am - bm
  }
  return a.order - b.order
}
