import { useParams } from 'react-router-dom'
import { Printer, Plus, Trash2 } from 'lucide-react'
import { useEventStore } from '@/store/useEventStore'
import { useCurrentEventProject } from '@/hooks/useCurrentProject'
import PageSection from '@/components/layout/PageSection'
import MoodboardGrid from '@/components/creative/MoodboardGrid'
import CopyShareLinkButton from '@/components/ui/CopyShareLinkButton'
import { usePrint } from '@/hooks/usePrint'
import { formatDate } from '@/lib/utils'
import type { BriefRosterEntry, TimelineMilestone, DayOfSlot } from '@/types/event'

export default function EventBriefDeck() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentEventProject()
  const addMoodboardItem = useEventStore((s) => s.addMoodboardItem)
  const updateMoodboardItem = useEventStore((s) => s.updateMoodboardItem)
  const removeMoodboardItem = useEventStore((s) => s.removeMoodboardItem)
  const addRosterEntry = useEventStore((s) => s.addRosterEntry)
  const updateRosterEntry = useEventStore((s) => s.updateRosterEntry)
  const removeRosterEntry = useEventStore((s) => s.removeRosterEntry)

  const triggerPrint = usePrint('landscape')

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const roster = project.staffRoster ?? []
  const keyContacts = project.teamMembers.slice(0, 5)
  const sortedMilestones = [...project.milestones].sort((a, b) => a.order - b.order)
  const sortedSlots = [...project.dayOfSlots].sort((a, b) => a.order - b.order)

  return (
    <div className="print-page-wrapper p-6 max-w-6xl">
      {/* Header bar (hidden when printing) */}
      <div className="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 className="text-lg font-bold text-ink">Event Brief Deck</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Auto-populated from project data. All fields are editable before printing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CopyShareLinkButton module="event" projectId={id} deckType="brief-deck" />
          <button
            onClick={triggerPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
          >
            <Printer size={13} /> Print / Export
          </button>
        </div>
      </div>

      {/* ── PRINT-FRIENDLY CONTENT ─────────────────────────────────────── */}
      <div className="print-area space-y-10">

        {/* Document title */}
        <div className="border-b-2 border-ink pb-4">
          <p className="text-2xs font-bold uppercase tracking-[0.2em] text-ink-faint mb-1">Event Brief</p>
          <h2 className="text-3xl font-bold text-ink">{project.name}</h2>
          {project.description && (
            <p className="text-sm text-ink-muted mt-1">{project.description}</p>
          )}
        </div>

        {/* ── Moodboard ────────────────────────────────────────────────── */}
        <PageSection label="Moodboard">
          {project.moodboardItems.length === 0 ? (
            <p className="text-sm text-ink-faint no-print">
              No moodboard images yet — add them on the Creative page, or upload directly here.
            </p>
          ) : null}
          <MoodboardGrid
            items={project.moodboardItems}
            onAdd={(imageId, caption) => addMoodboardItem(id, { imageId, caption })}
            onUpdate={(mid, patch) => updateMoodboardItem(id, mid, patch)}
            onRemove={(mid) => removeMoodboardItem(id, mid)}
          />
        </PageSection>

        {/* ── Two-column content grid ───────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-10">

          {/* Left column */}
          <div className="space-y-10">
            {/* Operations key information */}
            <section>
              <h3 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
                Operations Key Information
              </h3>
              <div className="space-y-0">
                <InfoRow label="Event date" value={project.eventDate ? formatDate(project.eventDate) : '—'} />
                <InfoRow label="Venue" value={project.venue || '—'} />
                <InfoRow label="Run time" value={project.runTime || '—'} />
                <InfoRow label="Total budget" value={project.totalBudget > 0 ? `$${project.totalBudget.toLocaleString()}` : '—'} />
              </div>

              {keyContacts.length > 0 && (
                <div className="mt-4">
                  <p className="text-2xs font-bold uppercase tracking-[0.12em] text-ink-faint mb-2">
                    Key Contacts
                  </p>
                  <div className="space-y-1.5">
                    {keyContacts.map((m) => (
                      <div key={m.id} className="flex gap-3 text-sm">
                        <span className="font-medium text-ink w-36 shrink-0">{m.name}</span>
                        <span className="text-ink-muted w-32 shrink-0">{m.role}</span>
                        <span className="text-ink-faint text-xs">{m.contact}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Key milestones */}
            {sortedMilestones.length > 0 && (
              <section className="no-page-break">
                <h3 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
                  Key Milestones
                </h3>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-ink">
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-32">Date</th>
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4">Milestone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMilestones.map((m) => (
                      <MilestoneRow key={m.id} milestone={m} />
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-10">
            {/* Day-of schedule */}
            {sortedSlots.length > 0 && (
              <section className="no-page-break">
                <h3 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
                  Day-of Schedule
                </h3>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-ink">
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-28">Time</th>
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4">Activity</th>
                      <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-32">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSlots.map((slot) => (
                      <SlotRow key={slot.id} slot={slot} />
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* Staff roster */}
            <section className="no-page-break">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">
                  Staff Roster
                </h3>
                <button
                  onClick={() => addRosterEntry(id)}
                  className="no-print flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors"
                >
                  <Plus size={11} /> Add row
                </button>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-ink">
                    <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-40">Staff name</th>
                    <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-40">Role</th>
                    <th className="text-left text-xs font-semibold text-ink py-1.5 pr-4 w-32">Rostered hours</th>
                    <th className="w-8 no-print" />
                  </tr>
                </thead>
                <tbody>
                  {roster.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 text-sm text-ink-faint no-print">
                        No roster entries — click "Add row" to add staff.
                      </td>
                    </tr>
                  ) : (
                    roster.map((entry) => (
                      <RosterRow
                        key={entry.id}
                        entry={entry}
                        onUpdate={(patch) => updateRosterEntry(id, entry.id, patch)}
                        onRemove={() => removeRosterEntry(id, entry.id)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </section>
          </div>

        </div>

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MilestoneRow({ milestone }: { milestone: TimelineMilestone }) {
  return (
    <tr>
      <td className="py-1.5 pr-4 border-b border-surface-3 text-ink-secondary whitespace-nowrap">
        {milestone.date ? formatDate(milestone.date) : '—'}
      </td>
      <td className="py-1.5 pr-4 border-b border-surface-3 font-medium text-ink">{milestone.title}</td>
      <td className="py-1.5 border-b border-surface-3 text-ink-muted text-xs">{milestone.description || '—'}</td>
    </tr>
  )
}

function SlotRow({ slot }: { slot: DayOfSlot }) {
  const timeStr = [slot.timeStart, slot.timeEnd].filter(Boolean).join(' – ')
  return (
    <tr>
      <td className="py-1.5 pr-4 border-b border-surface-3 text-ink-secondary whitespace-nowrap">{timeStr || '—'}</td>
      <td className="py-1.5 pr-4 border-b border-surface-3 text-ink">{slot.activity}</td>
      <td className="py-1.5 pr-4 border-b border-surface-3 text-ink-muted">{slot.owner || '—'}</td>
      <td className="py-1.5 border-b border-surface-3 text-ink-faint text-xs">{slot.notes || '—'}</td>
    </tr>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm border-b border-surface-3 pb-1.5">
      <span className="text-ink-faint w-28 shrink-0">{label}</span>
      <span className="text-ink font-medium">{value}</span>
    </div>
  )
}

function RosterRow({
  entry,
  onUpdate,
  onRemove,
}: {
  entry: BriefRosterEntry
  onUpdate: (patch: Partial<BriefRosterEntry>) => void
  onRemove: () => void
}) {
  const cell = 'py-1.5 pr-4 border-b border-surface-3'
  const cellInput = 'w-full bg-transparent text-sm text-ink focus:outline-none focus:bg-white border border-transparent focus:border-surface-3 rounded px-1 py-0.5'

  return (
    <tr className="group hover:bg-surface-1/30 transition-colors">
      <td className={cell}>
        <input type="text" value={entry.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Name" className={cellInput} />
      </td>
      <td className={cell}>
        <input type="text" value={entry.role}
          onChange={(e) => onUpdate({ role: e.target.value })}
          placeholder="Role" className={cellInput} />
      </td>
      <td className={cell}>
        <div className="flex items-center gap-1 text-sm">
          <input type="time" value={entry.hoursStart}
            onChange={(e) => onUpdate({ hoursStart: e.target.value })}
            className={`${cellInput} w-24`} />
          <span className="text-ink-faint">–</span>
          <input type="time" value={entry.hoursEnd}
            onChange={(e) => onUpdate({ hoursEnd: e.target.value })}
            className={`${cellInput} w-24`} />
        </div>
      </td>
      <td className={`${cell} no-print`}>
        <button onClick={onRemove}
          className="p-0.5 text-ink-faint hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
          <Trash2 size={12} />
        </button>
      </td>
    </tr>
  )
}
