/**
 * ShootScheduleExport — print/export layout for the day-of schedule, matching the
 * supplied "D-Day Schedule" template (att3): an accent header band (title · date ·
 * time) then a TIME · DURATION · TO DO · PIC · NOTE table.
 *
 * Consecutive slots that share the same time range are merged under one TIME/DURATION
 * cell (rowspan), so a single time block can list several parallel to-dos with
 * different PICs — no data-model change, just a grouping of the existing DayOfSlot[].
 * Break rows (lunch/break/dinner) are accent-highlighted. Pure presentational.
 */
import { durationLabel, compareByTimeThenOrder } from '@/lib/timeUtils'
import type { DayOfSlot } from '@/types/common'

const BREAK_RE = /\b(lunch|break|dinner)\b/i

export default function ShootScheduleExport({
  slots, location, date, callTime, wrapTime,
}: {
  slots: DayOfSlot[]
  location?: string
  date?: string
  callTime?: string
  wrapTime?: string
}) {
  const sorted = [...slots].sort(compareByTimeThenOrder)
  const groups = groupByTimeRange(sorted)
  const timeRange = [callTime, wrapTime].filter(Boolean).join(' – ')

  const th = 'text-left text-2xs font-bold uppercase tracking-wide text-ink-faint px-2 py-1.5 border border-surface-3'
  const td = 'px-2 py-1.5 border border-surface-3 align-top text-xs text-ink'

  return (
    <div className="schedule-export">
      {/* Header band */}
      <div className="bg-accent text-white px-4 py-3 rounded-t">
        <h1 className="!text-xl font-bold leading-tight">D-Day Schedule{location ? ` [${location}]` : ''}</h1>
        <div className="flex flex-wrap gap-x-10 gap-y-0.5 mt-1 text-2xs">
          {date && <span><span className="opacity-70">Date</span>&nbsp;&nbsp;{date}</span>}
          {timeRange && <span><span className="opacity-70">Time</span>&nbsp;&nbsp;{timeRange}</span>}
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th} style={{ width: '10%' }}>Time</th>
            <th className={th} style={{ width: '9%' }}>Duration</th>
            <th className={th}>To Do</th>
            <th className={th} style={{ width: '18%' }}>PIC</th>
            <th className={th} style={{ width: '26%' }}>Note</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) =>
            g.slots.map((slot, i) => {
              const isBreak = BREAK_RE.test(slot.activity)
              return (
                <tr key={slot.id} className={isBreak ? 'bg-accent/10' : undefined}>
                  {i === 0 && (
                    <td className={`${td} whitespace-nowrap font-medium`} rowSpan={g.slots.length}>
                      {[slot.timeStart, slot.timeEnd].filter(Boolean).join(' – ') || '—'}
                    </td>
                  )}
                  {i === 0 && (
                    <td className={`${td} whitespace-nowrap text-ink-muted`} rowSpan={g.slots.length}>
                      {durationLabel(slot.timeStart, slot.timeEnd) || ''}
                    </td>
                  )}
                  <td className={`${td} ${isBreak ? 'font-semibold' : ''}`}>{slot.activity || '—'}</td>
                  <td className={td}>{slot.owner || ''}</td>
                  <td className={`${td} text-ink-muted`}>{slot.notes || ''}</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

// Merge CONSECUTIVE slots that share an identical time range into one block, so the
// TIME/DURATION cells can rowspan across their parallel to-dos (matches the template).
function groupByTimeRange(slots: DayOfSlot[]): { key: string; slots: DayOfSlot[] }[] {
  const groups: { key: string; slots: DayOfSlot[] }[] = []
  for (const slot of slots) {
    const key = `${slot.timeStart}|${slot.timeEnd}`
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.slots.push(slot)
    else groups.push({ key, slots: [slot] })
  }
  return groups
}
