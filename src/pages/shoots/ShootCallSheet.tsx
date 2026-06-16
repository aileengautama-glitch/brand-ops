import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { useCurrentShootProject } from '@/hooks/useCurrentProject'
import { usePrint } from '@/hooks/usePrint'

export default function ShootCallSheet() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentShootProject()

  const triggerPrint = usePrint('portrait')

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const details = project.briefDetails
  const dayOfSlots = [...project.dayOfSlots].sort((a, b) => a.order - b.order)

  return (
    <div className="print-page-wrapper p-6 max-w-4xl">
      {/* Toolbar — hidden on print */}
      <div className="flex items-center justify-between mb-8 no-print">
        <div>
          <h1 className="text-lg font-semibold text-ink">{project.name}</h1>
          <p className="text-xs text-ink-muted mt-0.5">Call Sheet</p>
        </div>
        <button
          onClick={triggerPrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors"
        >
          <Printer size={13} /> Print / Export
        </button>
      </div>

      {/* ── Print area ─────────────────────────────────────────────────────── */}
      <div className="print-area space-y-8">

        {/* Main header */}
        <div className="pb-6 border-b-2 border-ink">
          <p className="text-2xs font-bold uppercase tracking-[0.2em] text-ink-faint mb-2">Call Sheet</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink mb-1">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-ink-muted">{project.description}</p>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 text-sm text-ink-muted">
            {details.client && <span><span className="text-ink-faint">Client</span> · {details.client}</span>}
            {details.shootType && <span><span className="text-ink-faint">Type</span> · {details.shootType}</span>}
            {details.location && <span><span className="text-ink-faint">Location</span> · {details.location}</span>}
            {details.concept && <span><span className="text-ink-faint">Concept</span> · {details.concept}</span>}
          </div>
        </div>

        {/* Call times — prominent info block */}
        {(details.callTime || details.wrapTime) && (
          <div className="grid grid-cols-2 gap-6">
            {details.callTime && (
              <div className="bg-surface-1 rounded-lg p-4">
                <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-1">Call Time</p>
                <p className="text-2xl font-bold text-ink">{details.callTime}</p>
              </div>
            )}
            {details.wrapTime && (
              <div className="bg-surface-1 rounded-lg p-4">
                <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-1">Wrap Time</p>
                <p className="text-2xl font-bold text-ink">{details.wrapTime}</p>
              </div>
            )}
          </div>
        )}

        {/* Crew */}
        {project.crewMembers.length > 0 && (
          <Section title="Crew">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-surface-3">
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th>Contact</Th>
                  <Th>Notes</Th>
                </tr>
              </thead>
              <tbody>
                {project.crewMembers.map((m) => (
                  <tr key={m.id} className="border-b border-surface-3/40">
                    <Td className="font-medium py-2.5">{m.name}</Td>
                    <Td className="py-2.5">{m.role}</Td>
                    <Td className="py-2.5">{m.contact || '—'}</Td>
                    <Td className="text-ink-muted py-2.5">{m.notes || '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Models */}
        {project.models.length > 0 && (
          <Section title="Talent / Models">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-surface-3">
                  <Th>Name</Th>
                  <Th>Agency</Th>
                  <Th>Notes</Th>
                </tr>
              </thead>
              <tbody>
                {project.models.map((m) => (
                  <tr key={m.id} className="border-b border-surface-3/40">
                    <Td className="font-medium py-2.5">{m.name}</Td>
                    <Td className="py-2.5">{m.agency || '—'}</Td>
                    <Td className="text-ink-muted py-2.5">{m.notes || '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Day-of schedule */}
        {dayOfSlots.length > 0 && (
          <Section title="Day-of Schedule">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-surface-3">
                  <Th style={{ width: 120 }}>Time</Th>
                  <Th>Activity</Th>
                  <Th>Owner</Th>
                  <Th>Notes</Th>
                </tr>
              </thead>
              <tbody>
                {dayOfSlots.map((slot) => (
                  <tr key={slot.id} className="border-b border-surface-3/40">
                    <Td className="font-mono text-xs whitespace-nowrap py-2.5">
                      {slot.timeStart}{slot.timeEnd ? ` – ${slot.timeEnd}` : ''}
                    </Td>
                    <Td className="py-2.5">{slot.activity}</Td>
                    <Td className="py-2.5 text-ink-muted">{slot.owner || '—'}</Td>
                    <Td className="text-ink-muted py-2.5">{slot.notes || '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="no-page-break space-y-3">
      <h2 className="text-2xs font-bold uppercase tracking-[0.18em] text-ink-faint">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Th({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint pb-2 pr-6" style={style}>
      {children}
    </th>
  )
}

function Td({ children, className = '', style }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <td className={`pr-6 text-ink ${className}`} style={style}>
      {children}
    </td>
  )
}
