/**
 * ShootDeckDocument — the single source of truth for the Shoot Brief Deck layout.
 *
 * Pure presentational: renders a ShootDeckData view-model (built from a local project
 * OR a remote deck snapshot — see lib/deckSnapshot.ts). Used by the in-app deck page
 * AND the public share/export route, so the template lives in ONE place.
 *
 * Layout = explicit A4 **portrait** page blocks (.deck-page), each a FIXED 210×297mm box
 * with 14mm padding and overflow:hidden — identical on screen and in print. Decks print
 * with @page margin:0 (usePrint('portrait',{margin:'0'})), so each card maps 1:1 onto a
 * sheet → the on-screen preview equals the exported PDF (WYSIWYG). Headings use Tailwind's
 * !important sizes so the global print typography overrides can't reflow them.
 *
 * NOTE: pages are fixed-height; content beyond one page is clipped (no auto-flow). Keep
 * per-page content within a page — long lists are split where needed (references). True
 * auto-flow across pages is the deferred Paged.js layer.
 *
 * Page order tracks the supplied brief-deck template:
 *   1 Cover — title/meta · moodboard · 2-col: overview+notes / brief D-Day schedule (time·activity·PIC)
 *   2 Crew & Models (models 2-up)
 *   3 Creative — creative direction · styling · hair & make-up · location
 *   4 Shot List — ID · name · description
 *   5 Shot List & References — per-shot rows with imagery (split across pages)
 *   6 Shot List References — plain contact sheet of every reference image ("Both" mode)
 */
import type { ReactNode } from 'react'
import { useStoredImage } from '@/hooks/useImageStorage'
import { durationLabel, compareByTimeThenOrder } from '@/lib/timeUtils'
import type { ShootDeckData } from '@/lib/deckSnapshot'
import type { Model, Shot, DDayTimelineRow, Styling } from '@/types/shoot'
import type { MoodboardItem, DayOfSlot } from '@/types/common'

const H2 = '!text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3'

// References rows per A4 page (each row carries up to a few thumbnails). Keeps each
// page within bounds so nothing is clipped and the preview matches the PDF.
const REFS_PER_PAGE = 3

// Reference contact-sheet thumbnails per A4 page (6-col grid) — the plain image
// wall appended after the structured per-shot reference rows ("Both" mode).
const CONTACT_PER_PAGE = 30

