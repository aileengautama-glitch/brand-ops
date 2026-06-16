import { useRef } from 'react'
import { Trash2, ImagePlus, ChevronUp, ChevronDown } from 'lucide-react'
import type { SketchBlock } from '@/types/event'
import { useStoredImage, useImageStorage, type MediaContext } from '@/hooks/useImageStorage'
import { inputCls } from '@/components/ui/FormField'
import { cn } from '@/lib/utils'
import { isValidUUID } from '@/repositories/projects'
import { MEDIA_ENTITY } from '@/lib/mediaEntityTypes'

interface SketchBlockCardProps {
  block: SketchBlock
  isFirst: boolean
  isLast: boolean
  onUpdate: (patch: Partial<SketchBlock>) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
  /**
   * The owning project's UUID.  When provided and valid, the uploaded
   * sketch/render image is background-synced to Supabase Storage.
   */
  projectId?: string
  /** When true, hides move/remove/upload controls and makes fields read-only. */
  readOnly?: boolean
}

function SketchImageSlot({
  imageId,
  onUpload,
  mediaContext,
  readOnly,
}: {
  imageId: string
  onUpload: (id: string) => void
  mediaContext?: MediaContext
  readOnly?: boolean
}) {
  const url = useStoredImage(imageId || undefined)
  const { save } = useImageStorage()
  const fileRef = useRef<HTMLInputElement>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const id = await save(file, mediaContext)
    onUpload(id)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div
      className={cn(
        'w-full aspect-[4/3] rounded overflow-hidden bg-surface-1 border border-surface-3 relative group',
        !readOnly && 'cursor-pointer',
      )}
      onClick={() => { if (!readOnly) fileRef.current?.click() }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      {url ? (
        <>
          <img src={url} alt="Sketch or render" className="w-full h-full object-cover" />
          {!readOnly && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium flex items-center gap-1">
                <ImagePlus size={13} /> Replace
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-ink-faint">
          <ImagePlus size={20} />
          <span className="text-xs">{readOnly ? 'No image' : 'Add sketch / render'}</span>
        </div>
      )}
    </div>
  )
}

export default function SketchBlockCard({
  block, isFirst, isLast, onUpdate, onRemove, onMove, projectId, readOnly,
}: SketchBlockCardProps) {
  const hasValidProject = !!projectId && isValidUUID(projectId)

  return (
    <div className="bg-white border border-surface-3 rounded overflow-hidden group">
      {/* Image */}
      <SketchImageSlot
        imageId={block.imageId}
        onUpload={(id) => onUpdate({ imageId: id })}
        readOnly={readOnly}
        mediaContext={
          hasValidProject
            ? { projectId: projectId!, entityType: MEDIA_ENTITY.eventSketch, entityId: block.id }
            : undefined
        }
      />

      <div className="p-3 space-y-2">
        {/* Header row: title + controls */}
        <div className="flex items-start gap-2">
          <input
            type="text"
            value={block.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            readOnly={readOnly}
            placeholder="Title / concept name"
            className="flex-1 text-sm font-semibold bg-transparent border-b border-surface-3 hover:border-ink-faint focus:border-accent focus:outline-none py-0.5 text-ink"
          />
          {!readOnly && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
          )}
        </div>

        {/* Description */}
        <textarea
          value={block.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          readOnly={readOnly}
          placeholder="Description or notes…"
          rows={2}
          className={cn(inputCls, 'resize-none text-xs')}
        />

        {/* Vendor */}
        <div className="space-y-0.5">
          <label className="text-2xs font-bold uppercase tracking-widest text-ink-faint block">
            Vendor / Artist
          </label>
          <input
            type="text"
            value={block.vendor}
            onChange={(e) => onUpdate({ vendor: e.target.value })}
            readOnly={readOnly}
            placeholder="e.g. Visualiser Studio, 3D artist name"
            className={cn(inputCls, 'text-xs')}
          />
        </div>
      </div>
    </div>
  )
}
