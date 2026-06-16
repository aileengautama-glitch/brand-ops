import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagChipProps {
  label: string
  onRemove?: () => void
  className?: string
}

export default function TagChip({ label, onRemove, className }: TagChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 bg-surface-2 border border-surface-3 rounded text-xs text-ink-secondary',
        className
      )}
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-ink-faint hover:text-ink transition-colors ml-0.5"
          aria-label={`Remove tag ${label}`}
        >
          <X size={10} />
        </button>
      )}
    </span>
  )
}
