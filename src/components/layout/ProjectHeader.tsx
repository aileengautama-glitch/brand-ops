import InlineEdit from '@/components/ui/InlineEdit'

interface MetaItem {
  label: string
  value: string
  editable?: boolean
  onEdit?: (v: string) => void
}

interface ProjectHeaderProps {
  name: string
  description: string
  meta?: MetaItem[]
  onUpdateName: (name: string) => void
  onUpdateDescription: (description: string) => void
  actions?: React.ReactNode
}

export default function ProjectHeader({
  name,
  description,
  meta,
  onUpdateName,
  onUpdateDescription,
  actions,
}: ProjectHeaderProps) {
  return (
    <div className="pb-5 border-b border-surface-2 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          {/* Project name — large, bold, inline editable */}
          <InlineEdit
            value={name}
            onSave={onUpdateName}
            placeholder="Project name"
            textClassName="text-2xl font-bold text-ink tracking-tight"
            inputClassName="text-2xl font-bold tracking-tight"
          />

          {/* Short description */}
          <InlineEdit
            value={description}
            onSave={onUpdateDescription}
            placeholder="Add a short description…"
            textClassName="text-sm text-ink-muted"
            inputClassName="text-sm"
          />

          {/* Metadata row (event date, venue, etc.) */}
          {meta && meta.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
              {meta.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 text-xs text-ink-faint">
                  <span className="font-medium text-ink-secondary">{item.label}:</span>
                  {item.editable && item.onEdit ? (
                    <InlineEdit
                      value={item.value}
                      onSave={item.onEdit}
                      placeholder="—"
                      textClassName="text-xs text-ink-muted"
                      inputClassName="text-xs"
                    />
                  ) : (
                    <span>{item.value || '—'}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0 mt-1">{actions}</div>
        )}
      </div>
    </div>
  )
}
