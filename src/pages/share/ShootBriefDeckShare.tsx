/**
 * Read-only shareable view of the Shoot Brief Deck.
 * Accessible at /share/shoot/:id/brief-deck — no sidebar, no editing controls.
 */
import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { useShootStore } from '@/store/useShootStore'
import { useStoredImage } from '@/hooks/useImageStorage'
import { useEnsureProjectMedia } from '@/hooks/useMediaSync'
import { useRemoteDeckSnapshot } from '@/hooks/useRemoteDeckSnapshot'
import { buildShootDeckData, type ShootDeckData } from '@/lib/deckSnapshot'
import { usePrint } from '@/hooks/usePrint'
import type { Model, Shot } from '@/types/shoot'
import type { MoodboardItem, DayOfSlot } from '@/types/common'

const BRIEF_SECTIONS = [
  { key: 'overview',          label: 'Overview' },
  { key: 'creativeDirection', label: 'Creative Direction' },
  { key: 'wardrobe',          label: 'Wardrobe' },
  { key: 'hairAndMakeup',     label: 'Hair & Make-Up' },
  { key: 'locations',         label: 'Locations' },
  { key: 'additionalNotes',   label: 'Additional Notes' },
] as const

export default function ShootBriefDeckShare() {
  const { id } = useParams<{ id: string }>()
  const localProject = useShootStore((s) => s.projects.find((p) => p.id === id))
  const triggerPrint = usePrint('landscape')

  // This route mounts under ShareShell (outside AppShell), so it doesn't
  // inherit useMediaSync / project structure. Hydrate the media cache and
  // fetch the remote deck snapshot for cold loads on a fresh device.
  useEnsureProjectMedia(id)
  const { snapshot, loading } = useRemoteDeckSnapshot(id, !!localProject)

  // Render from the local project when present (authoring device), else from
  // the remote snapshot (fresh device). Both share the ShootDeckData shape.
  const project: ShootDeckData | null = localProject
    ? buildShootDeckData(localProject)
    : snapshot
      ? (snapshot.payload as unknown as ShootDeckData)
      : null

  if (!id || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-ink-muted">
          {loading ? 'Loading shared deck…' : 'This shared deck is no longer available.'}
        </p>
      </div>
    )
  }

  const sortedMoodboard = [...project.briefMoodboardItems].sort((a, b) => a.order - b.order)
  const sortedSlots = [...project.dayOfSlots].sort((a, b) => a.order - b.order)
  const sortedShots = [...project.shots].sort((a, b) => a.order - b.order)
  const bd = project.briefDetails

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Share header */}
      <div className="flex items-center justify-between mb-8 no-print pb-4 border-b border-surface-3">
        <div className="flex items-center gap-2">
          <span className="text-2xs font-bold uppercase tracking-widest bg-surface-2 text-ink-muted px-2 py-1 rounded">
            Shared view · Read only
          </span>
          <span className="text-sm text-ink-faint">Brand Workspace</span>
        </div>
        <button
          onClick={triggerPrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
        >
          <Printer size={13} /> Print
        </button>
      </div>

      <div className="print-area space-y-10">
        {/* Title */}
        <div className="border-b-2 border-ink pb-4">
          <p className="text-2xs font-bold uppercase tracking-[0.2em] text-ink-faint mb-1">Shoot Brief</p>
          <h1 className="text-3xl font-bold text-ink">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-ink-muted mt-1">{project.description}</p>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3">
            {bd.shootType && <Meta label="Type" value={bd.shootType} />}
            {bd.client && <Meta label="Client" value={bd.client} />}
            {bd.location && <Meta label="Location" value={bd.location} />}
            {(bd.callTime || bd.wrapTime) && (
              <Meta label="Call / Wrap" value={`${bd.callTime || '—'} → ${bd.wrapTime || '—'}`} />
            )}
          </div>
        </div>

        {/* Moodboard */}
        {sortedMoodboard.length > 0 && (
          <section>
            <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">Moodboard</h2>
            <div className="grid grid-cols-4 gap-3">
              {sortedMoodboard.map((item) => (
                <BriefImage key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-10">
          {/* Left: brief text */}
          <div className="space-y-8">
            {BRIEF_SECTIONS.filter(({ key }) => {
              if (key === 'wardrobe')     return !!project.shootBrief[key] || (project.wardrobeImages?.length ?? 0) > 0
              if (key === 'hairAndMakeup') return !!project.shootBrief[key] || (project.hairAndMakeupImages?.length ?? 0) > 0
              return !!project.shootBrief[key]
            }).map(({ key, label }) => {
              const refImages =
                key === 'wardrobe'      ? (project.wardrobeImages ?? []) :
                key === 'hairAndMakeup' ? (project.hairAndMakeupImages ?? []) :
                []
              return (
                <section key={key}>
                  <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">{label}</h2>
                  {refImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {refImages.map((item) => <BriefImage key={item.id} item={item} />)}
                    </div>
                  )}
                  {project.shootBrief[key] && (
                    <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
                      {project.shootBrief[key]}
                    </p>
                  )}
                </section>
              )
            })}
          </div>

          {/* Right: shot list + schedule */}
          <div className="space-y-8">
            {sortedShots.length > 0 && (
              <section>
                <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">Shot List</h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-ink">
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-16">ID</th>
                      <th className="text-left text-xs font-semibold text-ink py-1.5">Shot name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedShots.map((shot) => <ShotRow key={shot.id} shot={shot} />)}
                  </tbody>
                </table>
              </section>
            )}

            {sortedSlots.length > 0 && (
              <section>
                <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
                  Day Schedule
                </h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-ink">
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-28">Time</th>
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4">Activity</th>
                      <th className="text-left text-xs font-semibold text-ink py-1.5 w-28">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSlots.map((slot) => <SlotRow key={slot.id} slot={slot} />)}
                  </tbody>
                </table>
              </section>
            )}
          </div>
        </div>

        {/* Crew */}
        {project.crewMembers.length > 0 && (
          <section>
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
                {project.crewMembers.map((m) => (
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

        {/* Models */}
        {project.models.length > 0 && (
          <section>
            <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">Models</h2>
            <div className="grid grid-cols-4 gap-4">
              {project.models.map((model) => <ModelCard key={model.id} model={model} />)}
            </div>
          </section>
        )}
      </div>
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
          : <div className="w-full h-full flex items-center justify-center text-ink-faint text-xs">No image</div>
        }
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
      <td className="py-1.5 pr-4 border-b border-surface-3 text-ink">{slot.activity}</td>
      <td className="py-1.5 border-b border-surface-3 text-ink-muted">{slot.owner || '—'}</td>
    </tr>
  )
}

function ModelCard({ model }: { model: Model }) {
  const url = useStoredImage(model.imageId || undefined)
  return (
    <div className="border border-surface-3 rounded overflow-hidden bg-white">
      <div className="w-full aspect-[3/4] bg-surface-1">
        {url
          ? <img src={url} alt={model.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-ink-faint text-xs">No photo</div>
        }
      </div>
      <div className="p-2">
        <p className="text-sm font-medium text-ink">{model.name}</p>
        {model.agency && <p className="text-xs text-ink-faint">{model.agency}</p>}
      </div>
    </div>
  )
}
