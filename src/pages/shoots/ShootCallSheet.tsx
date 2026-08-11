import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Printer, Plus, Trash2 } from 'lucide-react'
import { useCurrentShootProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useShootStore } from '@/store/useShootStore'
import { usePrint } from '@/hooks/usePrint'
import { DEFAULT_WATER_INSTRUCTION } from '@/types/shoot'

/**
 * Call sheet — the document the crew actually works from.
 *
 * Parking, direct talent mobiles, flight times, dietaries, the water instruction and
 * a who-brings-what table are present BY DEFAULT rather than being optional extras:
 * every one of them was a real on-set failure. Fields are editable inline and print
 * with their values (same pattern as the D-Day table).
 */
export default function ShootCallSheet() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentShootProject()
  const { canEdit } = useCurrentUser()

  const updateCallSheet = useShootStore((s) => s.updateCallSheet)
  const updateModel = useShootStore((s) => s.updateModel)
  const updateCrewMember = useShootStore((s) => s.updateCrewMember)
  const addLogisticsItem = useShootStore((s) => s.addLogisticsItem)
  const updateLogisticsItem = useShootStore((s) => s.updateLogisticsItem)
  const removeLogisticsItem = useShootStore((s) => s.removeLogisticsItem)
  const seedLogisticsDefaults = useShootStore((s) => s.seedLogisticsDefaults)

  const triggerPrint = usePrint('portrait')

  // Legacy projects have no logistics rows — seed the defaults once so the
  // who-brings-what table is never simply absent.
  useEffect(() => {
    if (id && project && (project.logisticsItems?.length ?? 0) === 0) seedLogisticsDefaults(id)
  }, [id, project?.logisticsItems?.length, seedLogisticsDefaults, project])

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const readOnly = !canEdit('shoot.callsheet', id)
  const details = project.briefDetails
  const cs = project.callSheet
  const dayOfSlots = [...project.dayOfSlots].sort((a, b) => a.order - b.order)
  const logistics = [...(project.logisticsItems ?? [])].sort((a, b) => a.order - b.order)
  const dietaries = [
    ...project.crewMembers.map((m) => ({ id: m.id, name: m.name, role: m.role, dietary: m.dietary ?? '', kind: 'crew' as const })),
    ...project.models.map((m) => ({ id: m.id, name: m.name, role: m.agency || 'Talent', dietary: m.dietary ?? '', kind: 'model' as const })),
  ]

  const setDietary = (kind: 'crew' | 'model', pid: string, v: string) =>
    kind === 'crew' ? updateCrewMember(id, pid, { dietary: v }) : updateModel(id, pid, { dietary: v })

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
            {details.shootDate && <span><span className="text-ink-faint">Date</span> · {details.shootDate}</span>}
            {details.location && <span><span className="text-ink-faint">Location</span> · {details.location}</span>}
          </div>
        </div>

        {/* Call times */}
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

        {/* ── Logistics & safety — always present ─────────────────────────── */}
        <Section title="Getting There & On-Site">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Field label="Parking" hint="Paid options, rates, pre-booking needed?"
              value={cs?.parking ?? ''} readOnly={readOnly}
              onChange={(v) => updateCallSheet(id, { parking: v })} multiline />
            <Field label="Water" hint="BYO instruction"
              value={cs?.waterInstruction ?? DEFAULT_WATER_INSTRUCTION} readOnly={readOnly}
              onChange={(v) => updateCallSheet(id, { waterInstruction: v })} multiline />
            <Field label="On-site contact" hint="Who owns problems on the day"
              value={cs?.onSiteContact ?? ''} readOnly={readOnly}
              onChange={(v) => updateCallSheet(id, { onSiteContact: v })} />
            <Field label="Nearest hospital" value={cs?.hospital ?? ''} readOnly={readOnly}
              onChange={(v) => updateCallSheet(id, { hospital: v })} />
            <Field label="Emergency contacts" value={cs?.emergencyContacts ?? ''} readOnly={readOnly}
              onChange={(v) => updateCallSheet(id, { emergencyContacts: v })} multiline />
            <Field label="Notes" value={cs?.notes ?? ''} readOnly={readOnly}
              onChange={(v) => updateCallSheet(id, { notes: v })} multiline />
          </div>
        </Section>

        {/* ── What to bring / who brings it ────────────────────────────────── */}
        <Section
          title="What To Bring · Who Brings It"
          action={!readOnly && (
            <button
              onClick={() => addLogisticsItem(id, { item: '', who: '', vehicle: '', time: '', notes: '' })}
              className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors no-print"
            >
              <Plus size={12} /> Add item
            </button>
          )}
        >
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-surface-3">
                <Th style={{ width: '26%' }}>Item</Th>
                <Th style={{ width: '20%' }}>Who</Th>
                <Th style={{ width: '18%' }}>Vehicle</Th>
                <Th style={{ width: '14%' }}>Time</Th>
                <Th>Notes</Th>
                {!readOnly && <Th style={{ width: 24 }}><span className="no-print" /></Th>}
              </tr>
            </thead>
            <tbody>
              {logistics.map((l) => (
                <tr key={l.id} className="border-b border-surface-3/40">
                  <Td className="py-1.5"><Cell value={l.item} readOnly={readOnly} onChange={(v) => updateLogisticsItem(id, l.id, { item: v })} className="font-medium" /></Td>
                  <Td className="py-1.5"><Cell value={l.who} readOnly={readOnly} placeholder="—" onChange={(v) => updateLogisticsItem(id, l.id, { who: v })} /></Td>
                  <Td className="py-1.5"><Cell value={l.vehicle} readOnly={readOnly} placeholder="—" onChange={(v) => updateLogisticsItem(id, l.id, { vehicle: v })} /></Td>
                  <Td className="py-1.5"><Cell value={l.time} readOnly={readOnly} placeholder="—" onChange={(v) => updateLogisticsItem(id, l.id, { time: v })} /></Td>
                  <Td className="py-1.5"><Cell value={l.notes} readOnly={readOnly} placeholder="—" onChange={(v) => updateLogisticsItem(id, l.id, { notes: v })} /></Td>
                  {!readOnly && (
                    <Td className="py-1.5">
                      <button onClick={() => removeLogisticsItem(id, l.id)}
                        className="p-0.5 text-ink-faint hover:text-red-500 transition-colors no-print">
                        <Trash2 size={11} />
                      </button>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Crew */}
        {project.crewMembers.length > 0 && (
          <Section title="Crew">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-surface-3">
                  <Th>Name</Th><Th>Role</Th><Th>Contact</Th><Th>Notes</Th>
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

        {/* Talent — direct mobiles + flight times */}
        {project.models.length > 0 && (
          <Section title="Talent / Models">
            <p className="text-2xs text-ink-faint mb-1.5">
              Direct mobiles are required — agents are unreachable on early calls.
            </p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-surface-3">
                  <Th>Name</Th><Th>Agency</Th><Th>Direct mobile</Th><Th>Flight / travel</Th>
                </tr>
              </thead>
              <tbody>
                {project.models.map((m) => (
                  <tr key={m.id} className="border-b border-surface-3/40">
                    <Td className="font-medium py-2">{m.name}</Td>
                    <Td className="py-2">{m.agency || '—'}</Td>
                    <Td className="py-2">
                      <Cell value={m.mobile ?? ''} readOnly={readOnly} placeholder="Add mobile"
                        onChange={(v) => updateModel(id, m.id, { mobile: v })} />
                    </Td>
                    <Td className="py-2">
                      <Cell value={m.flightTimes ?? ''} readOnly={readOnly} placeholder="—"
                        onChange={(v) => updateModel(id, m.id, { flightTimes: v })} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Dietaries — crew + talent in one table so catering can be ordered */}
        {dietaries.length > 0 && (
          <Section title="Dietary Requirements">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-surface-3">
                  <Th style={{ width: '30%' }}>Name</Th>
                  <Th style={{ width: '25%' }}>Role / Agency</Th>
                  <Th>Dietary requirement</Th>
                </tr>
              </thead>
              <tbody>
                {dietaries.map((p) => (
                  <tr key={`${p.kind}-${p.id}`} className="border-b border-surface-3/40">
                    <Td className="font-medium py-2">{p.name}</Td>
                    <Td className="py-2 text-ink-muted">{p.role || '—'}</Td>
                    <Td className="py-2">
                      <Cell value={p.dietary} readOnly={readOnly} placeholder="None / not collected"
                        onChange={(v) => setDietary(p.kind, p.id, v)} />
                    </Td>
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
                  <Th style={{ width: 120 }}>Time</Th><Th>Activity</Th><Th>Owner</Th><Th>Notes</Th>
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

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="no-page-break space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xs font-bold uppercase tracking-[0.18em] text-ink-faint">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

/** Labelled block used by the logistics grid. */
function Field({
  label, hint, value, onChange, readOnly, multiline,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  readOnly?: boolean
  multiline?: boolean
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">{label}</p>
      {hint && <p className="text-2xs text-ink-faint no-print">{hint}</p>}
      {multiline ? (
        <textarea
          value={value} readOnly={readOnly} rows={2}
          onChange={(e) => onChange(e.target.value)}
          placeholder={readOnly ? '—' : 'Add detail…'}
          className="w-full text-sm bg-transparent border-b border-surface-3 focus:border-accent focus:outline-none py-0.5 text-ink placeholder:text-ink-faint resize-none leading-snug"
        />
      ) : (
        <input
          type="text" value={value} readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          placeholder={readOnly ? '—' : 'Add detail…'}
          className="w-full text-sm bg-transparent border-b border-surface-3 focus:border-accent focus:outline-none py-0.5 text-ink placeholder:text-ink-faint"
        />
      )}
    </div>
  )
}

/** Inline table cell input — prints its value like the D-Day table. */
function Cell({
  value, onChange, readOnly, placeholder, className = '',
}: {
  value: string
  onChange: (v: string) => void
  readOnly?: boolean
  placeholder?: string
  className?: string
}) {
  return (
    <input
      type="text" value={value} readOnly={readOnly} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-transparent text-sm text-ink focus:outline-none focus:bg-white rounded px-0.5 py-0.5 placeholder:text-ink-faint ${className}`}
    />
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
