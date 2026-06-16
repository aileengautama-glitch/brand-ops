import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Wallet } from 'lucide-react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { MagazineBudgetItemRepository } from '@/repositories'
import { useCurrentMagazineProject } from '@/hooks/useCurrentProject'
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

// Magazine-specific budget category suggestions
const MAG_BUDGET_CATEGORIES = [
  'Photography',
  'Editorial Design',
  'Print Production',
  'Contributors',
  'Marketing / Promo',
  'Misc',
]

type BudgetDraft = Omit<BudgetItem, 'id' | 'createdAt' | 'invoiceFileName' | 'invoiceFileId'>
const BLANK_DRAFT: BudgetDraft = {
  description: '', category: '', supplier: '', estimatedCost: 0, actualCost: 0, status: 'pending', notes: '',
}

export default function MagazineBudget() {
  const { id }             = useParams<{ id: string }>()
  const project            = useCurrentMagazineProject()
  const updateProject      = useMagazineStore((s) => s.updateProject)
  const updateTotalBudget  = useMagazineStore((s) => s.updateTotalBudget)
  const addBudgetItem      = useMagazineStore((s) => s.addBudgetItem)
  const updateBudgetItem   = useMagazineStore((s) => s.updateBudgetItem)
  const removeBudgetItem   = useMagazineStore((s) => s.removeBudgetItem)

  const { canEdit } = useCurrentUser()
  const readOnly    = !canEdit('magazine.budget', id)

  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft]     = useState<BudgetDraft>(BLANK_DRAFT)

  // Phase 5L — Supabase-first read of this project's budget items. Fetched once per
  // project; null = no Supabase answer (disabled / non-UUID / error / no rows).
  const [remoteBudgetItems, setRemoteBudgetItems] = useState<BudgetItem[] | null>(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    MagazineBudgetItemRepository.list(id).then((rows) => {
      if (!cancelled) setRemoteBudgetItems(rows)
    })
    return () => { cancelled = true }
  }, [id])

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  // Read authority: Supabase rows when present, else the local store copy. Until the
  // table is populated by the dual-write, this falls back to local (no behavior change).
  // totalBudget is untouched — it stays project.totalBudget (Phase 5B summary field).
  const budgetItems = remoteBudgetItems ?? project.budgetItems

  const d = (k: keyof BudgetDraft, v: unknown) => setDraft((prev) => ({ ...prev, [k]: v }))

  const handleAdd = () => {
    if (!draft.description.trim()) return
    addBudgetItem(id, { ...draft, invoiceFileName: '', invoiceFileId: '' })
    setDraft(BLANK_DRAFT)
    setShowAdd(false)
  }

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
            <Plus size={13} /> Add item
          </button>
        ) : undefined}
      />

      <PageSection label="Summary">
        <BudgetSummaryBar
          totalBudget={project.totalBudget}
          items={budgetItems}
          onEditTotal={(total) => updateTotalBudget(id, total)}
        />
      </PageSection>

      <PageSection label="Line Items" card>
        {budgetItems.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No budget items yet"
            description="Add line items to track spend across photography, print, contributors, and more."
            action={!readOnly ? (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors"
              >
                <Plus size={13} /> Add item
              </button>
            ) : undefined}
          />
        ) : (
          <>
            {/* Column headers */}
            <div className="flex items-center gap-3 px-3 pb-1 text-2xs font-bold uppercase tracking-widest text-ink-faint">
              <span className="flex-1">Description</span>
              <span className="w-24 text-right">Estimated</span>
              <span className="w-24 text-right">Actual</span>
              <span className="w-20">Status</span>
              <span className="w-4" />
            </div>
            <div className="space-y-1">
              {budgetItems.map((item) => (
                <BudgetRow
                  key={item.id}
                  item={item}
                  onUpdate={(patch) => updateBudgetItem(id, item.id, patch)}
                  onRemove={() => removeBudgetItem(id, item.id)}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </>
        )}
      </PageSection>

      {/* Add budget item modal */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setDraft(BLANK_DRAFT) }}
        title="Add Budget Item"
        footer={
          <>
            <button
              onClick={() => { setShowAdd(false); setDraft(BLANK_DRAFT) }}
              className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!draft.description.trim()}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40"
            >
              Add item
            </button>
          </>
        }
      >
        <datalist id="mag-budget-categories">
          {MAG_BUDGET_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="space-y-3">
          <FormField label="Description" required>
            <input
              autoFocus type="text" value={draft.description}
              onChange={(e) => d('description', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="e.g. Cover shoot" className={inputCls}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <input
                type="text" value={draft.category}
                onChange={(e) => d('category', e.target.value)}
                list="mag-budget-categories"
                placeholder="e.g. Photography" className={inputCls}
              />
            </FormField>
            <FormField label="Supplier">
              <input
                type="text" value={draft.supplier}
                onChange={(e) => d('supplier', e.target.value)}
                className={inputCls}
              />
            </FormField>
            <FormField label="Estimated cost">
              <input
                type="number" value={draft.estimatedCost}
                onChange={(e) => d('estimatedCost', Number(e.target.value))}
                min="0" className={inputCls}
              />
            </FormField>
            <FormField label="Status">
              <select
                value={draft.status}
                onChange={(e) => d('status', e.target.value as BudgetItemStatus)}
                className={inputCls}
              >
                {(Object.entries(BUDGET_STATUS_LABELS) as [BudgetItemStatus, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Notes">
            <textarea
              value={draft.notes}
              onChange={(e) => d('notes', e.target.value)}
              rows={2} className={`${inputCls} resize-none`}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  )
}
