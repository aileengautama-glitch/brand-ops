import { useRef } from 'react'
import { Trash2, ImagePlus, ChevronLeft, ChevronRight } from 'lucide-react'
import type { MoodboardItem } from '@/types/common'
import ImageThumbWithModal from '@/components/ui/ImageThumbWithModal'
import EmptyState from '@/components/ui/EmptyState'
import { useImageStorage } from '@/hooks/useImageStorage'
import { isValidUUID } from '@/repositories/projects'
import { MEDIA_ENTITY } from '@/lib/mediaEntityTypes'

interface MoodboardGridProps {
  items: MoodboardItem[]
  onAdd: (imageId: string, caption: string) => void
  onUpdate: (id: string, patch: Partial<MoodboardItem>) => void
  onRemove: (id: string) => void
  onReorder?: (orderedIds: string[]) => void
  /**
   * The owning project's UUID.  When provided (and valid), newly uploaded
   * images are background-synced to Supabase Storage so teammates see them.
   * Omit (or pass a non-UUID string) for pure-local / seed projects.
   */
  projectId?: string
  /** When true, hides all add/remove/reorder/upload controls and makes captions read-only. */
  readOnly?: boolean
}

export default function MoodboardGrid({ items, onAdd, onUpdate, onRemove, onReorder, projectId, readOnly }: MoodboardGridProps) {
  const { save } = useImageStorage()
  const fileRef = useRef<HTMLInputElement>(null)
  const sorted = [...items].sort((a, b) => a.order - b.order)

  // Only enable Supabase upload when the project has a real UUID.
  const hasValidProject = !!projectId && isValidUUID(projectId)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // entityId is '' because the MoodboardItem doesn't exist yet at upload time.
    // The media row's entity_id can be backfilled in D2 if needed.
    const id = await save(
      file,
      hasValidProject
        ? { projectId: projectId!, entityType: MEDIA_ENTITY.moodboardItem, entityId: '' }
        : undefined
    )
    onAdd(id, '')
    if (fileRef.current) fileRef.current.value = ''
  }

  const move = (id: string, direction: 'prev' | 'next') => {
    if (!onReorder) return
    const idx = sorted.findIndex((x) => x.id === id)
    const swapIdx = direction === 'prev' ? idx - 1 : idx + 1
    if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return
    const newOrder = sorted.map((x) => x.id)
    ;[newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]]
    onReorder(newOrder)
  }

  return (
    <div>
      {sorted.length === 0 ? (
        <EmptyState
          icon={ImagePlus}
          title="No images yet"
          description={readOnly ? undefined : 'Upload images to build the moodboard.'}
          action={
            readOnly ? undefined : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors"
              >
                <ImagePlus size={13} /> Upload image
              </button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {sorted.map((item, i) => (
            <MoodboardItemView
              key={item.id}
              item={item}
              isFirst={i === 0}
              isLast={i === sorted.length - 1}
              canReorder={!!onReorder && !readOnly}
              onUpdate={(patch) => onUpdate(item.id, patch)}
              onRemove={() => onRemove(item.id)}
              onMovePrev={() => move(item.id, 'prev')}
              onMoveNext={() => move(item.id, 'next')}
              projectId={hasValidProject ? projectId : undefined}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {sorted.length > 0 && !readOnly && (
        <button
          onClick={() => fileRef.current?.click()}
          className="mt-3 flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ImagePlus size={13} /> Add image
        </button>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ─── Single moodboard item ────────────────────────────────────────────────────

function MoodboardItemView({
  item, isFirst, isLast, canReorder,
  onUpdate, onRemove, onMovePrev, onMoveNext, projectId, readOnly,
}: {
  item: MoodboardItem
  isFirst: boolean
  isLast: boolean
  canReorder: boolean
  onUpdate: (patch: Partial<MoodboardItem>) => void
  onRemove: () => void
  onMovePrev: () => void
  onMoveNext: () => void
  projectId?: string
  readOnly?: boolean
}) {
  return (
    <div className="group space-y-1.5">
      <div className="relative">
        <ImageThumbWithModal
          imageId={item.imageId}
          size="lg"
          onUpload={readOnly ? undefined : (id) => onUpdate({ imageId: id })}
          className="w-full aspect-[4/3]"
          mediaContext={
            projectId
              ? { projectId, entityType: MEDIA_ENTITY.moodboardItem, entityId: item.id }
              : undefined
          }
        />
        {/* Controls overlay */}
        {!readOnly && (
          <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {canReorder && (
              <>
                <button
                  onClick={onMovePrev}
                  disabled={isFirst}
                  className="p-0.5 bg-white/80 rounded text-ink-muted hover:text-ink disabled:opacity-30 transition-colors"
                  title="Move left"
                >
                  <ChevronLeft size={11} />
                </button>
                <button
                  onClick={onMoveNext}
                  disabled={isLast}
                  className="p-0.5 bg-white/80 rounded text-ink-muted hover:text-ink disabled:opacity-30 transition-colors"
                  title="Move right"
                >
                  <ChevronRight size={11} />
                </button>
              </>
            )}
            <button
              onClick={onRemove}
              className="p-0.5 bg-white/80 rounded text-ink-muted hover:text-red-500 transition-colors"
              title="Remove"
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>
      <textarea
        value={item.caption}
        onChange={(e) => onUpdate({ caption: e.target.value })}
        placeholder="Description…"
        rows={2}
        readOnly={readOnly}
        className="w-full text-xs bg-transparent border-b border-transparent focus:border-surface-3 focus:outline-none text-ink-muted placeholder:text-ink-faint py-0.5 resize-none leading-snug"
      />
    </div>
  )
}
