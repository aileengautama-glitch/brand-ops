import { useRef, useState } from 'react'
import { Trash2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import type { Prop } from '@/types/common'
import ImageThumbWithModal from '@/components/ui/ImageThumbWithModal'
import { buildMediaContext } from '@/hooks/useImageStorage'
import { MEDIA_ENTITY } from '@/lib/mediaEntityTypes'

interface PropCardProps {
  prop: Prop
  isFirst: boolean
  isLast: boolean
  onUpdate: (patch: Partial<Prop>) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
  /** Owning project's UUID; enables Supabase media sync when valid. */
  projectId?: string
}

export default function PropCard({
  prop, isFirst, isLast,
  onUpdate, onRemove, onMove, projectId,
}: PropCardProps) {
  const linkRef = useRef<HTMLInputElement>(null)
  const [linkEditing, setLinkEditing] = useState(false)

  const hasLink = !!prop.link.trim()

  return (
    <div className="bg-white border border-surface-3 rounded p-3 space-y-2.5 group">
      {/* ── Header row: image + name + move/delete ──────────────────── */}
      <div className="flex items-start gap-3">
        {/* Image thumbnail */}
        <div className="shrink-0">
          <ImageThumbWithModal
            imageId={prop.imageId}
            size="md"
            objectFit="cover"
            onUpload={(id) => onUpdate({ imageId: id })}
            onRemove={() => onUpdate({ imageId: '' })}
            mediaContext={buildMediaContext(projectId, MEDIA_ENTITY.propImage, prop.id)}
          />
        </div>

        {/* Name + link */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <input
            type="text"
            value={prop.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Prop name"
            className="w-full text-sm font-medium bg-transparent border-0 border-b border-transparent hover:border-surface-3 focus:border-accent focus:outline-none py-0.5 text-ink"
          />

          {/* Link field — inline input with an open-link button */}
          <div className="flex items-center gap-1">
            {linkEditing || !hasLink ? (
              <input
                ref={linkRef}
                type="url"
                value={prop.link}
                onChange={(e) => onUpdate({ link: e.target.value })}
                onBlur={() => setLinkEditing(false)}
                onKeyDown={(e) => e.key === 'Enter' && linkRef.current?.blur()}
                placeholder="Add link (supplier, product page…)"
                className="flex-1 text-xs bg-transparent border-0 border-b border-surface-3 hover:border-ink-faint focus:border-accent focus:outline-none py-0.5 text-ink-muted placeholder:text-ink-faint"
                autoFocus={linkEditing}
              />
            ) : (
              <button
                onClick={() => setLinkEditing(true)}
                className="flex-1 text-left text-xs text-accent hover:underline truncate"
                title={prop.link}
              >
                {prop.link}
              </button>
            )}
            {hasLink && !linkEditing && (
              <a
                href={prop.link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-0.5 text-ink-faint hover:text-accent transition-colors shrink-0"
                title="Open link"
              >
                <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>

        {/* Move + delete — hover-revealed */}
        <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onMove('up')}
            disabled={isFirst}
            className="p-0.5 rounded text-ink-faint hover:text-ink disabled:opacity-30"
          >
            <ChevronUp size={12} />
          </button>
          <button
            onClick={() => onMove('down')}
            disabled={isLast}
            className="p-0.5 rounded text-ink-faint hover:text-ink disabled:opacity-30"
          >
            <ChevronDown size={12} />
          </button>
          <button
            onClick={onRemove}
            className="p-0.5 rounded text-ink-faint hover:text-red-500 mt-0.5"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* ── Amount + Use case (inline row) ──────────────────────────── */}
      <div className="flex gap-3">
        <div className="w-28 shrink-0 space-y-0.5">
          <label className="text-2xs font-bold uppercase tracking-widest text-ink-faint block">
            Qty / Amount
          </label>
          <input
            type="text"
            value={prop.amountNeeded}
            onChange={(e) => onUpdate({ amountNeeded: e.target.value })}
            placeholder="e.g. ×3, 1 set"
            className="w-full text-xs bg-transparent border-b border-surface-3 hover:border-ink-faint focus:border-accent focus:outline-none py-0.5 text-ink"
          />
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <label className="text-2xs font-bold uppercase tracking-widest text-ink-faint block">
            Use case
          </label>
          <input
            type="text"
            value={prop.useCase}
            onChange={(e) => onUpdate({ useCase: e.target.value })}
            placeholder="Where / how it's used"
            className="w-full text-xs bg-transparent border-b border-surface-3 hover:border-ink-faint focus:border-accent focus:outline-none py-0.5 text-ink"
          />
        </div>
      </div>

      {/* ── Notes ───────────────────────────────────────────────────── */}
      <div className="space-y-0.5">
        <label className="text-2xs font-bold uppercase tracking-widest text-ink-faint block">
          Notes
        </label>
        <textarea
          value={prop.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          placeholder="Additional notes…"
          rows={2}
          className="w-full text-xs bg-transparent border border-surface-3 hover:border-ink-faint focus:border-accent focus:outline-none rounded p-1.5 text-ink resize-none"
        />
      </div>
    </div>
  )
}
