import { cn } from '@/lib/utils'
import type { TaskStatus, Priority, VendorStatus, ContractStatus, BudgetItemStatus } from '@/types/common'

// ─── Pill primitive ───────────────────────────────────────────────────────────

function Pill({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap',
        className
      )}
    >
      {label}
    </span>
  )
}

// ─── Task status ──────────────────────────────────────────────────────────────

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  todo:        { label: 'To do',       className: 'bg-surface-3 text-ink-muted' },
  in_progress: { label: 'In progress', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  done:        { label: 'Done',        className: 'bg-green-50 text-green-700 border border-green-200' },
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const c = TASK_STATUS_CONFIG[status]
  return <Pill label={c.label} className={c.className} />
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
}

// ─── Priority ─────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> = {
  low:    { label: 'Low',    className: 'bg-surface-3 text-ink-faint' },
  normal: { label: 'Normal', className: 'bg-surface-1 text-ink-muted border border-surface-3' },
  high:   { label: 'High',   className: 'bg-accent/10 text-accent font-semibold' },
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const c = PRIORITY_CONFIG[priority]
  return <Pill label={c.label} className={c.className} />
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
}

// ─── Vendor status ────────────────────────────────────────────────────────────

const VENDOR_STATUS_CONFIG: Record<VendorStatus, { label: string; className: string }> = {
  shortlisted: { label: 'Shortlisted', className: 'bg-surface-2 text-ink-muted border border-surface-3' },
  confirmed:   { label: 'Confirmed',   className: 'bg-green-50 text-green-700 border border-green-200' },
  on_hold:     { label: 'On hold',     className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  declined:    { label: 'Declined',    className: 'bg-red-50 text-red-600 border border-red-200' },
}

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  const c = VENDOR_STATUS_CONFIG[status]
  return <Pill label={c.label} className={c.className} />
}

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  shortlisted: 'Shortlisted',
  confirmed: 'Confirmed',
  on_hold: 'On hold',
  declined: 'Declined',
}

// ─── Contract status ──────────────────────────────────────────────────────────

const CONTRACT_STATUS_CONFIG: Record<ContractStatus, { label: string; className: string }> = {
  not_sent: { label: 'Not sent', className: 'bg-surface-3 text-ink-faint' },
  sent:     { label: 'Sent',     className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  signed:   { label: 'Signed',   className: 'bg-green-50 text-green-700 border border-green-200' },
}

export function ContractStatusBadge({ status, onClick }: { status: ContractStatus; onClick?: (e: React.MouseEvent) => void }) {
  const c = CONTRACT_STATUS_CONFIG[status]
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title="Click to cycle status"
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap cursor-pointer transition-opacity hover:opacity-70 ${c.className}`}
      >
        {c.label}
      </button>
    )
  }
  return <Pill label={c.label} className={c.className} />
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  not_sent: 'Not sent',
  sent: 'Sent',
  signed: 'Signed',
}

// ─── Budget item status ───────────────────────────────────────────────────────

const BUDGET_STATUS_CONFIG: Record<BudgetItemStatus, { label: string; className: string }> = {
  pending:  { label: 'Pending',  className: 'bg-surface-3 text-ink-faint' },
  approved: { label: 'Approved', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  paid:     { label: 'Paid',     className: 'bg-green-50 text-green-700 border border-green-200' },
}

export function BudgetStatusBadge({ status }: { status: BudgetItemStatus }) {
  const c = BUDGET_STATUS_CONFIG[status]
  return <Pill label={c.label} className={c.className} />
}

export const BUDGET_STATUS_LABELS: Record<BudgetItemStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  paid: 'Paid',
}
