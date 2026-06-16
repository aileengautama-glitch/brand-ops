import { useRef, useState } from 'react'
import { ImagePlus, X, ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStoredImage, useImageStorage, type MediaContext } from '@/hooks/useImageStorage'

interface ImageThumbWithModalProps {
  imageId: string
  alt?: string
  size?: 'sm' | 'md' | 'lg'
  /**
   * How the thumbnail image fits its container.
   * - 'cover'   — fills the frame, crops edges (default; good for moodboards)
   * - 'contain' — letterboxes to show the full image (good for product/reference shots)
   */
  objectFit?: 'cover' | 'contain'
  onUpload?: (imageId: string) => void
  onRemove?: () => void
  className?: string
  /**
   * When provided, a background upload to Supabase Storage is triggered
   * after the file is saved to IndexedDB.  Omit to keep Phase A-C behaviour
   * (IndexedDB only).  Wired per-surface as Phase D migrates each area.
   */
  mediaContext?: MediaContext
}

export default function ImageThumbWithModal({
  imageId,
  alt = 'Image',
  size = 'md',
  objectFit = 'cover',
  onUpload,
  onRemove,
  className,
  mediaContext,
}: ImageThumbWithModalProps) {
  const url = useStoredImage(imageId || undefined)
  const { save } = useImageStorage()
  const fileRef = useRef<HTMLInputElement>(null)
  const [lightbox, setLightbox] = useState(false)
  const [uploading, setUploading] = useState(false)

  const sizeClass = {
    sm: 'w-16 h-16',
    md: 'w-24 h-20',
    lg: 'w-full h-40',
  }[size]

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onUpload) return
    setUploading(true)
    try {
      const id = await save(file, mediaContext)
      onUpload(id)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // No image yet — show upload zone (if onUpload provided)
  if (!url) {
    return (
      <div
        onClick={() => onUpload && fileRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center border border-dashed border-surface-3 rounded bg-surface-1',
          onUpload ? 'cursor-pointer hover:border-accent/40 hover:bg-surface-2/50 transition-colors' : '',
          sizeClass,
          className
        )}
      >
        {uploading ? (
          <span className="text-xs text-ink-faint">Uploading…</span>
        ) : (
          <>
            <ImagePlus size={14} className="text-ink-faint mb-1" />
            {onUpload && <span className="text-2xs text-ink-faint">Upload</span>}
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    )
  }

  // Has image — show thumbnail
  return (
    <>
      <div
        className={cn(
          'relative group overflow-hidden rounded border border-surface-3 bg-surface-1',
          sizeClass,
          className
        )}
      >
        <img
          src={url}
          alt={alt}
          className={cn(
            'w-full h-full',
            objectFit === 'contain' ? 'object-contain p-1' : 'object-cover'
          )}
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/20 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
          <button
            onClick={() => setLightbox(true)}
            className="p-1 bg-white/90 rounded text-ink hover:bg-white transition-colors"
          >
            <ZoomIn size={12} />
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1 bg-white/90 rounded text-ink hover:bg-white transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 p-8"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded text-white hover:bg-white/20 transition-colors"
          >
            <X size={16} />
          </button>
          <img
            src={url}
            alt={alt}
            className="max-w-full max-h-full object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
