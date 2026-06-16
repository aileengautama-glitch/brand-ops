import { useState } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Vendor, VendorStatus, ContractStatus } from '@/types/common'

const CONTRACT_STATUS_CYCLE: Record<ContractStatus, ContractStatus> = {
  not_sent: 'sent',
  sent: 'signed',
  signed: 'not_sent',
}
import {
  VendorStatusBadge, ContractStatusBadge,
  VENDOR_STATUS_LABELS, CONTRACT_STATUS_LABELS,
} from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { inputCls } from '@/components/ui/FormField'

interface VendorRowProps {
  vendor: Vendor
  onUpdate: (patch: Partial<Vendor>) => void
  onRemove: () => void
  /** When true, the row is view-only: no contract-cycle, edit fields, or delete. */
  readOnly?: boolean
}

export default function VendorRow({ vendor, onUpdate, onRemove, readOnly }: VendorRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <>
      <div className={cn('border border-surface-3 rounded bg-white', expanded && 'shadow-sm')}>
        {/* Compact row */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-1/40 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">{vendor.name}</p>
            <p className="text-xs text-ink-faint">{vendor.category}</p>
          </div>
          <VendorStatusBadge status={vendor.status} />
          <ContractStatusBadge
            status={vendor.contractStatus}
            onClick={readOnly ? undefined : (e) => {
              e.stopPropagation()
              onUpdate({ contractStatus: CONTRACT_STATUS_CYCLE[vendor.contractStatus] })
            }}
          />
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
                <input type="text" value={vendor.name} readOnly={readOnly}
                  onChange={(e) => onUpdate({ name: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Category</label>
                <input type="text" value={vendor.category} readOnly={readOnly}
                  onChange={(e) => onUpdate({ category: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Status</label>
                <select value={vendor.status} disabled={readOnly}
                  onChange={(e) => onUpdate({ status: e.target.value as VendorStatus })}
                  className={inputCls}>
                  {(Object.entries(VENDOR_STATUS_LABELS) as [VendorStatus, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Contract</label>
                <select value={vendor.contractStatus} disabled={readOnly}
                  onChange={(e) => onUpdate({ contractStatus: e.target.value as ContractStatus })}
                  className={inputCls}>
                  {(Object.entries(CONTRACT_STATUS_LABELS) as [ContractStatus, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wide text-ink-faint block">Contact info</label>
              <input type="text" value={vendor.contactInfo} readOnly={readOnly}
                onChange={(e) => onUpdate({ contactInfo: e.target.value })}
                placeholder="Email · Phone" className={inputCls} />
            </div>

            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wide text-ink-faint block">Notes</label>
              <textarea value={vendor.notes} readOnly={readOnly}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                rows={2} placeholder="Any notes…"
                className={cn(inputCls, 'resize-none')} />
            </div>

            {!readOnly && (
              <div className="flex justify-end pt-1 border-t border-surface-3">
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={11} /> Delete vendor
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete vendor"
        message={`Delete "${vendor.name}"?`}
        onConfirm={() => { onRemove(); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
