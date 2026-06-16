import { useRef, useState } from 'react'
import { ChevronDown, Trash2, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BudgetItem, BudgetItemStatus } from '@/types/common'
import { BudgetStatusBadge, BUDGET_STATUS_LABELS } from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { inputCls } from '@/components/ui/FormField'
import { saveFile } from '@/lib/db'
import { generateId } from '@/lib/utils'

interface BudgetRowProps {
  item: BudgetItem
  onUpdate: (patch: Partial<BudgetItem>) => void
  onRemove: () => void
  readOnly?: boolean
}

export default function BudgetRow({ item, onUpdate, onRemove, readOnly = false }: BudgetRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const id = generateId()
      await saveFile(id, file)
      onUpdate({ invoiceFileName: file.name, invoiceFileId: id })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <>
      <div className={cn('border border-surface-3 rounded bg-white', expanded && 'shadow-sm')}>
        {/* Compact row */}
        <div
          className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-1/40 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-ink truncate">{item.description}</p>
            <p className="text-xs text-ink-faint">{item.category}{item.supplier ? ` · ${item.supplier}` : ''}</p>
          </div>
          <span className="text-xs text-ink-muted shrink-0 w-28 text-right">
            {item.estimatedCost > 0 ? `$${item.estimatedCost.toLocaleString()}` : '—'}
          </span>
          <span className="text-xs font-medium text-ink shrink-0 w-28 text-right">
            {item.actualCost > 0 ? `$${item.actualCost.toLocaleString()}` : '—'}
          </span>
          <span className="shrink-0 w-24 flex justify-end">
            <BudgetStatusBadge status={item.status} />
          </span>
          {item.invoiceFileName && (
            <span title={item.invoiceFileName}>
              <Paperclip size={12} className="text-ink-faint shrink-0" />
            </span>
          )}
          <ChevronDown
            size={12}
            className={cn('text-ink-faint shrink-0 transition-transform', expanded && 'rotate-180')}
          />
        </div>

        {/* Expanded panel */}
        {expanded && (
          <div className="border-t border-surface-3 px-3 pb-3 pt-2.5 space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Description</label>
                <input type="text" value={item.description}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  disabled={readOnly}
                  className={cn(inputCls, readOnly && 'opacity-60 cursor-default')} />
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Category</label>
                <input type="text" value={item.category}
                  onChange={(e) => onUpdate({ category: e.target.value })}
                  disabled={readOnly}
                  className={cn(inputCls, readOnly && 'opacity-60 cursor-default')} />
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Supplier</label>
                <input type="text" value={item.supplier}
                  onChange={(e) => onUpdate({ supplier: e.target.value })}
                  disabled={readOnly}
                  className={cn(inputCls, readOnly && 'opacity-60 cursor-default')} />
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Status</label>
                <select value={item.status}
                  onChange={(e) => onUpdate({ status: e.target.value as BudgetItemStatus })}
                  disabled={readOnly}
                  className={cn(inputCls, readOnly && 'opacity-60 cursor-default')}>
                  {(Object.entries(BUDGET_STATUS_LABELS) as [BudgetItemStatus, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Estimated cost</label>
                <input type="number" value={item.estimatedCost}
                  onChange={(e) => onUpdate({ estimatedCost: Number(e.target.value) })}
                  disabled={readOnly}
                  className={cn(inputCls, readOnly && 'opacity-60 cursor-default')} min="0" step="1" />
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Actual cost</label>
                <input type="number" value={item.actualCost}
                  onChange={(e) => onUpdate({ actualCost: Number(e.target.value) })}
                  disabled={readOnly}
                  className={cn(inputCls, readOnly && 'opacity-60 cursor-default')} min="0" step="1" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wide text-ink-faint block">Notes</label>
              <textarea value={item.notes}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                rows={2} placeholder="Any notes…"
                disabled={readOnly}
                className={cn(inputCls, 'resize-none', readOnly && 'opacity-60 cursor-default')} />
            </div>

            {/* Invoice upload + delete */}
            <div className="flex items-center gap-3 pt-1 border-t border-surface-3">
              {!readOnly && (
                <>
                  <input ref={fileRef} type="file" className="hidden" onChange={handleInvoiceUpload} />
                  <button onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors">
                    <Paperclip size={12} />
                    {uploading ? 'Uploading…' : item.invoiceFileName ? 'Replace invoice' : 'Attach invoice'}
                  </button>
                </>
              )}
              {item.invoiceFileName && (
                <span className="text-xs text-ink-faint truncate max-w-[200px]" title={item.invoiceFileName}>
                  {item.invoiceFileName}
                </span>
              )}
              <div className="flex-1" />
              {!readOnly && (
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={11} /> Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete budget item"
        message={`Delete "${item.description}"?`}
        onConfirm={() => { onRemove(); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
