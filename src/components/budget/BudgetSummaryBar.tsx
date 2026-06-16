import { cn } from '@/lib/utils'

interface BudgetSummaryBarProps {
  totalBudget: number
  items: Array<{ actualCost: number; estimatedCost: number }>
  onEditTotal?: (newTotal: number) => void
  className?: string
  /** When true, the Total Budget tile becomes a static (non-editable) value. */
  readOnly?: boolean
}

export default function BudgetSummaryBar({
  totalBudget,
  items,
  onEditTotal,
  className,
  readOnly,
}: BudgetSummaryBarProps) {
  const totalEstimated = items.reduce((s, i) => s + i.estimatedCost, 0)
  const totalSpent = items.reduce((s, i) => s + i.actualCost, 0)
  const remaining = totalBudget - totalSpent
  const pct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0
  const overBudget = totalSpent > totalBudget

  return (
    <div className={cn('space-y-3', className)}>
      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-3">
        <Tile
          label="Total Budget"
          value={totalBudget}
          editable={!readOnly}
          onEdit={readOnly ? undefined : onEditTotal}
          hint="Click to edit"
        />
        <Tile label="Estimated" value={totalEstimated} />
        <Tile label="Actual Spend" value={totalSpent} />
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-2xs text-ink-faint uppercase tracking-wide">Budget used</span>
          <span className={cn('text-xs font-medium', overBudget ? 'text-red-500' : 'text-ink-muted')}>
            {pct.toFixed(0)}%
            {overBudget && ' — over budget'}
          </span>
        </div>
        <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              overBudget ? 'bg-red-400' : pct > 80 ? 'bg-amber-400' : 'bg-accent'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-2xs text-ink-faint">
            Remaining: ${remaining.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}

function Tile({
  label,
  value,
  editable,
  onEdit,
  hint,
}: {
  label: string
  value: number
  editable?: boolean
  onEdit?: (v: number) => void
  hint?: string
}) {
  return (
    <div className="bg-surface-1 border border-surface-3 rounded p-3">
      <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-1">{label}</p>
      {editable && onEdit ? (
        <div className="flex items-baseline gap-0.5">
          <span className="text-xl font-bold text-ink">$</span>
          <input
            type="number"
            value={value}
            onChange={(e) => onEdit(Number(e.target.value))}
            className="flex-1 text-xl font-bold text-ink bg-transparent border-0 focus:outline-none focus:bg-white focus:border focus:border-surface-3 focus:rounded focus:px-1"
            min="0"
            step="100"
            title={hint}
          />
        </div>
      ) : (
        <p className="text-xl font-bold text-ink">${value.toLocaleString()}</p>
      )}
    </div>
  )
}
