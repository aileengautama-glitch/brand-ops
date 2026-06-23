/**
 * ShootDeckDocument — the single source of truth for the Shoot Brief Deck layout.
 *
 * Pure presentational: renders a ShootDeckData view-model (built from a local project
 * OR a remote deck snapshot — see lib/deckSnapshot.ts). Used by the public share/export
 * route so the template lives in ONE place instead of being copy-pasted per surface.
 *
 * Images resolve via useStoredImage (IndexedDB on the authoring device, Supabase public
 * URLs on a fresh/headless device once the media cache is hydrated). That keeps this
 * component renderable both client-side and, later, by a headless browser for server PDF.
 *
 * Section order tracks the supplied brief-deck template:
 *   title/meta → moodboard → brief text + shot list + schedule → shot list & references
 *   → crew → models
 */
import { useStoredImage } from '@/hooks/useImageStorage'
import { durationLabel, compareByTimeThenOrder } from '@/lib/timeUtils'
import type { ShootDeckData } from '@/lib/deckSnapshot'
import type { Model, Shot, DDayTimelineRow, Styling } from '@/types/shoot'
import type { MoodboardItem, DayOfSlot } from '@/types/common'

const BRIEF_SECTIONS = [
  { key: 'overview',          label: 'Overview' },
  { key: 'creativeDirection', label: 'Creative Direction' },
  { key: 'wardrobe',          label: 'Styling' },
  { key: 'hairAndMakeup',     label: 'Hair & Make-Up' },
  { key: 'locations',         label: 'Location' },
  { key: 'additionalNotes',   label: 'Notes' },
] as const

