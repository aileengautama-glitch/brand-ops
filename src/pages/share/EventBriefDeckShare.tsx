/**
 * Read-only shareable view of the Event Brief Deck.
 * Accessible at /share/event/:id/brief-deck — no sidebar, no editing controls.
 */
import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { useEventStore } from '@/store/useEventStore'
import { useStoredImage } from '@/hooks/useImageStorage'
import { useEnsureProjectMedia } from '@/hooks/useMediaSync'
import { useRemoteDeckSnapshot } from '@/hooks/useRemoteDeckSnapshot'
import { buildEventDeckData, type EventDeckData } from '@/lib/deckSnapshot'
import { usePrint } from '@/hooks/usePrint'
import { formatDate } from '@/lib/utils'
import type { TimelineMilestone, DayOfSlot, MoodboardItem } from '@/types/event'

export default function EventBriefDeckShare() {
  const { id } = useParams<{ id: string }>()
  const localProject = useEventStore((s) => s.projects.find((p) => p.id === id))
  const triggerPrint = usePrint('landscape')

  // This route mounts under ShareShell (outside AppShell), so it doesn't
  // inherit useMediaSync / project structure. Hydrate the media cache and
  // fetch the remote deck snapshot for cold loads on a fresh device.
  useEnsureProjectMedia(id)
  const { snapshot, loading } = useRemoteDeckSnapshot(id, !!localProject)

  // Render from the local project when present (authoring device), else from
  // the remote snapshot (fresh device). Both share the EventDeckData shape.
  const project: EventDeckData | null = localProject
    ? buildEventDeckData(localProject)
    : snapshot
      ? (snapshot.payload as unknown as EventDeckData)
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

  const sortedMoodboard = [...project.moodboardItems].sort((a, b) => a.order - b.order)
  const sortedMilestones = [...project.milestones].sort((a, b) => a.order - b.order)
  const sortedSlots = [...project.dayOfSlots].sort((a, b) => a.order - b.order)
  const keyContacts = project.teamMembers.slice(0, 5)
  const roster = project.staffRoster ?? []

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
          <p className="text-2xs font-bold uppercase tracking-[0.2em] text-ink-faint mb-1">Event Brief</p>
          <h1 className="text-3xl font-bold text-ink">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-ink-muted mt-1">{project.description}</p>
          )}
        </div>

        {/* Moodboard */}
        {sortedMoodboard.length > 0 && (
          <section>
            <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">Moodboard</h2>
            <div className="grid grid-cols-4 gap-3">
              {sortedMoodboard.map((item) => (
                <MoodboardImage key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-10">
          {/* Left */}
          <div className="space-y-8">
            <section>
              <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
                Event Information
              </h2>
              <div className="space-y-0">
                <InfoRow label="Event date" value={project.eventDate ? formatDate(project.eventDate) : '—'} />
                <InfoRow label="Venue" value={project.venue || '—'} />
                <InfoRow label="Run time" value={project.runTime || '—'} />
              </div>
            </section>

            {keyContacts.length > 0 && (
              <section>
                <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
                  Key Contacts
                </h2>
                <div className="space-y-1.5">
                  {keyContacts.map((m) => (
                    <div key={m.id} className="flex gap-3 text-sm">
                      <span className="font-medium text-ink w-36 shrink-0">{m.name}</span>
                      <span className="text-ink-muted w-32 shrink-0">{m.role}</span>
                      <span className="text-ink-faint text-xs">{m.contact}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {sortedMilestones.length > 0 && (
              <section>
                <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
                  Key Milestones
                </h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-ink">
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-32">Date</th>
                      <th className="text-left text-xs font-semibold text-ink py-1.5">Milestone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMilestones.map((m) => <MilestoneRow key={m.id} milestone={m} />)}
                  </tbody>
                </table>
              </section>
            )}
          </div>

          {/* Right */}
          <div className="space-y-8">
            {sortedSlots.length > 0 && (
              <section>
                <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
                  Day-of Schedule
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
                    {sortedSlots.map((slot) => <ScheduleRow key={slot.id} slot={slot} />)}
                  </tbody>
                </table>
              </section>
            )}

            {roster.length > 0 && (
              <section>
                <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
                  Staff Roster
                </h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-ink">
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-40">Name</th>
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-36">Role</th>
                      <th className="text-left text-xs font-semibold text-ink py-1.5">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((entry) => (
                      <tr key={entry.id}>
                        <td className="py-1.5 pr-4 border-b border-surface-3 font-medium text-ink">{entry.name || '—'}</td>
                        <td className="py-1.5 pr-4 border-b border-surface-3 text-ink-muted">{entry.role || '—'}</td>
                        <td className="py-1.5 border-b border-surface-3 text-ink-faint text-xs">
                          {entry.hoursStart && entry.hoursEnd
                            ? `${entry.hoursStart} – ${entry.hoursEnd}`
                            : entry.hoursStart || entry.hoursEnd || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm border-b border-surface-3 pb-1.5 mb-1.5">
      <span className="text-ink-faint w-28 shrink-0">{label}</span>
      <span className="text-ink font-medium">{value}</span>
    </div>
  )
}

function MilestoneRow({ milestone }: { milestone: TimelineMilestone }) {
  return (
    <tr>
      <td className="py-1.5 pr-4 border-b border-surface-3 text-ink-secondary whitespace-nowrap">
        {milestone.date ? formatDate(milestone.date) : '—'}
      </td>
      <td className="py-1.5 border-b border-surface-3 font-medium text-ink">{milestone.title}</td>
    </tr>
  )
}

function ScheduleRow({ slot }: { slot: DayOfSlot }) {
  const timeStr = [slot.timeStart, slot.timeEnd].filter(Boolean).join(' – ')
  return (
    <tr>
      <td className="py-1.5 pr-4 border-b border-surface-3 text-ink-secondary whitespace-nowrap">{timeStr || '—'}</td>
      <td className="py-1.5 pr-4 border-b border-surface-3 text-ink">{slot.activity}</td>
      <td className="py-1.5 border-b border-surface-3 text-ink-muted">{slot.owner || '—'}</td>
    </tr>
  )
}

function MoodboardImage({ item }: { item: MoodboardItem }) {
  const url = useStoredImage(item.imageId || undefined)
  if (!url) return null
  return (
    <div className="space-y-1">
      <div className="aspect-square rounded overflow-hidden border border-surface-3 bg-surface-1">
        <img src={url} alt={item.caption || 'Moodboard'} className="w-full h-full object-cover" />
      </div>
      {item.caption && <p className="text-2xs text-ink-faint truncate">{item.caption}</p>}
    </div>
  )
}
