import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Mail, ChevronDown, Trash2 } from 'lucide-react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { MagazineOutreachRepository } from '@/repositories'
import { useCurrentMagazineProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { FormField, inputCls } from '@/components/ui/FormField'
import { cn } from '@/lib/utils'
import type { OutreachContact, OutreachType, OutreachStatus } from '@/types/magazine'

// ─── Status / type configs ─────────────────────────────────────────────────────

const OUTREACH_STATUS_CONFIG: Record<OutreachStatus, { label: string; className: string }> = {
  prospecting: { label: 'Prospecting', className: 'bg-surface-3 text-ink-muted'  },
  contacted:   { label: 'Contacted',   className: 'bg-amber-100 text-amber-700'  },
  confirmed:   { label: 'Confirmed',   className: 'bg-green-100 text-green-700'  },
  declined:    { label: 'Declined',    className: 'bg-red-50 text-red-500'        },
}

const OUTREACH_TYPE_LABELS: Record<OutreachType, string> = {
  contributor:  'Contributor',
  photographer: 'Photographer',
  advertiser:   'Advertiser',
  stylist:      'Stylist',
  other:        'Other',
}

// ─── OutreachRow ───────────────────────────────────────────────────────────────

function OutreachRow({
  contact,
  onUpdate,
  onRemove,
  readOnly,
}: {
  contact: OutreachContact
  onUpdate: (patch: Partial<OutreachContact>) => void
  onRemove: () => void
  readOnly: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const statusCfg = OUTREACH_STATUS_CONFIG[contact.status]

  return (
    <>
      <div className={cn('border border-surface-3 rounded bg-white', expanded && 'shadow-sm')}>
        {/* Compact row */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-1/40 transition-colors"
          onClick={() => setExpanded((e) => !e)}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">{contact.name}</p>
            <p className="text-xs text-ink-faint">{OUTREACH_TYPE_LABELS[contact.type]}</p>
          </div>
          <span className={cn('text-2xs font-medium px-1.5 py-0.5 rounded shrink-0', statusCfg.className)}>
            {statusCfg.label}
          </span>
          {contact.fee && (
            <span className="text-2xs text-ink-faint shrink-0">{contact.fee}</span>
          )}
          <ChevronDown
            size={12}
            className={cn('text-ink-faint shrink-0 transition-transform', expanded && 'rotate-180')}
          />
        </div>

        {/* Expanded edit panel */}
        {expanded && (
          <div className="border-t border-surface-3 px-3 pb-3 pt-2.5 space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Name</label>
                <input
                  type="text" value={contact.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  disabled={readOnly}
                  className={cn(inputCls, readOnly && 'opacity-60')}
                />
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Type</label>
                <select
                  value={contact.type}
                  onChange={(e) => onUpdate({ type: e.target.value as OutreachType })}
                  disabled={readOnly}
                  className={cn(inputCls, readOnly && 'opacity-60')}
                >
                  {(Object.entries(OUTREACH_TYPE_LABELS) as [OutreachType, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Status</label>
                <select
                  value={contact.status}
                  onChange={(e) => onUpdate({ status: e.target.value as OutreachStatus })}
                  disabled={readOnly}
                  className={cn(inputCls, readOnly && 'opacity-60')}
                >
                  {(Object.entries(OUTREACH_STATUS_CONFIG) as [OutreachStatus, { label: string }][]).map(([v, c]) => (
                    <option key={v} value={v}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Fee / Rate</label>
                <input
                  type="text" value={contact.fee}
                  onChange={(e) => onUpdate({ fee: e.target.value })}
                  disabled={readOnly}
                  placeholder="e.g. €500/day, TBC"
                  className={cn(inputCls, readOnly && 'opacity-60')}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wide text-ink-faint block">Contact info</label>
              <input
                type="text" value={contact.contactInfo}
                onChange={(e) => onUpdate({ contactInfo: e.target.value })}
                disabled={readOnly}
                placeholder="Email · Phone · IG handle"
                className={cn(inputCls, readOnly && 'opacity-60')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wide text-ink-faint block">Notes</label>
              <textarea
                value={contact.notes}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                disabled={readOnly}
                rows={2} placeholder="Any notes…"
                className={cn(inputCls, 'resize-none', readOnly && 'opacity-60')}
              />
            </div>
            {!readOnly && (
              <div className="flex justify-end pt-1 border-t border-surface-3">
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={11} /> Delete contact
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete contact"
        message={`Delete "${contact.name}"?`}
        onConfirm={() => { onRemove(); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

// ─── Draft type ────────────────────────────────────────────────────────────────

type OutreachDraft = Omit<OutreachContact, 'id' | 'createdAt'>
const BLANK: OutreachDraft = {
  name: '', type: 'contributor', status: 'prospecting', contactInfo: '', fee: '',
  articleId: '', role: '',
  notes: '',
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MagazineOutreach() {
  const { id }             = useParams<{ id: string }>()
  const project            = useCurrentMagazineProject()
  const updateProject      = useMagazineStore((s) => s.updateProject)
  const addContact         = useMagazineStore((s) => s.addOutreachContact)
  const updateContact      = useMagazineStore((s) => s.updateOutreachContact)
  const removeContact      = useMagazineStore((s) => s.removeOutreachContact)
  const { canEdit }        = useCurrentUser()
  const readOnly           = !canEdit('magazine.outreach', id)

  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft]     = useState<OutreachDraft>(BLANK)

  // Phase 5C — Supabase-first read of this project's outreach contacts. Fetched once
  // per project; null = no Supabase answer (disabled / non-UUID / error / no rows).
  const [remoteOutreach, setRemoteOutreach] = useState<OutreachContact[] | null>(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    MagazineOutreachRepository.list(id).then((rows) => {
      if (!cancelled) setRemoteOutreach(rows)
    })
    return () => { cancelled = true }
  }, [id])

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  // Read authority: Supabase rows when present, else the local store copy. Until the
  // outreach write-path lands, Supabase is empty and this falls back to local, so
  // adds/edits stay live. The store is never mutated here — pure read path.
  const outreach = remoteOutreach ?? project.outreach

  const d = (k: keyof OutreachDraft, v: unknown) => setDraft((p) => ({ ...p, [k]: v }))

  const handleAdd = () => {
    if (!draft.name.trim()) return
    addContact(id, draft)
    setDraft(BLANK)
    setShowAdd(false)
  }

  const confirmedCount = outreach.filter((o) => o.status === 'confirmed').length

  return (
    <div className="p-6 max-w-5xl">
      <ProjectHeader
        name={project.name}
        description={project.description}
        onUpdateName={(name) => updateProject(id, { name })}
        onUpdateDescription={(description) => updateProject(id, { description })}
        actions={!readOnly ? (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors"
          >
            <Plus size={13} /> Add contact
          </button>
        ) : undefined}
      />

      <PageSection
        label={`Outreach — ${confirmedCount} confirmed / ${outreach.length} total`}
      >
        {outreach.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No outreach contacts yet"
            description="Track contributors, photographers, advertisers, and stylists for this issue."
            action={!readOnly ? (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors"
              >
                <Plus size={13} /> Add contact
              </button>
            ) : undefined}
          />
        ) : (
          <div className="space-y-1">
            {outreach.map((contact) => (
              <OutreachRow
                key={contact.id}
                contact={contact}
                onUpdate={(patch) => updateContact(id, contact.id, patch)}
                onRemove={() => removeContact(id, contact.id)}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </PageSection>

      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setDraft(BLANK) }}
        title="Add Outreach Contact"
        footer={
          <>
            <button
              onClick={() => { setShowAdd(false); setDraft(BLANK) }}
              className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!draft.name.trim()}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40"
            >
              Add contact
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="Name" required>
            <input
              autoFocus type="text" value={draft.name}
              onChange={(e) => d('name', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Contact name" className={inputCls}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type">
              <select value={draft.type} onChange={(e) => d('type', e.target.value as OutreachType)} className={inputCls}>
                {(Object.entries(OUTREACH_TYPE_LABELS) as [OutreachType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Status">
              <select value={draft.status} onChange={(e) => d('status', e.target.value as OutreachStatus)} className={inputCls}>
                {(Object.entries(OUTREACH_STATUS_CONFIG) as [OutreachStatus, { label: string }][]).map(([v, c]) => (
                  <option key={v} value={v}>{c.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Contact info">
              <input
                type="text" value={draft.contactInfo}
                onChange={(e) => d('contactInfo', e.target.value)}
                placeholder="Email · Phone · IG handle" className={inputCls}
              />
            </FormField>
            <FormField label="Fee / Rate">
              <input
                type="text" value={draft.fee}
                onChange={(e) => d('fee', e.target.value)}
                placeholder="e.g. €500/day, TBC" className={inputCls}
              />
            </FormField>
          </div>
          <FormField label="Notes">
            <textarea
              value={draft.notes} onChange={(e) => d('notes', e.target.value)}
              rows={2} className={`${inputCls} resize-none`}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  )
}
