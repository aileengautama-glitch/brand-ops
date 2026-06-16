import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {Icon && (
        <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center mb-3">
          <Icon size={18} className="text-ink-faint" />
        </div>
      )}
      <p className="text-sm font-medium text-ink-muted">{title}</p>
      {description && (
        <p className="text-xs text-ink-faint mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
