import { cn } from '@/lib/utils'

interface PageSectionProps {
  label?: string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
  /**
   * When true, wraps the section content in the shared soft-card treatment
   * (`.card-soft`) — used by the dashboards (Phase 10). Opt-in; default keeps
   * the original bare layout so all existing usages are unchanged.
   */
  card?: boolean
}

export default function PageSection({
  label,
  children,
  actions,
  className,
  card = false,
}: PageSectionProps) {
  return (
    <section className={cn('mb-6', className)}>
      {(label || actions) && (
        <div className="flex items-center justify-between mb-3">
          {label && (
            <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">
              {label}
            </h2>
          )}
          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
        </div>
      )}
      {card ? <div className="card-soft p-4">{children}</div> : children}
    </section>
  )
}
