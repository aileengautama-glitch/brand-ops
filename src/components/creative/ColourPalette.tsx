import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { ColourSwatch } from '@/types/common'

interface ColourPaletteProps {
  colours: ColourSwatch[]
  onAdd: (hex: string, label?: string) => void
  onUpdate: (id: string, patch: Partial<ColourSwatch>) => void
  onRemove: (id: string) => void
  /** When true, hides add/remove controls and makes labels read-only. */
  readOnly?: boolean
}

export default function ColourPalette({ colours, onAdd, onUpdate, onRemove, readOnly }: ColourPaletteProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerHex, setPickerHex] = useState('#566246')
  const [pickerLabel, setPickerLabel] = useState('')

  const handleAdd = () => {
    onAdd(pickerHex, pickerLabel.trim())
    setPickerHex('#566246')
    setPickerLabel('')
    setPickerOpen(false)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {colours.length === 0 && readOnly && (
          <span className="text-xs text-ink-faint">No colours.</span>
        )}
        {colours.map((c) => (
          <ColourItem
            key={c.id}
            swatch={c}
            onUpdate={(patch) => onUpdate(c.id, patch)}
            onRemove={() => onRemove(c.id)}
            readOnly={readOnly}
          />
        ))}

        {/* Add new colour */}
        {!readOnly && (
          <button
            onClick={() => setPickerOpen(true)}
            className="w-10 h-10 rounded border-2 border-dashed border-surface-3 flex items-center justify-center text-ink-faint hover:border-accent/50 hover:text-ink transition-colors"
            title="Add colour"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Colour picker popover */}
      {pickerOpen && !readOnly && (
        <div className="mt-3 inline-flex flex-col gap-2 p-3 border border-surface-3 rounded bg-white shadow-md">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={pickerHex}
              onChange={(e) => setPickerHex(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-surface-3"
            />
            <input
              type="text"
              value={pickerLabel}
              onChange={(e) => setPickerLabel(e.target.value)}
              placeholder="Label (optional)"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="text-sm border border-surface-3 rounded px-2.5 py-1.5 w-36 focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors"
            >
              Add colour
            </button>
            <button
              onClick={() => setPickerOpen(false)}
              className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Single swatch ────────────────────────────────────────────────────────────

function ColourItem({
  swatch,
  onUpdate,
  onRemove,
  readOnly,
}: {
  swatch: ColourSwatch
  onUpdate: (patch: Partial<ColourSwatch>) => void
  onRemove: () => void
  readOnly?: boolean
}) {
  return (
    <div className="group flex flex-col items-center gap-1.5">
      <div className="relative">
        <div
          className="w-10 h-10 rounded border border-surface-3"
          style={{ backgroundColor: swatch.hex }}
          title={swatch.hex}
        />
        {!readOnly && (
          <button
            onClick={onRemove}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-surface-3 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-ink-faint hover:text-red-500"
          >
            <X size={9} />
          </button>
        )}
      </div>
      <input
        type="text"
        value={swatch.label || swatch.hex}
        onChange={(e) => onUpdate({ label: e.target.value })}
        readOnly={readOnly}
        className="w-12 text-center text-2xs bg-transparent border-0 border-b border-transparent focus:border-surface-3 focus:outline-none text-ink-faint truncate"
      />
    </div>
  )
}
