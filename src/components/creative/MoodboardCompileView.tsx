import { X, Printer } from 'lucide-react'
import { useStoredImage } from '@/hooks/useImageStorage'

export interface MoodboardGroup {
  label: string
  items: { imageId: string; caption?: string }[]
}

interface Props {
  title: string
  groups: MoodboardGroup[]
  onClose: () => void
}

export default function MoodboardCompileView({ title, groups, onClose }: Props) {
  const filledGroups = groups.filter((g) => g.items.some((i) => i.imageId))

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Toolbar — hidden on print */}
      <div className="sticky top-0 flex items-center justify-between px-6 py-3 border-b border-surface-3 bg-white no-print">
        <div>
          <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">Compiled Moodboard</p>
          <p className="text-sm font-semibold text-ink">{title}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors"
          >
            <Printer size={13} /> Print
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-ink-faint hover:text-ink hover:bg-surface-1 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Printable content */}
      <div className="print-area p-8">
        {/* Header */}
        <div className="mb-8 border-b-2 border-ink pb-4">
          <p className="text-2xs font-bold uppercase tracking-[0.2em] text-ink-faint mb-1">Moodboard</p>
          <h1 className="text-3xl font-bold text-ink">{title}</h1>
        </div>

        {filledGroups.length === 0 ? (
          <p className="text-sm text-ink-faint">No images to compile yet. Add images on the Creative page.</p>
        ) : (
          <div className="space-y-10">
            {filledGroups.map((group) => (
              <section key={group.label} className="no-page-break">
                <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
                  {group.label}
                </h2>
                <div className="grid grid-cols-4 gap-3">
                  {group.items
                    .filter((i) => i.imageId)
                    .map((item, idx) => (
                      <ImageCell
                        key={`${item.imageId}-${idx}`}
                        imageId={item.imageId}
                        caption={item.caption}
                      />
                    ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ImageCell({ imageId, caption }: { imageId: string; caption?: string }) {
  const url = useStoredImage(imageId || undefined)
  return (
    <div className="space-y-1">
      <div className="w-full aspect-[4/3] bg-surface-1 border border-surface-3 rounded overflow-hidden">
        {url ? (
          <img src={url} alt={caption || ''} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-faint text-xs">—</div>
        )}
      </div>
      {caption && (
        <p className="text-2xs text-ink-faint leading-tight truncate">{caption}</p>
      )}
    </div>
  )
}
