import { useState } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Model } from '@/types/shoot'
import ImageThumbWithModal from '@/components/ui/ImageThumbWithModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { inputCls } from '@/components/ui/FormField'
import { useShootStore } from '@/store/useShootStore'
import { MEDIA_ENTITY } from '@/lib/mediaEntityTypes'
import { buildMediaContext } from '@/hooks/useImageStorage'

interface ModelCardProps {
  model: Model
  projectId: string
  onRemove: () => void
  /** When true, hides upload/remove controls and makes fields read-only. */
  readOnly?: boolean
}

export default function ModelCard({ model, projectId, onRemove, readOnly }: ModelCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const updateModel = useShootStore((s) => s.updateModel)

  const upd = (patch: Partial<Model>) => updateModel(projectId, model.id, patch)

  const mediaContext = buildMediaContext(projectId, MEDIA_ENTITY.modelImage, model.id)

  return (
    <>
      <div className={cn('border border-surface-3 rounded bg-white', expanded && 'shadow-sm')}>
        {/* Compact row */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-1/40 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          {/* Small photo thumbnail */}
          <div className="shrink-0">
            <ImageThumbWithModal
              imageId={model.imageId}
              size="sm"
              onUpload={readOnly ? undefined : (id) => upd({ imageId: id })}
              onRemove={readOnly ? undefined : () => upd({ imageId: '' })}
              mediaContext={mediaContext}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink">{model.name}</p>
            <p className="text-xs text-ink-faint">{model.agency}</p>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-ink-faint">
            {model.height && <span>{model.height}</span>}
            {model.apparelSize && <span>Size {model.apparelSize}</span>}
          </div>

          <ChevronDown size={12} className={cn('text-ink-faint shrink-0 transition-transform', expanded && 'rotate-180')} />
        </div>

        {/* Expanded — full measurements */}
        {expanded && (
          <div className="border-t border-surface-3 px-3 pb-3 pt-2.5 space-y-3">
            <div className="flex gap-4">
              {/* Photo */}
              <ImageThumbWithModal
                imageId={model.imageId}
                size="lg"
                onUpload={readOnly ? undefined : (id) => upd({ imageId: id })}
                onRemove={readOnly ? undefined : () => upd({ imageId: '' })}
                className="w-32 h-40 shrink-0"
                mediaContext={mediaContext}
              />

              {/* Fields */}
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-2xs uppercase tracking-wide text-ink-faint block">Name</label>
                    <input type="text" value={model.name} readOnly={readOnly}
                      onChange={(e) => upd({ name: e.target.value })} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-2xs uppercase tracking-wide text-ink-faint block">Agency</label>
                    <input type="text" value={model.agency} readOnly={readOnly}
                      onChange={(e) => upd({ agency: e.target.value })} className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Height', key: 'height' as const },
                    { label: 'Shoe size', key: 'shoeSize' as const },
                    { label: 'Apparel', key: 'apparelSize' as const },
                    { label: 'Dress/Suit', key: 'dressSize' as const },
                  ].map(({ label, key }) => (
                    <div key={key} className="space-y-1">
                      <label className="text-2xs uppercase tracking-wide text-ink-faint block">{label}</label>
                      <input type="text" value={model[key]} readOnly={readOnly}
                        onChange={(e) => upd({ [key]: e.target.value })} className={inputCls} />
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-2xs uppercase tracking-wide text-ink-faint block">
                    General measurements
                  </label>
                  <input type="text" value={model.generalMeasurements} readOnly={readOnly}
                    onChange={(e) => upd({ generalMeasurements: e.target.value })}
                    placeholder="e.g. Bust 83 · Waist 60 · Hip 88"
                    className={inputCls} />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-2xs uppercase tracking-wide text-ink-faint block">Notes</label>
              <textarea value={model.notes} readOnly={readOnly}
                onChange={(e) => upd({ notes: e.target.value })}
                rows={2} placeholder="Any additional notes"
                className={cn(inputCls, 'resize-none')} />
            </div>

            {!readOnly && (
              <div className="flex justify-end pt-1 border-t border-surface-3">
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={11} /> Remove model
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog open={confirmDelete} title="Remove model"
        message={`Remove ${model.name}?`}
        onConfirm={() => { onRemove(); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)} />
    </>
  )
}