export default function ShootDeckDocument({ data }: { data: ShootDeckData }) {
  const bd = data.briefDetails
  const sb = data.shootBrief
  const moodboard = [...data.briefMoodboardItems].sort((a, b) => a.order - b.order)
  const slots = [...data.dayOfSlots].sort(compareByTimeThenOrder)
  const shots = [...data.shots].sort((a, b) => a.order - b.order)
  const ddays = [...(data.ddayRows ?? [])].sort(compareByTimeThenOrder)
  const stylings = data.stylings ?? []
  const wardrobeImages = data.wardrobeImages ?? []
  const hmuImages = data.hairAndMakeupImages ?? []

  const hasCreative =
    !!sb.creativeDirection || !!sb.campaignMessaging || !!sb.wardrobe || wardrobeImages.length > 0 ||
    !!sb.hairAndMakeup || hmuImages.length > 0 || !!sb.locations
  const creativeImages = [...wardrobeImages, ...hmuImages]
  const hasCrewModels = data.crewMembers.length > 0 || data.models.length > 0
  const shotGroups = groupShotsByLocation(shots)
  const ddayPages = chunk(ddays, REFS_PER_PAGE)
  // Every D-Day reference image (primary + extras), flattened for the contact sheet.
  const allRefImageIds = ddays.flatMap((r) => [r.imageId, ...(r.referenceImageIds ?? [])]).filter(Boolean)
  const contactSheetPages = chunk(allRefImageIds, CONTACT_PER_PAGE)

  return (
    <div className="print-area deck-doc">
      {/* ── Page 1 — Cover ──────────────────────────────────────────────── */}
      <DeckPage>
        <header className="border-b-2 border-ink pb-4 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="!text-2xs font-bold uppercase tracking-[0.2em] text-ink-faint mb-1">Shoot Brief</p>
              <h1 className="!text-3xl font-bold text-ink leading-tight">{data.name}</h1>
            </div>
            {bd.collection && (
              <div className="text-right shrink-0">
                <span className="!text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint block">Collection</span>
                <span className="text-sm font-medium text-ink">{bd.collection}</span>
              </div>
            )}
          </div>
          {data.description && <p className="text-sm text-ink-muted mt-2">{data.description}</p>}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3 max-w-md">
            {bd.shootType && <Meta label="Type" value={bd.shootType} />}
            {bd.shootDate && <Meta label="Date" value={bd.shootDate} />}
            {bd.location && <Meta label="Location" value={bd.location} />}
            {(bd.callTime || bd.wrapTime) && (
              <Meta label="Time" value={`${bd.callTime || '—'} → ${bd.wrapTime || '—'}`} />
            )}
          </div>
        </header>

        {moodboard.length > 0 && (
          <section className="no-page-break mb-6">
            <h2 className={H2}>Moodboard</h2>
            <div className="grid grid-cols-3 gap-3">
              {moodboard.slice(0, 6).map((item) => <BriefImage key={item.id} item={item} />)}
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div>
            <BriefTextSection label="Overview" text={sb.overview} />
            <BriefTextSection label="Notes" text={sb.additionalNotes} />
          </div>
          {slots.length > 0 && (
            <section className="no-page-break">
              <h2 className={H2}>Brief D-Day Schedule</h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-ink">
                    <th className="text-left text-xs font-semibold text-ink py-1.5 pr-3 w-24">Time</th>
                    <th className="text-left text-xs font-semibold text-ink py-1.5 pr-3">Activity</th>
                    <th className="text-left text-xs font-semibold text-ink py-1.5 w-20">PIC</th>
                  </tr>
                </thead>
                <tbody>{slots.map((slot) => <SlotRow key={slot.id} slot={slot} />)}</tbody>
              </table>
            </section>
          )}
        </div>
      </DeckPage>

      {/* ── Page 2 — Crew & Models ──────────────────────────────────────── */}
      {hasCrewModels && (
        <DeckPage>
          {data.crewMembers.length > 0 && (
            <section className="no-page-break mb-8">
              <h2 className={H2}>Crew</h2>
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

          {data.models.length > 0 && (
            <section className="no-page-break">
              <h2 className={H2}>Models</h2>
              <div className="grid grid-cols-2 gap-4">
                {data.models.map((model) => <ModelCard key={model.id} model={model} />)}
              </div>
            </section>
          )}
        </DeckPage>
      )}

      {/* ── Page 3 — Creative (2-col: text left · creative direction + refs right) ── */}
      {hasCreative && (
        <DeckPage>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <BriefTextSection label="Campaign Messaging" text={sb.campaignMessaging} />
              <BriefTextSection label="Styling" text={sb.wardrobe} />
              <BriefTextSection label="Hair & Make-Up" text={sb.hairAndMakeup} />
              <BriefTextSection label="Location" text={sb.locations} />
            </div>
            <div>
              <BriefTextSection label="Creative Direction" text={sb.creativeDirection} />
              {creativeImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {creativeImages.map((item) => <BriefImage key={item.id} item={item} />)}
                </div>
              )}
            </div>
          </div>
        </DeckPage>
      )}

      {/* ── Page 4 — Shot List (grouped by location / set) ───────────────── */}
      {shots.length > 0 && (
        <DeckPage>
          <h2 className={H2}>Shot List</h2>
          <div className="space-y-5">
            {shotGroups.map((group) => (
              <section key={group.location || '—'} className="no-page-break">
                {group.location && (
                  <p className="!text-2xs font-bold uppercase tracking-[0.12em] text-ink-secondary mb-1.5">
                    Location / Set: {group.location}
                  </p>
                )}
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-ink">
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-16">ID</th>
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-40">Shot name</th>
                      <th className="text-left text-xs font-semibold text-ink py-1.5">Description</th>
                    </tr>
                  </thead>
                  <tbody>{group.shots.map((shot) => <ShotRow key={shot.id} shot={shot} />)}</tbody>
                </table>
              </section>
            ))}
          </div>
        </DeckPage>
      )}

      {/* ── Page 5+ — Shot List & References (split across pages) ────────── */}
      {ddayPages.map((group, i) => (
        <DeckPage key={`refs-${i}`}>
          <h2 className={H2}>Shot List &amp; References{ddayPages.length > 1 ? ` (${i + 1}/${ddayPages.length})` : ''}</h2>
          <div className="space-y-4">
            {group.map((row) => (
              <DDayDeckRow key={row.id} row={row} stylings={stylings} models={data.models} />
            ))}
          </div>
        </DeckPage>
      ))}

      {/* ── Contact sheet — plain grid of every reference image ("Both" mode) ── */}
      {contactSheetPages.map((group, i) => (
        <DeckPage key={`contact-${i}`}>
          <h2 className={H2}>Shot List References{contactSheetPages.length > 1 ? ` (${i + 1}/${contactSheetPages.length})` : ''}</h2>
          <div className="grid grid-cols-6 gap-2">
            {group.map((iid, idx) => <DeckRefThumb key={`${iid}-${idx}`} imageId={iid} />)}
          </div>
        </DeckPage>
      ))}
    </div>
  )
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return []
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// Group shots by location/set, preserving first-appearance order (shots arrive
// pre-sorted by order). Shots with no location fall into a single leading ''-group
// (rendered without a heading), so the page degrades to a flat list when unset.
function groupShotsByLocation(shots: Shot[]): { location: string; shots: Shot[] }[] {
  const groups: { location: string; shots: Shot[] }[] = []
  for (const shot of shots) {
    const loc = shot.location || ''
    let g = groups.find((x) => x.location === loc)
    if (!g) { g = { location: loc, shots: [] }; groups.push(g) }
    g.shots.push(shot)
  }
  return groups
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────
// Fixed A4-portrait box (210×297mm, 14mm padding, overflow hidden) — identical on
// screen and in print so the preview equals the exported PDF.

function DeckPage({ children }: { children: ReactNode }) {
  return (
    <section className="deck-page w-[210mm] h-[297mm] overflow-hidden mx-auto mb-[12mm] p-[14mm] bg-white shadow-lg">
      {children}
    </section>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BriefTextSection({ label, text, images }: { label: string; text?: string; images?: MoodboardItem[] }) {
  if (!text && !(images && images.length > 0)) return null
  return (
    <section className="no-page-break mb-6">
      <h2 className={H2}>{label}</h2>
      {images && images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {images.map((item) => <BriefImage key={item.id} item={item} />)}
        </div>
      )}
      {text && <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{text}</p>}
    </section>
  )
}

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
      <td className="py-1.5 pr-4 border-b border-surface-3 font-mono text-xs text-ink-secondary align-top">{shot.shotId || '—'}</td>
      <td className="py-1.5 pr-4 border-b border-surface-3 font-medium text-ink align-top">{shot.name}</td>
      <td className="py-1.5 border-b border-surface-3 text-ink-muted align-top">{shot.description || '—'}</td>
    </tr>
  )
}

function SlotRow({ slot }: { slot: DayOfSlot }) {
  const timeStr = [slot.timeStart, slot.timeEnd].filter(Boolean).join(' – ')
  return (
    <tr>
      <td className="py-1 pr-3 border-b border-surface-3 text-ink-secondary whitespace-nowrap align-top">{timeStr || '—'}</td>
      <td className="py-1 pr-3 border-b border-surface-3 text-ink align-top">{slot.activity}</td>
      <td className="py-1 border-b border-surface-3 text-ink-muted align-top">{slot.owner || '—'}</td>
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
  // Per-model looks (new model); falls back to the legacy single styling + model names below.
  const looks = (row.modelStylings ?? [])
    .map((ms) => {
      const name = models.find((m) => m.id === ms.modelId)?.name?.split(' ')[0]
      if (!name) return null
      const code = stylings.find((s) => s.id === ms.stylingId)?.stylingCode
      return code ? `${name} · ${code}` : name
    })
    .filter(Boolean) as string[]
  const imageIds = [row.imageId, ...(row.referenceImageIds ?? [])].filter(Boolean)

  return (
    <div className="no-page-break border-b border-surface-3 pb-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2">
        {row.imageCode && <span className="font-mono text-xs text-ink-secondary">{row.imageCode}</span>}
        {timeStr && <span className="text-xs text-ink-muted whitespace-nowrap">{timeStr}{dur ? ` · ${dur}` : ''}</span>}
        {row.location && <span className="text-sm font-medium text-ink">{row.location}</span>}
        {looks.length > 0 ? (
          <span className="text-2xs font-mono text-accent">{looks.join('   ')}</span>
        ) : (
          <>
            {styling && <span className="text-2xs font-mono text-accent">{styling.stylingCode}</span>}
            {modelNames && <span className="text-xs text-ink-muted">Models: {modelNames}</span>}
          </>
        )}
      </div>
      {row.notes && <p className="text-xs text-ink-muted mb-2 whitespace-pre-wrap">{row.notes}</p>}
      {imageIds.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
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
