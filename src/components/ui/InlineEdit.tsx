import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface InlineEditProps {
  value: string
  onSave: (value: string) => void
  placeholder?: string
  multiline?: boolean
  className?: string         // applied to the wrapper / textarea
  textClassName?: string     // applied to the display text
  inputClassName?: string    // applied to the input
  rows?: number              // textarea rows (default 3)
  /** When true, the value is shown as static text and cannot be edited. */
  readOnly?: boolean
}

export default function InlineEdit({
  value,
  onSave,
  placeholder = 'Click to edit…',
  multiline = false,
  className,
  textClassName,
  inputClassName,
  rows = 3,
  readOnly,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  const commit = () => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed !== value) onSave(trimmed || value) // don't blank out a value
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setDraft(value); setEditing(false) }
  }

  const sharedInputCls = cn(
    'w-full bg-white border border-accent/40 rounded px-2 py-1 focus:outline-none focus:border-accent',
    inputClassName
  )

  // Read-only: render static text, no edit affordance.
  if (readOnly) {
    return (
      <span
        className={cn(
          'px-1 -mx-1 block',
          !value && 'text-ink-faint',
          textClassName
        )}
      >
        {value || placeholder}
      </span>
    )
  }

  if (editing) {
    return multiline ? (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        rows={rows}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={cn(sharedInputCls, 'resize-none', className)}
      />
    ) : (
      <input
        ref={ref as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={cn(sharedInputCls, className)}
      />
    )
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => e.key === 'Enter' && setEditing(true)}
      className={cn(
        'cursor-text rounded hover:bg-surface-3/50 transition-colors px-1 -mx-1 block',
        !value && 'text-ink-faint',
        textClassName
      )}
    >
      {value || placeholder}
    </span>
  )
}
