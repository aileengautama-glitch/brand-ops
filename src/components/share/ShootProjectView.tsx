/**
 * ShootProjectView — the scoped, read-only view of a shoot.
 *
 * This is the replacement for emailing a hundred-page deck: the same structured data
 * the app already runs on, rendered as a clean scrollable page with only the sections
 * the recipient should see. Used by both the internal overview (all sections) and the
 * external share link (section-scoped via the URL).
 *
 * Reads a ShootDeckData view-model, so it works from a local project or from a remote
 * deck snapshot — an external link opens on a device that has never seen the project.
 */
import { useStoredImage } from '@/hooks/useImageStorage'
import { durationLabel, compareByTimeThenOrder } from '@/lib/timeUtils'
import { formatDate, cn } from '@/lib/utils'
import { APPROVAL_STATUS_META, isResolved } from '@/lib/approvalEngine'
import { SHOT_STATUS_META, SHOT_PRIORITY_META, SHOT_FORMAT_LABELS, shotStatus } from '@/lib/shotMeta'
import type { ShareSectionKey } from '@/lib/shareSections'
import type { ShootDeckData } from '@/lib/deckSnapshot'
import type { MoodboardItem } from '@/types/common'

export default function ShootProjectView({
  data, sections,
}: {
  data: ShootDeckData
  sections: ShareSectionKey[]
}) {
  const on = (k: ShareSectionKey) => sections.includes(k)
  const bd = data.briefDetails
  const sb = data.shootBrief
  const slots = [...data.dayOfSlots].sort(compareByTimeThenOrder)
  const shots = [...data.shots].sort((a, b) => a.order - b.order)
  const moodboard = [...(data.moodboardItems?.length ? data.moodboardItems : data.briefMoodboardItems)]
    .sort((a, b) => a.order - b.order)
  const logistics = [...(data.logisticsItems ?? [])].sort((a, b) => a.order - b.order)
  const approvals = data.decisions ?? []
  const budgetItems = data.budgetItems ?? []

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="pb-5 border-b-2 border-ink">
        <p className="text-2xs font-bold uppercase tracking-[0.2em] text-ink-faint mb-1.5">Shoot</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">{data.name}</h1>
        {data.description && <p className="text-sm text-ink-muted mt-1">{data.description}</p>}
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm text-ink-muted">
          {bd.collection && <Meta label="Collection" value={bd.collection} />}
          {bd.shootType && <Meta label="Type" value={bd.shootType} />}
          {bd.shootDate && <Meta label="Date" value={bd.shootDate} />}
          {bd.location && <Meta label="Location" value={bd.location} />}
          {(bd.callTime || bd.wrapTime) && (
            <Meta label="Call / wrap" value={`${bd.callTime || '—'} → ${bd.wrapTime || '—'}`} />
          )}
        </div>
      </header>

      {on('brief') && (sb.overview || sb.campaignMessaging || sb.creativeDirection || sb.wardrobe || sb.hairAndMakeup || sb.nails || sb.locations) && (
        <Section title="Brief">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
            <Text label="Overview" value={sb.overview} />
            <Text label="Campaign messaging" value={sb.campaignMessaging} />
            <Text label="Creative direction" value={sb.creativeDirection} />
            <Text label="Styling" value={sb.wardrobe} />
            <Text label="Hair & make-up" value={sb.hairAndMakeup} />
            <Text label="Nails (fingers & toes)" value={sb.nails} />
            <Text label="Location" value={sb.locations} />
            <Text label="Notes" value={sb.additionalNotes} />
          </div>
        </Section>
      )}

      {on('moodboard') && moodboard.length > 0 && (
        <Section title="Moodboard">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {moodboard.map((m) => <Thumb key={m.id} item={m} />)}
          </div>
        </Section>
      )}

      {on('crew') && (data.crewMembers.length > 0 || data.models.length > 0) && (
        <Section title="Crew & talent">
          {data.crewMembers.length > 0 && (
            <Table head={['Name', 'Role', 'Contact']}
              rows={data.crewMembers.map((m) => [m.name, m.role, m.contact || '—'])} />
          )}
          {data.models.length > 0 && (
            <div className="mt-4">
              <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-1.5">Talent</p>
              <Table head={['Name', 'Agency', 'Mobile', 'Flight / travel']}
                rows={data.models.map((m) => [m.name, m.agency || '—', m.mobile || '—', m.flightTimes || '—'])} />
            </div>
          )}
        </Section>
      )}

      {on('schedule') && slots.length > 0 && (
        <Section title="Run of day">
          <Table
            head={['Time', 'Duration', 'To do', 'PIC', 'Note']}
            rows={slots.map((s) => [
              [s.timeStart, s.timeEnd].filter(Boolean).join(' – ') || '—',
              durationLabel(s.timeStart, s.timeEnd) || '—',
              s.activity, s.owner || '—', s.notes || '—',
            ])}
          />
        </Section>
      )}

      {on('shotlist') && shots.length > 0 && (
        <Section title="Shot list">
          <div className="space-y-1.5">
            {shots.map((s) => (
              <div key={s.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-surface-3 pb-1.5">
                <span className="font-mono text-xs text-ink-secondary shrink-0">{s.shotId || '—'}</span>
                <span className="text-sm text-ink font-medium">{s.name}</span>
                {s.location && <span className="text-2xs text-ink-faint">{s.location}</span>}
                {s.priority && (
                  <span className={cn('text-2xs px-1.5 rounded border', SHOT_PRIORITY_META[s.priority].chip)}>
                    {SHOT_PRIORITY_META[s.priority].label}
                  </span>
                )}
                {s.format && <span className="text-2xs text-ink-faint">{SHOT_FORMAT_LABELS[s.format]}</span>}
                <span className={cn('text-2xs px-1.5 rounded border ml-auto', SHOT_STATUS_META[shotStatus(s)].chip)}>
                  {SHOT_STATUS_META[shotStatus(s)].label}
                </span>
                {s.description && <p className="w-full text-xs text-ink-muted">{s.description}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {on('styling') && (data.stylings ?? []).length > 0 && (
        <Section title="Styling">
          <Table
            head={['Code', 'Shot in', 'Products', 'Models']}
            rows={(data.stylings ?? []).map((st) => [
              st.stylingCode || '—',
              st.name || '—',
              String(st.productIds?.length ?? 0),
              st.modelIds.map((mid) => data.models.find((m) => m.id === mid)?.name).filter(Boolean).join(', ') || '—',
            ])}
          />
        </Section>
      )}

      {on('callsheet') && data.callSheet && (
        <Section title="Call sheet — getting there & on site">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
            <Text label="Parking" value={data.callSheet.parking} />
            <Text label="Water" value={data.callSheet.waterInstruction} />
            <Text label="On-site contact" value={data.callSheet.onSiteContact} />
            <Text label="Nearest hospital" value={data.callSheet.hospital} />
            <Text label="Emergency contacts" value={data.callSheet.emergencyContacts} />
            <Text label="Notes" value={data.callSheet.notes} />
          </div>
        </Section>
      )}

      {on('logistics') && logistics.length > 0 && (
        <Section title="What to bring · who brings it">
          <Table
            head={['Item', 'Who', 'Vehicle', 'Time', 'Notes']}
            rows={logistics.map((l) => [l.item || '—', l.who || '—', l.vehicle || '—', l.time || '—', l.notes || '—'])}
          />
        </Section>
      )}

      {on('checklist') && (data.checklistItems ?? []).length > 0 && (
        <Section title="Pre-production checklist">
          {(() => {
            const items = data.checklistItems ?? []
            const done = items.filter((i) => i.done).length
            return (
              <>
                <p className="text-xs text-ink-muted mb-2">{done} / {items.length} done</p>
                <div className="space-y-0.5">
                  {items.slice().sort((a, b) => a.order - b.order).map((i) => (
                    <div key={i.id} className="flex items-baseline gap-2 text-sm">
                      <span className={cn('shrink-0', i.done ? 'text-accent' : 'text-ink-faint')}>{i.done ? '✓' : '○'}</span>
                      <span className={cn(i.done ? 'text-ink-faint line-through' : 'text-ink')}>{i.label}</span>
                      {i.owner && <span className="text-2xs text-ink-faint ml-auto shrink-0">{i.owner}</span>}
                    </div>
                  ))}
                </div>
              </>
            )
          })()}
        </Section>
      )}

      {on('budget') && (budgetItems.length > 0 || data.totalBudget > 0) && (
        <Section title="Budget">
          <p className="text-sm text-ink-muted mb-2">
            Envelope <span className="font-medium text-ink">${(data.totalBudget ?? 0).toLocaleString()}</span>
            {' · '}Quoted <span className="font-medium text-ink">${budgetItems.reduce((s, b) => s + (b.estimatedCost || 0), 0).toLocaleString()}</span>
            {' · '}Actual <span className="font-medium text-ink">${budgetItems.reduce((s, b) => s + (b.actualCost || 0), 0).toLocaleString()}</span>
          </p>
          {budgetItems.length > 0 && (
            <Table
              head={['Item', 'Category', 'Quoted', 'Actual', 'Status']}
              rows={budgetItems.map((b) => [
                b.description || '—', b.category || '—',
                `$${(b.estimatedCost || 0).toLocaleString()}`,
                `$${(b.actualCost || 0).toLocaleString()}`,
                b.status,
              ])}
            />
          )}
        </Section>
      )}

      {on('approvals') && approvals.length > 0 && (
        <Section title="Approvals">
          <div className="space-y-1.5">
            {approvals.map((a) => {
              const meta = APPROVAL_STATUS_META[a.status] ?? APPROVAL_STATUS_META.open
              return (
                <div key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-surface-3 pb-1.5">
                  <span className={cn('text-2xs px-1.5 rounded border shrink-0', meta.chip)}>{meta.label}</span>
                  <span className="text-sm text-ink">{a.title}</span>
                  {a.costImpact && <span className="text-2xs text-ink-muted">{a.costImpact}</span>}
                  <span className="text-2xs text-ink-faint ml-auto">
                    {isResolved(a.status)
                      ? `${a.decidedBy || '—'}${a.decidedOn ? ` · ${formatDate(a.decidedOn)}` : ''}`
                      : a.neededBy ? `needed by ${formatDate(a.neededBy)}` : ''}
                  </span>
                  {a.outcome && <p className="w-full text-xs text-ink-muted">{a.outcome}</p>}
                </div>
              )
            })}
          </div>
        </Section>
      )}
    </div>
  )
}

// ─── Bits ─────────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="no-page-break">
      <h2 className="text-2xs font-bold uppercase tracking-[0.16em] text-ink-faint mb-2.5">{title}</h2>
      {children}
    </section>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return <span><span className="text-ink-faint">{label}</span> · {value}</span>
}

function Text({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div>
      <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-0.5">{label}</p>
      <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  )
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse min-w-[420px]">
        <thead>
          <tr className="border-b-2 border-surface-3">
            {head.map((h) => (
              <th key={h} className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint pb-1.5 pr-4">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-surface-3/50">
              {r.map((c, j) => <td key={j} className="py-1.5 pr-4 text-ink align-top">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Thumb({ item }: { item: MoodboardItem }) {
  const url = useStoredImage(item.imageId || undefined)
  return (
    <div className="space-y-1">
      <div className="w-full aspect-[4/3] bg-surface-1 border border-surface-3 rounded overflow-hidden">
        {url
          ? <img src={url} alt={item.caption || ''} className="w-full h-full object-cover" />
          : <div className="w-full h-full" />}
      </div>
      {item.caption && <p className="text-2xs text-ink-muted leading-snug">{item.caption}</p>}
    </div>
  )
}
