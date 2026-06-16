import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export default function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between pb-5 border-b border-surface-2 mb-6',
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-ink-muted mt-1 leading-snug">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 ml-4 shrink-0">{actions}</div>
      )}
    </div>
  )
}
