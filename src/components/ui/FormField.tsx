import { cn } from '@/lib/utils'

// Shared input class string — use on any <input>, <textarea>, or <select>
export const inputCls = [
  'w-full px-3 py-1.5 text-sm border border-surface-3 rounded bg-white',
  'focus:outline-none focus:border-accent text-ink placeholder:text-ink-faint',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ')

interface FormFieldProps {
  label: string
  children: React.ReactNode
  required?: boolean
  hint?: string
  className?: string
}

export function FormField({ label, children, required, hint, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="block text-xs font-medium text-ink-secondary">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
    </div>
  )
}
