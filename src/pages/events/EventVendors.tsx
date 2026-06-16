import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Building2 } from 'lucide-react'
import { useEventStore } from '@/store/useEventStore'
import { useCurrentEventProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import VendorRow from '@/components/vendors/VendorRow'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import { FormField, inputCls } from '@/components/ui/FormField'
import { VENDOR_STATUS_LABELS, CONTRACT_STATUS_LABELS } from '@/components/ui/StatusBadge'
import type { Vendor, VendorStatus, ContractStatus } from '@/types/common'

type VendorDraft = Omit<Vendor, 'id' | 'createdAt'>
const BLANK: VendorDraft = { name: '', category: '', contactInfo: '', status: 'shortlisted', contractStatus: 'not_sent', notes: '' }

export default function EventVendors() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentEventProject()
  const { canEdit } = useCurrentUser()
  const updateProject = useEventStore((s) => s.updateProject)
  const addVendor = useEventStore((s) => s.addVendor)
  const updateVendor = useEventStore((s) => s.updateVendor)
  const removeVendor = useEventStore((s) => s.removeVendor)

  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState<VendorDraft>(BLANK)

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const readOnly = !canEdit('event.vendors', id)

  const d = (k: keyof VendorDraft, v: unknown) => setDraft((p) => ({ ...p, [k]: v }))

  const handleAdd = () => {
    if (!draft.name.trim()) return
    addVendor(id, draft)
    setDraft(BLANK)
    setShowAdd(false)
  }

  const confirmed = project.vendors.filter((v) => v.status === 'confirmed').length

  return (
    <div className="p-6 max-w-4xl">
      <ProjectHeader
        name={project.name}
        description={project.description}
        onUpdateName={(name) => updateProject(id, { name })}
        onUpdateDescription={(description) => updateProject(id, { description })}
        actions={readOnly ? undefined : (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
            <Plus size={13} /> Add vendor
          </button>
        )}
      />

      <PageSection label={`Vendor & Supplier Register — ${confirmed} confirmed / ${project.vendors.length} total`} card>
        {project.vendors.length === 0 ? (
          <EmptyState icon={Building2} title="No vendors yet"
            description="Add vendors and suppliers for this event."
            action={readOnly ? undefined : (
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
                <Plus size={13} /> Add vendor
              </button>
            )}
          />
        ) : (
          <div className="space-y-1">
            {project.vendors.map((v) => (
              <VendorRow key={v.id} vendor={v}
                onUpdate={(patch) => updateVendor(id, v.id, patch)}
                onRemove={() => removeVendor(id, v.id)}
                readOnly={readOnly} />
            ))}
          </div>
        )}
      </PageSection>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setDraft(BLANK) }}
        title="Add Vendor / Supplier"
        footer={
          <>
            <button onClick={() => { setShowAdd(false); setDraft(BLANK) }}
              className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">
              Cancel
            </button>
            <button onClick={handleAdd} disabled={!draft.name.trim()}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40">
              Add vendor
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="Name" required>
            <input autoFocus type="text" value={draft.name}
              onChange={(e) => d('name', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Vendor name" className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <input type="text" value={draft.category}
                onChange={(e) => d('category', e.target.value)}
                placeholder="e.g. Venue, Catering" className={inputCls} />
            </FormField>
            <FormField label="Status">
              <select value={draft.status} onChange={(e) => d('status', e.target.value as VendorStatus)} className={inputCls}>
                {(Object.entries(VENDOR_STATUS_LABELS) as [VendorStatus, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Contract">
              <select value={draft.contractStatus} onChange={(e) => d('contractStatus', e.target.value as ContractStatus)} className={inputCls}>
                {(Object.entries(CONTRACT_STATUS_LABELS) as [ContractStatus, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Contact info">
              <input type="text" value={draft.contactInfo}
                onChange={(e) => d('contactInfo', e.target.value)}
                placeholder="Email · Phone" className={inputCls} />
            </FormField>
          </div>
          <FormField label="Notes">
            <textarea value={draft.notes} onChange={(e) => d('notes', e.target.value)}
              rows={2} className={`${inputCls} resize-none`} />
          </FormField>
        </div>
      </Modal>
    </div>
  )
}
