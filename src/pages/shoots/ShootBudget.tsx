import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Wallet } from 'lucide-react'
import { useShootStore } from '@/store/useShootStore'
import { useCurrentShootProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import BudgetSummaryBar from '@/components/budget/BudgetSummaryBar'
import BudgetRow from '@/components/budget/BudgetRow'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import { FormField, inputCls } from '@/components/ui/FormField'
import { BUDGET_STATUS_LABELS } from '@/components/ui/StatusBadge'
import type { BudgetItem, BudgetItemStatus } from '@/types/common'

type BudgetDraft = Omit<BudgetItem, 'id' | 'createdAt' | 'invoiceFileName' | 'invoiceFileId'>
const BLANK: BudgetDraft = { description: '', category: '', supplier: '', estimatedCost: 0, actualCost: 0, status: 'pending', notes: '' }

export default function ShootBudget() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentShootProject()
  const { canEdit } = useCurrentUser()
  const updateProject = useShootStore((s) => s.updateProject)
  const updateTotalBudget = useShootStore((s) => s.updateTotalBudget)
  const addBudgetItem = useShootStore((s) => s.addBudgetItem)
  const updateBudgetItem = useShootStore((s) => s.updateBudgetItem)
  const removeBudgetItem = useShootStore((s) => s.removeBudgetItem)

  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState<BudgetDraft>(BLANK)

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const readOnly = !canEdit('shoot.budget', id)

  const d = (k: keyof BudgetDraft, v: unknown) => setDraft((p) => ({ ...p, [k]: v }))

  const handleAdd = () => {
    if (!draft.description.trim()) return
    addBudgetItem(id, { ...draft, invoiceFileName: '', invoiceFileId: '' })
    setDraft(BLANK)
    setShowAdd(false)
  }

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
            <Plus size={13} /> Add item
          </button>
        )}
      />

      <PageSection label="Summary">
        <BudgetSummaryBar
          totalBudget={project.totalBudget}
          items={project.budgetItems}
          onEditTotal={(total) => updateTotalBudget(id, total)}
          readOnly={readOnly}
        />
      </PageSection>

      <PageSection label="Line Items" card>
        {project.budgetItems.length === 0 ? (
          <EmptyState icon={Wallet} title="No budget items yet"
            action={readOnly ? undefined : (
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
                <Plus size={13} /> Add item</button>
            )} />
        ) : (
          <>
            <div className="flex items-center gap-3 px-3 pb-1 text-2xs font-bold uppercase tracking-widest text-ink-faint">
              <span className="flex-1">Description</span>
              <span className="w-24 text-right">Estimated</span>
              <span className="w-24 text-right">Actual</span>
              <span className="w-20">Status</span>
              <span className="w-4" />
            </div>
            <div className="space-y-1">
              {project.budgetItems.map((item) => (
                <BudgetRow key={item.id} item={item}
                  onUpdate={(patch) => updateBudgetItem(id, item.id, patch)}
                  onRemove={() => removeBudgetItem(id, item.id)}
                  readOnly={readOnly} />
              ))}
            </div>
          </>
        )}
      </PageSection>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setDraft(BLANK) }}
        title="Add Budget Item"
        footer={
          <>
            <button onClick={() => { setShowAdd(false); setDraft(BLANK) }}
              className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">Cancel</button>
            <button onClick={handleAdd} disabled={!draft.description.trim()}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40">Add item</button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="Description" required>
            <input autoFocus type="text" value={draft.description}
              onChange={(e) => d('description', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category"><input type="text" value={draft.category} onChange={(e) => d('category', e.target.value)} className={inputCls} /></FormField>
            <FormField label="Supplier"><input type="text" value={draft.supplier} onChange={(e) => d('supplier', e.target.value)} className={inputCls} /></FormField>
            <FormField label="Estimated cost"><input type="number" value={draft.estimatedCost} onChange={(e) => d('estimatedCost', Number(e.target.value))} min="0" className={inputCls} /></FormField>
            <FormField label="Status">
              <select value={draft.status} onChange={(e) => d('status', e.target.value as BudgetItemStatus)} className={inputCls}>
                {(Object.entries(BUDGET_STATUS_LABELS) as [BudgetItemStatus, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Notes"><textarea value={draft.notes} onChange={(e) => d('notes', e.target.value)} rows={2} className={`${inputCls} resize-none`} /></FormField>
        </div>
      </Modal>
    </div>
  )
}
