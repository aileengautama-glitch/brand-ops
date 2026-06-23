import { useRef, useState } from 'react'
import { Trash2, ChevronDown, ChevronUp, ImagePlus, X, ZoomIn } from 'lucide-react'
import type { Styling, Product, Model } from '@/types/shoot'
import { useStoredImage, useImageStorage, buildMediaContext, type MediaContext } from '@/hooks/useImageStorage'
import { MEDIA_ENTITY } from '@/lib/mediaEntityTypes'

interface StylingCardProps {
  styling: Styling
  products: Product[]
  models: Model[]
  isFirst: boolean
  isLast: boolean
  onUpdate: (patch: Partial<Styling>) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
  /** Owning project's UUID; enables Supabase media sync when valid. */
  projectId?: string
}

// ─── Full-width image slot at the top of each card ───────────────────────────

function StylingImageSlot({
  imageId,
  onUpload,
  mediaContext,
}: {
  imageId?: string
  onUpload: (id: string) => void
  mediaContext?: MediaContext
}) {
  const url = useStoredImage(imageId || undefined)
  const { save } = useImageStorage()
  const fileRef = useRef<HTMLInputElement>(null)
  const [lightbox, setLightbox] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const id = await save(file, mediaContext)
    onUpload(id)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <div className="w-full aspect-[4/3] rounded overflow-hidden bg-surface-1 border border-surface-3 relative group">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />

        {url ? (
          <>
            <img src={url} alt="Styling reference" className="w-full h-full object-cover" />
            {/* Hover overlay: expand + replace */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => setLightbox(true)}
                className="p-1.5 bg-white/90 rounded text-ink hover:bg-white transition-colors"
                title="View full size"
              >
                <ZoomIn size={13} />
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="p-1.5 bg-white/90 rounded text-ink hover:bg-white transition-colors"
                title="Replace image"
              >
                <ImagePlus size={13} />
              </button>
            </div>
          </>
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-ink-faint hover:text-ink-muted transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus size={20} />
            <span className="text-xs">Add image</span>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && url && (
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
            alt="Styling reference"
            className="max-w-full max-h-full object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

// ─── Main card ───────────────────────────────────────────────────────────────

export default function StylingCard({
  styling, products, models, isFirst, isLast,
  onUpdate, onRemove, onMove, projectId,
}: StylingCardProps) {
  const toggleProduct = (id: string) => {
    const ids = styling.productIds.includes(id)
      ? styling.productIds.filter((x) => x !== id)
      : [...styling.productIds, id]
    onUpdate({ productIds: ids })
  }

  const toggleModel = (id: string) => {
    const ids = styling.modelIds.includes(id)
      ? styling.modelIds.filter((x) => x !== id)
      : [...styling.modelIds, id]
    onUpdate({ modelIds: ids })
  }

  return (
    <div className="bg-white border border-surface-3 rounded overflow-hidden group no-page-break">
      {/* ── 1. Image ─────────────────────────────────────────────────── */}
      <StylingImageSlot
        imageId={styling.imageId}
        onUpload={(id) => onUpdate({ imageId: id })}
        mediaContext={buildMediaContext(projectId, MEDIA_ENTITY.stylingImage, styling.id)}
      />

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="p-3 space-y-2.5">
        {/* Move / delete — visible on card hover */}
        <div className="flex items-center justify-between">
          <span className="text-2xs text-ink-faint font-medium">Styling {styling.stylingCode || '—'}</span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onMove('up')} disabled={isFirst}
              className="p-0.5 rounded text-ink-faint hover:text-ink disabled:opacity-30">
              <ChevronUp size={12} />
            </button>
            <button onClick={() => onMove('down')} disabled={isLast}
              className="p-0.5 rounded text-ink-faint hover:text-ink disabled:opacity-30">
              <ChevronDown size={12} />
            </button>
            <button onClick={onRemove}
              className="p-0.5 rounded text-ink-faint hover:text-red-500 ml-0.5">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* ── 2. Styling code ───────────────────────────────────────── */}
        <div className="space-y-0.5">
          <label className="text-2xs font-bold uppercase tracking-widest text-ink-faint block">Code</label>
          <input
            type="text"
            value={styling.stylingCode}
            onChange={(e) => onUpdate({ stylingCode: e.target.value })}
            placeholder="e.g. AW26-01"
            className="w-full text-xs font-mono bg-transparent border-b border-surface-3 hover:border-ink-faint focus:border-accent focus:outline-none py-0.5 text-accent font-medium"
          />
          <p className="text-2xs text-ink-faint leading-tight">Used in D-Day timeline.</p>
        </div>

        {/* ── 3. Products ───────────────────────────────────────────── */}
        <div className="space-y-1">
          <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">Products</p>
          {products.length === 0 ? (
            <p className="text-xs text-ink-faint italic">Add products first</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggleProduct(p.id)}
                  className={`text-2xs px-2 py-0.5 rounded border transition-colors ${
                    styling.productIds.includes(p.id)
                      ? 'bg-accent text-white border-accent'
                      : 'bg-white text-ink-muted border-surface-3 hover:border-accent/40'
                  }`}
                >
                  {p.name || 'Unnamed'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── 4. Models ─────────────────────────────────────────────── */}
        <div className="space-y-1">
          <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">Models</p>
          {models.length === 0 ? (
            <p className="text-xs text-ink-faint italic">Add models first</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggleModel(m.id)}
                  className={`text-2xs px-2 py-0.5 rounded border transition-colors ${
                    styling.modelIds.includes(m.id)
                      ? 'bg-accent text-white border-accent'
                      : 'bg-white text-ink-muted border-surface-3 hover:border-accent/40'
                  }`}
                >
                  {m.name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── 5. Shot in ────────────────────────────────────────────── */}
        <div className="space-y-0.5">
          <label className="text-2xs font-bold uppercase tracking-widest text-ink-faint block">Shot in</label>
          <input
            type="text"
            value={styling.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="e.g. Studio Neutral – Group Composition"
            className="w-full text-sm font-medium bg-transparent border-b border-surface-3 hover:border-ink-faint focus:border-accent focus:outline-none py-0.5 text-ink"
          />
        </div>
      </div>
    </div>
  )
}
