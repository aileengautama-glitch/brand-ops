/**
 * ImageDropZone — shared image-intake surface for moodboard-style areas.
 *
 * Three input methods, one component:
 *   - click to pick files (multiple)
 *   - drag & drop files onto the zone
 *   - paste image(s) from the clipboard (anywhere on the page, unless a text
 *     field is focused)
 *
 * Accepts jpg / jpeg / png only; other types are rejected with an inline message.
 * Hands the validated File[] to onFiles — the parent saves them via
 * useImageStorage.save() and appends items, so persistence/sync is unchanged.
 */
import { useRef, useState, useCallback, useEffect } from 'react'
import { ImagePlus } from 'lucide-react'

const ACCEPT_MIME = ['image/jpeg', 'image/png']
const ACCEPT_ATTR = 'image/jpeg,image/png,.jpg,.jpeg,.png'

export default function ImageDropZone({
  onFiles,
  disabled,
  compact = false,
  label,
  hint = 'Click, drag & drop, or paste — JPG or PNG',
  className = '',
}: {
  /** Called with validated jpg/png files (click, drop, or paste). */
  onFiles: (files: File[]) => void
  disabled?: boolean
  /** Compact = the small "add more" affordance under an existing grid. */
  compact?: boolean
  label?: string
  hint?: string
  className?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accept = useCallback(
    (list: FileList | File[] | null | undefined) => {
      if (disabled || !list) return
      const all = Array.from(list)
      const valid = all.filter((f) => ACCEPT_MIME.includes(f.type))
      const rejected = all.length - valid.length
      if (valid.length > 0) {
        onFiles(valid)
        setError(null)
      }
      if (rejected > 0) {
        setError(`Skipped ${rejected} unsupported file${rejected > 1 ? 's' : ''} — only JPG and PNG are accepted.`)
      }
    },
    [disabled, onFiles],
  )

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    accept(e.target.files)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    accept(e.dataTransfer?.files)
  }

  // Paste anywhere on the page while this zone is mounted — but never steal a
  // paste aimed at a focused text field (caption inputs, etc.).
  useEffect(() => {
    if (disabled) return
    const onPaste = (e: ClipboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'))
      if (files.length > 0) {
        e.preventDefault()
        accept(files)
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [disabled, accept])

  if (disabled) return null

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={[
          'flex items-center justify-center gap-2 rounded border border-dashed cursor-pointer transition-colors text-center',
          compact ? 'px-3 py-2 text-xs' : 'flex-col px-4 py-8 text-sm',
          dragOver ? 'border-accent bg-accent/5 text-ink' : 'border-surface-3 bg-surface-1/40 text-ink-muted hover:border-accent/40 hover:bg-surface-2/40',
        ].join(' ')}
      >
        <ImagePlus size={compact ? 14 : 22} className="shrink-0 text-ink-faint" />
        <span className="font-medium">{label ?? (compact ? 'Add image' : 'Upload images')}</span>
        {!compact && <span className="text-2xs text-ink-faint">{hint}</span>}
      </div>
      {error && <p className="mt-1 text-2xs text-red-500">{error}</p>}
      <input ref={fileRef} type="file" accept={ACCEPT_ATTR} multiple className="hidden" onChange={handleInput} />
    </div>
  )
}
