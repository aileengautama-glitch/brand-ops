import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  width?: 'sm' | 'md' | 'lg'
  footer?: React.ReactNode
}

export default function Modal({ open, onClose, title, children, width = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative bg-white border border-surface-3 rounded shadow-xl z-10 flex flex-col max-h-[85vh]',
          width === 'sm' && 'w-[380px]',
          width === 'md' && 'w-[520px]',
          width === 'lg' && 'w-[720px]'
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-3 shrink-0">
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded text-ink-faint hover:text-ink hover:bg-surface-3 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-surface-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
