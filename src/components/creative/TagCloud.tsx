import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Tag } from '@/types/common'
import TagChip from '@/components/ui/TagChip'

interface TagCloudProps {
  tags: Tag[]
  onAdd: (label: string) => void
  onRemove: (id: string) => void
  /** When true, hides the add input and per-tag remove controls. */
  readOnly?: boolean
}

export default function TagCloud({ tags, onAdd, onRemove, readOnly }: TagCloudProps) {
  const [draft, setDraft] = useState('')

  const handleAdd = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    // Avoid duplicates (case-insensitive)
    if (tags.some((t) => t.label.toLowerCase() === trimmed.toLowerCase())) {
      setDraft('')
      return
    }
    onAdd(trimmed)
    setDraft('')
  }

  return (
    <div className="space-y-2.5">
      {/* Tag chips */}
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 && readOnly && (
          <span className="text-xs text-ink-faint">No tags.</span>
        )}
        {tags.map((tag) => (
          <TagChip key={tag.id} label={tag.label} onRemove={readOnly ? undefined : () => onRemove(tag.id)} />
        ))}
      </div>

      {/* Add input */}
      {!readOnly && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Add tag…"
            className="text-sm border border-surface-3 rounded px-2.5 py-1 bg-white focus:outline-none focus:border-accent w-40 placeholder:text-ink-faint"
          />
          <button
            onClick={handleAdd}
            disabled={!draft.trim()}
            className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink disabled:opacity-40 transition-colors"
          >
            <Plus size={13} /> Add
          </button>
        </div>
      )}
    </div>
  )
}
