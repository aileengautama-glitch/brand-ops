import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { useCurrentShootProject } from '@/hooks/useCurrentProject'
import { useStoredImage } from '@/hooks/useImageStorage'
import CopyShareLinkButton from '@/components/ui/CopyShareLinkButton'
import { usePrint } from '@/hooks/usePrint'
import type { Model, Shot, ShootBriefSection, DDayTimelineRow, Styling } from '@/types/shoot'
import type { MoodboardItem, DayOfSlot } from '@/types/common'
import { durationLabel, compareByTimeThenOrder } from '@/lib/timeUtils'

const BRIEF_PRINT_SECTIONS: { key: keyof ShootBriefSection; label: string }[] = [
  { key: 'overview',          label: 'Overview' },
  { key: 'creativeDirection', label: 'Creative Direction' },
  { key: 'wardrobe',          label: 'Wardrobe' },
  { key: 'hairAndMakeup',     label: 'Hair & Make-Up' },
  { key: 'locations',         label: 'Locations' },
  { key: 'additionalNotes',   label: 'Additional Notes' },
]

export default function ShootBriefDeck() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentShootProject()

  const triggerPrint = usePrint('landscape')

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const sortedSlots = [...project.dayOfSlots].sort(compareByTimeThenOrder)
  const sortedShots = [...project.shots].sort((a, b) => a.order - b.order)
  const sortedDDay = [...project.ddayRows].sort(compareByTimeThenOrder)
  const sortedMoodboard = [...project.briefMoodboardItems].sort((a, b) => a.order - b.order)
  const bd = project.briefDetails

  return (
    <div className="print-page-wrapper p-6 max-w-6xl">
      {/* Header bar — hidden when printing */}
      <div className="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 className="text-lg font-bold text-ink">Shoot Brief Deck</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Auto-populated from project data. Fields are editable before printing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CopyShareLinkButton module="shoot" projectId={id} deckType="brief-deck" />
          <button
            onClick={triggerPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
          >
            <Printer size={13} /> Print / Export
          </button>
        </div>
      </div>

      <div className="print-area space-y-10">

        {/* Document title */}
        <div className="border-b-2 border-ink pb-4">
          <p className="text-2xs font-bold uppercase tracking-[0.2em] text-ink-faint mb-1">Shoot Brief</p>
          <h2 className="text-3xl font-bold text-ink">{project.name}</h2>
          {project.description && (
            <p className="text-sm text-ink-muted mt-1">{project.description}</p>
          )}
          {/* Brief details summary row */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3">
            {bd.shootType && <BriefMeta label="Type" value={bd.shootType} />}
            {bd.client && <BriefMeta label="Client" value={bd.client} />}
            {bd.location && <BriefMeta label="Location" value={bd.location} />}
            {(bd.callTime || bd.wrapTime) && (
              <BriefMeta label="Call / Wrap" value={`${bd.callTime || '—'} → ${bd.wrapTime || '—'}`} />
            )}
          </div>
        </div>

        {/* ── Moodboard — top of deck ───────────────────────────────────── */}
        <section>
          <h3 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
            Moodboard
          </h3>
          {sortedMoodboard.length === 0 ? (
            <p className="text-sm text-ink-faint no-print">
              No brief moodboard images yet — add them on the Shot Brief page.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {sortedMoodboard.map((item) => (
                <BriefMoodboardCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* ── Two-column grid: brief text + shot list / schedule ────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-10">

          {/* Left: brief text sections — Wardrobe & HMU also show reference images */}
          <div className="space-y-8">
            {BRIEF_PRINT_SECTIONS
              .filter(({ key }) => {
                if (key === 'wardrobe')     return !!project.shootBrief[key] || (project.wardrobeImages?.length ?? 0) > 0
                if (key === 'hairAndMakeup') return !!project.shootBrief[key] || (project.hairAndMakeupImages?.length ?? 0) > 0
                return !!project.shootBrief[key]
              })
              .map(({ key, label }) => {
                const refImages =
                  key === 'wardrobe'      ? (project.wardrobeImages ?? []) :
                  key === 'hairAndMakeup' ? (project.hairAndMakeupImages ?? []) :
                  []
                return (
                  <section key={key} className="no-page-break">
                    <h3 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
                      {label}
                    </h3>
                    {refImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {refImages.map((item) => (
                          <BriefMoodboardCard key={item.id} item={item} />
                        ))}
                      </div>
                    )}
                    {project.shootBrief[key] && (
                      <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
                        {project.shootBrief[key]}
                      </p>
                    )}
                  </section>
                )
              })
            }
          </div>

          {/* Right: shot list + schedule */}
          <div className="space-y-8">
            {sortedShots.length > 0 && (
              <section className="no-page-break">
                <h3 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
                  Shot List
                </h3>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-ink">
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-16">ID</th>
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4">Shot name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedShots.map((shot) => (
                      <ShotSummaryRow key={shot.id} shot={shot} />
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {sortedSlots.length > 0 && (
              <section className="no-page-break">
                <h3 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
                  Brief Day Schedule
                </h3>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-ink">
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-24">Time</th>
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-16">Duration</th>
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4">Activity</th>
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-28">PIC</th>
                      <th className="text-left text-xs font-semibold text-ink py-1.5 w-36">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSlots.map((slot) => (
                      <ScheduleRow key={slot.id} slot={slot} />
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </div>

        </div>

        {/* ── Shot List & References — scheduled shots with imagery ─────── */}
        {sortedDDay.length > 0 && (
          <section className="no-page-break">
            <h3 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
              Shot List &amp; References
            </h3>
            <div className="space-y-4">
              {sortedDDay.map((row) => (
                <DDayDeckRow
                  key={row.id}
                  row={row}
                  stylings={project.stylings ?? []}
                  models={project.models}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Crew + Models — full width ────────────────────────────────── */}
        {project.crewMembers.length > 0 && (
          <section className="no-page-break">
            <h3 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
              Crew
            </h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-40">Name</th>
                  <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-36">Role</th>
                  <th className="text-left text-xs font-semibold text-ink py-1.5">Contact</th>
                </tr>
              </thead>
              <tbody>
                {project.crewMembers.map((m, i) => (
                  <tr key={m.id} className={i % 2 === 0 ? '' : 'bg-surface-1/40'}>
                    <td className="py-1.5 pr-4 border-b border-surface-3 font-medium text-ink">{m.name}</td>
                    <td className="py-1.5 pr-4 border-b border-surface-3 text-ink-muted">{m.role}</td>
                    <td className="py-1.5 border-b border-surface-3 text-ink-faint text-xs">{m.contact || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {project.models.length > 0 && (
          <section>
            <h3 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
              Models
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {project.models.map((model) => (
                <ModelDeckCard key={model.id} model={model} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ShotSummaryRow({ shot }: { shot: Shot }) {
  return (
    <tr>
      <td className="py-1.5 pr-4 border-b border-surface-3 font-mono text-xs text-ink-secondary">{shot.shotId || '—'}</td>
      <td className="py-1.5 pr-4 border-b border-surface-3 font-medium text-ink">{shot.name}</td>
      <td className="py-1.5 border-b border-surface-3 text-ink-muted text-xs">{shot.description || '—'}</td>
    </tr>
  )
}

function BriefMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-ink-faint">{label}:</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  )
}

function ScheduleRow({ slot }: { slot: DayOfSlot }) {
  const timeStr = [slot.timeStart, slot.timeEnd].filter(Boolean).join(' – ')
  return (
    <tr>
      <td className="py-1.5 pr-4 border-b border-surface-3 text-ink-secondary whitespace-nowrap">{timeStr || '—'}</td>
      <td className="py-1.5 pr-4 border-b border-surface-3 text-ink-muted whitespace-nowrap">{durationLabel(slot.timeStart, slot.timeEnd) || '—'}</td>
      <td className="py-1.5 pr-4 border-b border-surface-3 text-ink">{slot.activity}</td>
      <td className="py-1.5 pr-4 border-b border-surface-3 text-ink-muted">{slot.owner || '—'}</td>
      <td className="py-1.5 border-b border-surface-3 text-ink-faint text-xs">{slot.notes || '—'}</td>
    </tr>
  )
}

// ─── Scheduled shot-list row with reference imagery (brief deck) ──────────────

function DDayDeckRow({ row, stylings, models }: { row: DDayTimelineRow; stylings: Styling[]; models: Model[] }) {
  const timeStr = [row.timeStart, row.timeEnd].filter(Boolean).join(' – ')
  const dur = durationLabel(row.timeStart, row.timeEnd)
  const styling = stylings.find((s) => s.id === row.stylingId)
  const modelNames = row.modelIds
    .map((mid) => models.find((m) => m.id === mid)?.name)
    .filter(Boolean)
    .join(', ')
  const imageIds = [row.imageId, ...(row.referenceImageIds ?? [])].filter(Boolean)

  return (
    <div className="no-page-break border-b border-surface-3 pb-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2">
        {row.imageCode && <span className="font-mono text-xs text-ink-secondary">{row.imageCode}</span>}
        {timeStr && <span className="text-xs text-ink-muted whitespace-nowrap">{timeStr}{dur ? ` · ${dur}` : ''}</span>}
        {row.location && <span className="text-sm font-medium text-ink">{row.location}</span>}
        {styling && <span className="text-2xs font-mono text-accent">{styling.stylingCode}</span>}
        {modelNames && <span className="text-xs text-ink-muted">Models: {modelNames}</span>}
      </div>
      {row.notes && <p className="text-xs text-ink-muted mb-2 whitespace-pre-wrap">{row.notes}</p>}
      {imageIds.length > 0 && (
        <div className="grid grid-cols-6 gap-2">
          {imageIds.map((iid, i) => (
            <DeckRefThumb key={`${iid}-${i}`} imageId={iid} />
          ))}
        </div>
      )}
    </div>
  )
}

function DeckRefThumb({ imageId }: { imageId: string }) {
  const url = useStoredImage(imageId || undefined)
  return (
    <div className="aspect-[3/4] bg-surface-1 border border-surface-3 rounded overflow-hidden">
      {url ? (
        <img src={url} alt="Shot reference" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-ink-faint text-2xs">No image</div>
      )}
    </div>
  )
}

function BriefMoodboardCard({ item }: { item: MoodboardItem }) {
  const url = useStoredImage(item.imageId || undefined)
  return (
    <div className="space-y-2">
      <div className="w-full aspect-[4/3] bg-surface-1 border border-surface-3 rounded overflow-hidden">
        {url ? (
          <img src={url} alt={item.caption || 'Moodboard'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-faint text-xs">
            No image
          </div>
        )}
      </div>
      {item.caption && (
        <p className="text-xs text-ink-muted leading-snug">{item.caption}</p>
      )}
    </div>
  )
}

function ModelDeckCard({ model }: { model: Model }) {
  const url = useStoredImage(model.imageId || undefined)
  return (
    <div className="border border-surface-3 rounded overflow-hidden bg-white">
      {/* Photo */}
      <div className="w-full aspect-[3/4] bg-surface-1">
        {url ? (
          <img src={url} alt={model.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-faint text-xs">
            No photo
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-3 space-y-1.5">
        <div>
          <p className="text-sm font-semibold text-ink">{model.name}</p>
          <p className="text-xs text-ink-muted">{model.agency}</p>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {model.height && <MeasRow label="Height" value={model.height} />}
          {model.shoeSize && <MeasRow label="Shoe" value={model.shoeSize} />}
          {model.apparelSize && <MeasRow label="Apparel" value={model.apparelSize} />}
          {model.dressSize && <MeasRow label="Dress/Suit" value={model.dressSize} />}
        </div>

        {model.generalMeasurements && (
          <p className="text-2xs text-ink-faint pt-0.5">{model.generalMeasurements}</p>
        )}
      </div>
    </div>
  )
}

function MeasRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5 text-xs">
      <span className="text-ink-faint">{label}</span>
      <span className="text-ink-secondary font-medium">{value}</span>
    </div>
  )
}
