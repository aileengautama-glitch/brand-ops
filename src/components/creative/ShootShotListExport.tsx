/**
 * ShootShotListExport — print/export layout for the detailed shot list, matching the
 * supplied "Shot List" template (att2): rows grouped by location (merged cell), time,
 * a stills reference collage, a styling-code + garment-image column PER model, and a
 * prop/setting column. Rendered as the print artefact on the D-Day Timeline page (the
 * editable DDayTimelineTable is hidden in print). Pure presentational.
 *
 * Per-model columns come from DDayTimelineRow.modelStylings (modelId → stylingId); the
 * styling code + garment image are resolved from the Styling entity. Break rows
 * (LUNCH/WRAP UP) have no data model and are intentionally not rendered.
 */
import { useStoredImage } from '@/hooks/useImageStorage'
import { compareByTimeThenOrder } from '@/lib/timeUtils'
import type { DDayTimelineRow, Model, Styling } from '@/types/shoot'

export default function ShootShotListExport({
  rows, models, stylings, projectName,
}: {
  rows: DDayTimelineRow[]
  models: Model[]
  stylings: Styling[]
  projectName: string
}) {
  const sorted = [...rows].sort(compareByTimeThenOrder)
  const groups = groupByLocation(sorted)
  const stylingById = new Map(stylings.map((s) => [s.id, s]))

  const th = 'text-left text-2xs font-bold uppercase tracking-wide text-ink-faint px-2 py-1.5 border border-surface-3 align-bottom'
  const td = 'px-2 py-1.5 border border-surface-3 align-top text-2xs text-ink'

  return (
    <div className="shotlist-export">
      <div className="mb-3">
        <h1 className="!text-2xl font-bold text-ink leading-none">Shot List</h1>
        <p className="text-2xs uppercase tracking-[0.18em] text-ink-faint mt-1">
          {projectName} · *Motion &amp; stills shot concurrently
        </p>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th} style={{ width: '12%' }}>Location</th>
            <th className={th} style={{ width: '9%' }}>Time</th>
            <th className={th}>Stills — Shot List</th>
            {models.map((m) => (
              <th key={m.id} className={`${th} text-center`} style={{ width: 88 }}>{m.name.split(' ')[0]}</th>
            ))}
            <th className={th} style={{ width: '13%' }}>Prop / Setting</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) =>
            g.rows.map((row, i) => (
              <tr key={row.id}>
                {i === 0 && (
                  <td className={`${td} font-semibold uppercase tracking-wide`} rowSpan={g.rows.length}>
                    {g.location || '—'}
                  </td>
                )}
                <td className={`${td} whitespace-nowrap`}>
                  {[row.timeStart, row.timeEnd].filter(Boolean).join(' – ') || '—'}
                </td>
                <td className={td}>
                  <StillsStrip ids={[row.imageId, ...(row.referenceImageIds ?? [])].filter(Boolean)} />
                </td>
                {models.map((m) => {
                  const ms = (row.modelStylings ?? []).find((x) => x.modelId === m.id)
                  return (
                    <td key={m.id} className={`${td} text-center`}>
                      <LookCell styling={ms ? stylingById.get(ms.stylingId) : undefined} />
                    </td>
                  )
                })}
                <td className={td}>{row.notes || ''}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function groupByLocation(rows: DDayTimelineRow[]): { location: string; rows: DDayTimelineRow[] }[] {
  const groups: { location: string; rows: DDayTimelineRow[] }[] = []
  for (const row of rows) {
    const loc = row.location || ''
    let g = groups.find((x) => x.location === loc)
    if (!g) { g = { location: loc, rows: [] }; groups.push(g) }
    g.rows.push(row)
  }
  return groups
}

function StillsStrip({ ids }: { ids: string[] }) {
  if (ids.length === 0) return <span className="text-ink-faint">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {ids.map((id, i) => <Thumb key={`${id}-${i}`} imageId={id} className="w-14 h-14" />)}
    </div>
  )
}

function LookCell({ styling }: { styling?: Styling }) {
  if (!styling) return <span className="text-ink-faint">—</span>
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-mono text-2xs text-accent">{styling.stylingCode}</span>
      {styling.imageId && <Thumb imageId={styling.imageId} className="w-14 h-16" />}
    </div>
  )
}

function Thumb({ imageId, className }: { imageId: string; className?: string }) {
  const url = useStoredImage(imageId || undefined)
  return (
    <div className={`bg-surface-1 border border-surface-3 rounded overflow-hidden ${className ?? ''}`}>
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
    </div>
  )
}
