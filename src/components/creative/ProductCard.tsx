import { useState } from 'react'
import { Trash2, Plus, X, ChevronDown, ChevronUp, Tag } from 'lucide-react'
import type { Product } from '@/types/shoot'
import ImageThumbWithModal from '@/components/ui/ImageThumbWithModal'
import { buildMediaContext } from '@/hooks/useImageStorage'
import { MEDIA_ENTITY } from '@/lib/mediaEntityTypes'

interface ProductCardProps {
  product: Product
  categories: string[]
  isFirst: boolean
  isLast: boolean
  onUpdate: (patch: Partial<Product>) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
  onAddUSP: (text: string) => void
  onUpdateUSP: (uspId: string, text: string) => void
  onRemoveUSP: (uspId: string) => void
  /** Owning project's UUID; enables Supabase media sync when valid. */
  projectId?: string
}

const OWNERSHIP_LABELS: Record<string, string> = {
  own: 'Own', outsource: 'Outsource', '': 'Unset',
}

export default function ProductCard({
  product, categories, isFirst, isLast,
  onUpdate, onRemove, onMove,
  onAddUSP, onUpdateUSP, onRemoveUSP,
  projectId,
}: ProductCardProps) {
  const [uspDraft, setUspDraft] = useState('')
  const [categoryOpen, setCategoryOpen] = useState(false)

  const handleAddUSP = () => {
    if (!uspDraft.trim()) return
    onAddUSP(uspDraft.trim())
    setUspDraft('')
  }

  return (
    <div className="bg-white border border-surface-3 rounded p-3 space-y-2.5 group">
      {/* Header row: image + name + ownership + move/delete */}
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <ImageThumbWithModal
            imageId={product.imageId}
            size="md"
            objectFit="contain"
            onUpload={(id) => onUpdate({ imageId: id })}
            onRemove={() => onUpdate({ imageId: '' })}
            mediaContext={buildMediaContext(projectId, MEDIA_ENTITY.productImage, product.id)}
          />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <input
            type="text"
            value={product.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Product name"
            className="w-full text-sm font-medium bg-transparent border-0 border-b border-transparent hover:border-surface-3 focus:border-accent focus:outline-none py-0.5 text-ink"
          />
          {/* Category selector */}
          <div className="relative inline-block">
            <button
              onClick={() => setCategoryOpen((o) => !o)}
              className="flex items-center gap-1 text-xs text-ink-muted border border-surface-3 rounded px-2 py-0.5 bg-surface-1 hover:bg-surface-2 transition-colors"
            >
              <Tag size={10} className="shrink-0" />
              {product.category || 'Category'}
              <ChevronDown size={9} className="text-ink-faint shrink-0" />
            </button>
            {categoryOpen && (
              <div className="absolute top-full left-0 mt-0.5 z-20 bg-white border border-surface-3 rounded shadow-md min-w-[130px] py-1">
                <button
                  onClick={() => { onUpdate({ category: '' }); setCategoryOpen(false) }}
                  className="w-full text-left px-3 py-1 text-xs text-ink-faint hover:bg-surface-1"
                >
                  — None
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { onUpdate({ category: cat }); setCategoryOpen(false) }}
                    className={`w-full text-left px-3 py-1 text-xs transition-colors ${
                      product.category === cat ? 'text-accent font-medium bg-accent/5' : 'text-ink hover:bg-surface-1'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Ownership toggle */}
          <div className="flex items-center gap-1">
            {(['own', 'outsource', ''] as const).map((val) => (
              <button
                key={val}
                onClick={() => onUpdate({ ownership: val })}
                className={`text-2xs px-2 py-0.5 rounded border transition-colors ${
                  product.ownership === val
                    ? 'bg-accent text-white border-accent'
                    : 'bg-white text-ink-muted border-surface-3 hover:border-accent/40'
                }`}
              >
                {OWNERSHIP_LABELS[val]}
              </button>
            ))}
          </div>
        </div>
        {/* Move + delete */}
        <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onMove('up')} disabled={isFirst}
            className="p-0.5 rounded text-ink-faint hover:text-ink disabled:opacity-30">
            <ChevronUp size={12} />
          </button>
          <button onClick={() => onMove('down')} disabled={isLast}
            className="p-0.5 rounded text-ink-faint hover:text-ink disabled:opacity-30">
            <ChevronDown size={12} />
          </button>
          <button onClick={onRemove}
            className="p-0.5 rounded text-ink-faint hover:text-red-500 mt-0.5">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* USPs */}
      <div className="space-y-1">
        <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">Key USPs</p>
        {product.usps.map((usp) => (
          <div key={usp.id} className="flex items-center gap-1.5">
            <span className="text-ink-faint text-xs shrink-0">·</span>
            <input
              type="text"
              value={usp.text}
              onChange={(e) => onUpdateUSP(usp.id, e.target.value)}
              className="flex-1 text-xs bg-transparent border-0 border-b border-transparent hover:border-surface-3 focus:border-accent focus:outline-none py-0 text-ink"
            />
            <button onClick={() => onRemoveUSP(usp.id)}
              className="p-0.5 text-ink-faint hover:text-red-400 transition-colors shrink-0">
              <X size={10} />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-ink-faint text-xs shrink-0">·</span>
          <input
            type="text"
            value={uspDraft}
            onChange={(e) => setUspDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddUSP()}
            placeholder="Add USP…"
            className="flex-1 text-xs bg-transparent border-0 border-b border-surface-3 focus:border-accent focus:outline-none py-0 text-ink placeholder:text-ink-faint"
          />
          <button onClick={handleAddUSP}
            className="p-0.5 text-ink-faint hover:text-accent transition-colors shrink-0">
            <Plus size={10} />
          </button>
        </div>
      </div>
    </div>
  )
}