export default function ShootDeckDocument({ data }: { data: ShootDeckData }) {
  const bd = data.briefDetails
  const moodboard = [...data.briefMoodboardItems].sort((a, b) => a.order - b.order)
  const slots = [...data.dayOfSlots].sort(compareByTimeThenOrder)
  const shots = [...data.shots].sort((a, b) => a.order - b.order)
  const ddays = [...(data.ddayRows ?? [])].sort(compareByTimeThenOrder)
  const stylings = data.stylings ?? []

  return (
    <div className="print-area space-y-10">
      {/* ── Title ─────────────────────────────────────────────────────── */}
      <div className="border-b-2 border-ink pb-4 no-page-break">
        <p className="text-2xs font-bold uppercase tracking-[0.2em] text-ink-faint mb-1">Shoot Brief</p>
        <h1 className="text-3xl font-bold text-ink">{data.name}</h1>
        {data.description && <p className="text-sm text-ink-muted mt-1">{data.description}</p>}
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3">
          {bd.shootType && <Meta label="Type" value={bd.shootType} />}
          {bd.client && <Meta label="Collection" value={bd.client} />}
          {bd.location && <Meta label="Location" value={bd.location} />}
          {(bd.callTime || bd.wrapTime) && (
            <Meta label="Call / Wrap" value={`${bd.callTime || '—'} → ${bd.wrapTime || '—'}`} />
          )}
        </div>
      </div>

      {/* ── Moodboard ─────────────────────────────────────────────────── */}
      {moodboard.length > 0 && (
        <section className="no-page-break">
          <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">Moodboard</h2>
          <div className="grid grid-cols-4 gap-3">
            {moodboard.map((item) => <BriefImage key={item.id} item={item} />)}
          </div>
        </section>
      )}

      {/* ── Brief text + shot list + schedule ─────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-10">
        {/* Left: brief text (Wardrobe & HMU also show reference images) */}
        <div className="space-y-8">
          {BRIEF_SECTIONS.filter(({ key }) => {
            if (key === 'wardrobe')      return !!data.shootBrief[key] || (data.wardrobeImages?.length ?? 0) > 0
            if (key === 'hairAndMakeup') return !!data.shootBrief[key] || (data.hairAndMakeupImages?.length ?? 0) > 0
            return !!data.shootBrief[key]
          }).map(({ key, label }) => {
            const refImages =
              key === 'wardrobe'      ? (data.wardrobeImages ?? []) :
              key === 'hairAndMakeup' ? (data.hairAndMakeupImages ?? []) :
              []
            return (
              <section key={key} className="no-page-break">
                <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">{label}</h2>
                {refImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {refImages.map((item) => <BriefImage key={item.id} item={item} />)}
                  </div>
                )}
                {data.shootBrief[key] && (
                  <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{data.shootBrief[key]}</p>
                )}
              </section>
            )
          })}
        </div>

        {/* Right: concept shot list + brief day schedule */}
        <div className="space-y-8">
          {shots.length > 0 && (
            <section className="no-page-break">
              <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">Shot List</h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-ink">
                    <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-16">ID</th>
                    <th className="text-left text-xs font-semibold text-ink py-1.5">Shot name</th>
                  </tr>
                </thead>
                <tbody>
                  {shots.map((shot) => <ShotRow key={shot.id} shot={shot} />)}
                </tbody>
              </table>
            </section>
          )}

          {slots.length > 0 && (
            <section className="no-page-break">
              <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">Brief Day Schedule</h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-ink">
                    <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-24">Time</th>
                    <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-16">Duration</th>
                    <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4">Activity</th>
                    <th className="text-left text-xs font-semibold text-ink py-1.5 w-28">PIC</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => <SlotRow key={slot.id} slot={slot} />)}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>

      {/* ── Shot List & References — scheduled shots with imagery ──────── */}
      {ddays.length > 0 && (
        <section className="no-page-break">
          <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">Shot List &amp; References</h2>
          <div className="space-y-4">
            {ddays.map((row) => (
              <DDayDeckRow key={row.id} row={row} stylings={stylings} models={data.models} />
            ))}
          </div>
        </section>
      )}

      {/* ── Crew ──────────────────────────────────────────────────────── */}
      {data.crewMembers.length > 0 && (
        <section className="no-page-break">
          <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">Crew</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-ink">
                <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-40">Name</th>
                <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-36">Role</th>
                <th className="text-left text-xs font-semibold text-ink py-1.5">Contact</th>
              </tr>
            </thead>
            <tbody>
              {data.crewMembers.map((m) => (
                <tr key={m.id}>
                  <td className="py-1.5 pr-4 border-b border-surface-3 font-medium text-ink">{m.name}</td>
                  <td className="py-1.5 pr-4 border-b border-surface-3 text-ink-muted">{m.role}</td>
                  <td className="py-1.5 border-b border-surface-3 text-ink-faint text-xs">{m.contact || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* ── Models ────────────────────────────────────────────────────── */}
      {data.models.length > 0 && (
        <section>
          <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">Models</h2>
          <div className="grid grid-cols-4 gap-4">
            {data.models.map((model) => <ModelCard key={model.id} model={model} />)}
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-ink-faint">{label}:</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  )
}

function BriefImage({ item }: { item: MoodboardItem }) {
  const url = useStoredImage(item.imageId || undefined)
  return (
    <div className="space-y-1">
      <div className="w-full aspect-[4/3] bg-surface-1 border border-surface-3 rounded overflow-hidden">
        {url
          ? <img src={url} alt={item.caption || 'Brief image'} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-ink-faint text-xs">No image</div>}
      </div>
      {item.caption && <p className="text-xs text-ink-muted leading-snug">{item.caption}</p>}
    </div>
  )
}

function ShotRow({ shot }: { shot: Shot }) {
  return (
    <tr>
      <td className="py-1.5 pr-4 border-b border-surface-3 font-mono text-xs text-ink-secondary">{shot.shotId || '—'}</td>
      <td className="py-1.5 border-b border-surface-3 font-medium text-ink">{shot.name}</td>
    </tr>
  )
}

function SlotRow({ slot }: { slot: DayOfSlot }) {
  const timeStr = [slot.timeStart, slot.timeEnd].filter(Boolean).join(' – ')
  return (
    <tr>
      <td className="py-1.5 pr-4 border-b border-surface-3 text-ink-secondary whitespace-nowrap">{timeStr || '—'}</td>
      <td className="py-1.5 pr-4 border-b border-surface-3 text-ink-muted whitespace-nowrap">{durationLabel(slot.timeStart, slot.timeEnd) || '—'}</td>
      <td className="py-1.5 pr-4 border-b border-surface-3 text-ink">{slot.activity}</td>
      <td className="py-1.5 border-b border-surface-3 text-ink-muted">{slot.owner || '—'}</td>
    </tr>
  )
}

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
          {imageIds.map((iid, i) => <DeckRefThumb key={`${iid}-${i}`} imageId={iid} />)}
        </div>
      )}
    </div>
  )
}

function DeckRefThumb({ imageId }: { imageId: string }) {
  const url = useStoredImage(imageId || undefined)
  return (
    <div className="aspect-[3/4] bg-surface-1 border border-surface-3 rounded overflow-hidden">
      {url
        ? <img src={url} alt="Shot reference" className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-ink-faint text-2xs">No image</div>}
    </div>
  )
}

function ModelCard({ model }: { model: Model }) {
  const url = useStoredImage(model.imageId || undefined)
  return (
    <div className="border border-surface-3 rounded overflow-hidden bg-white no-page-break">
      <div className="w-full aspect-[3/4] bg-surface-1">
        {url
          ? <img src={url} alt={model.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-ink-faint text-xs">No photo</div>}
      </div>
      <div className="p-2 space-y-1">
        <div>
          <p className="text-sm font-medium text-ink">{model.name}</p>
          {model.agency && <p className="text-xs text-ink-faint">{model.agency}</p>}
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          {model.height && <Meas label="Height" value={model.height} />}
          {model.shoeSize && <Meas label="Shoe" value={model.shoeSize} />}
          {model.apparelSize && <Meas label="Apparel" value={model.apparelSize} />}
          {model.dressSize && <Meas label="Dress/Suit" value={model.dressSize} />}
        </div>
        {model.generalMeasurements && <p className="text-2xs text-ink-faint">{model.generalMeasurements}</p>}
      </div>
    </div>
  )
}

function Meas({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1 text-2xs">
      <span className="text-ink-faint">{label}</span>
      <span className="text-ink-secondary font-medium">{value}</span>
    </div>
  )
}
