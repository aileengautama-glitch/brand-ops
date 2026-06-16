import { useRef, useState } from 'react'
import { Trash2, ImagePlus, X, Plus } from 'lucide-react'
import type { ReferenceBlock, ReferenceImage } from '@/types/event'
import { useImageStorage } from '@/hooks/useImageStorage'
import ImageThumbWithModal from '@/components/ui/ImageThumbWithModal'
import { isValidUUID } from '@/repositories/projects'
import { MEDIA_ENTITY } from '@/lib/mediaEntityTypes'

interface ReferenceBlockCardProps {
  block: ReferenceBlock
  onUpdate: (patch: Partial<ReferenceBlock>) => void
  onRemove: () => void
  onAddImage: (imageId: string) => void
  onUpdateImage: (id: string, patch: Partial<ReferenceImage>) => void
  onRemoveImage: (id: string) => void
  /**
   * The owning project's UUID.  When provided and valid, newly uploaded
   * reference images are background-synced to Supabase Storage.
   */
  projectId?: string
  /** When true, hides add/remove/upload controls and makes fields read-only. */
  readOnly?: boolean
}

export default function ReferenceBlockCard({
  block, onUpdate, onRemove, onAddImage, onUpdateImage, onRemoveImage, projectId, readOnly,
}: ReferenceBlockCardProps) {
  const { save } = useImageStorage()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const hasValidProject = !!projectId && isValidUUID(projectId)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      // entity_id is '' because the ReferenceImage record is created by the
      // store after onAddImage(id) returns — the id isn't known at upload time.
      const id = await save(
        file,
        hasValidProject
          ? { projectId: projectId!, entityType: MEDIA_ENTITY.eventReference, entityId: '' }
          : undefined
      )
      onAddImage(id)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const sorted = [...block.images].sort((a, b) => a.order - b.order)

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-lg flex flex-col min-w-0">
      {/* Block header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-surface-3">
        <input
          type="text"
          value={block.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          readOnly={readOnly}
          className="flex-1 text-sm font-semibold text-ink bg-transparent focus:outline-none border-0 border-b border-transparent hover:border-surface-3 focus:border-accent"
          placeholder="Block title…"
        />
        {!readOnly && (
          <button
            onClick={onRemove}
            className="p-0.5 text-ink-faint hover:text-red-500 transition-colors shrink-0"
            title="Remove block"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Image grid */}
      <div className="p-3 flex-1">
        {sorted.length === 0 ? (
          readOnly ? (
            <div className="w-full h-24 flex items-center justify-center border border-dashed border-surface-3 rounded bg-white text-ink-faint text-xs">
              No reference images
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-24 flex flex-col items-center justify-center border border-dashed border-surface-3 rounded bg-white hover:border-accent/40 hover:bg-surface-2/30 transition-colors text-ink-faint gap-1"
            >
              <ImagePlus size={18} />
              <span className="text-xs">{uploading ? 'Uploading…' : 'Add reference image'}</span>
            </button>
          )
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {sorted.map((img) => (
              <ReferenceImageCard
                key={img.id}
                image={img}
                onUpdate={(p) => onUpdateImage(img.id, p)}
                onRemove={() => onRemoveImage(img.id)}
                readOnly={readOnly}
              />
            ))}
            {/* Upload cell */}
            {!readOnly && (
              <button
                onClick={() => fileRef.current?.click()}
                className="h-[120px] flex flex-col items-center justify-center border border-dashed border-surface-3 rounded bg-white hover:border-accent/40 hover:bg-surface-2/30 transition-colors text-ink-faint gap-1"
              >
                {uploading ? (
                  <span className="text-xs">…</span>
                ) : (
                  <>
                    <ImagePlus size={14} />
                    <span className="text-2xs">Add image</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  )
}

// ─── Single reference image card ─────────────────────────────────────────────

function ReferenceImageCard({
  image, onUpdate, onRemove, readOnly,
}: {
  image: ReferenceImage
  onUpdate: (patch: Partial<ReferenceImage>) => void
  onRemove: () => void
  readOnly?: boolean
}) {
  const [tagDraft, setTagDraft] = useState('')

  const addTag = () => {
    const t = tagDraft.trim().replace(/^#+/, '')
    if (!t) return
    if (!image.tags.includes(t)) onUpdate({ tags: [...image.tags, t] })
    setTagDraft('')
  }

  return (
    <div className="group space-y-1.5">
      {/* Image */}
      <div className="relative">
        <ImageThumbWithModal
          imageId={image.imageId}
          size="lg"
          className="w-full h-[120px]"
          onRemove={readOnly ? undefined : onRemove}
        />
        {!readOnly && (
          <button
            onClick={onRemove}
            className="absolute top-1 right-1 p-0.5 bg-white/80 rounded text-ink-faint hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* Caption */}
      <input
        type="text"
        value={image.caption}
        onChange={(e) => onUpdate({ caption: e.target.value })}
        readOnly={readOnly}
        placeholder="Caption…"
        className="w-full text-xs bg-transparent border-0 border-b border-transparent hover:border-surface-3 focus:border-accent focus:outline-none py-0 text-ink-muted placeholder:text-ink-faint"
      />

      {/* Tags */}
      <div className="flex flex-wrap gap-1 items-center">
        {image.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 text-2xs bg-surface-2 border border-surface-3 rounded px-1.5 py-0.5 text-ink-muted"
          >
            #{tag}
            {!readOnly && (
              <button
                onClick={() => onUpdate({ tags: image.tags.filter((t) => t !== tag) })}
                className="text-ink-faint hover:text-red-400 ml-0.5"
              >
                <X size={8} />
              </button>
            )}
          </span>
        ))}
        {!readOnly && (
          <div className="flex items-center gap-0.5">
            <span className="text-2xs text-ink-faint">#</span>
            <input
              type="text"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="tag"
              className="text-2xs w-12 bg-transparent border-0 border-b border-surface-3 focus:border-accent focus:outline-none py-0 text-ink-muted placeholder:text-ink-faint"
            />
            <button onClick={addTag} className="text-ink-faint hover:text-accent transition-colors">
              <Plus size={9} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
