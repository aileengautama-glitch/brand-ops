import { useState } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import type { DDayTimelineRow, Styling } from '@/types/shoot'
import type { Model } from '@/types/shoot'
import ImageThumbWithModal from '@/components/ui/ImageThumbWithModal'
import EmptyState from '@/components/ui/EmptyState'
import { Clock } from 'lucide-react'
import { MEDIA_ENTITY } from '@/lib/mediaEntityTypes'
import { buildMediaContext } from '@/hooks/useImageStorage'
import { compareByTimeThenOrder } from '@/lib/timeUtils'

interface DDayTimelineTableProps {
  rows: DDayTimelineRow[]
  models: Model[]
  stylings?: Styling[]
  onAdd: (data: Omit<DDayTimelineRow, 'id' | 'order'>) => void
  onUpdate: (id: string, patch: Partial<DDayTimelineRow>) => void
  onRemove: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
  /** Owning project's UUID; enables Supabase media sync when valid. */
  projectId?: string
  /** When true, hides add/remove/reorder/upload controls and makes cells read-only. */
  readOnly?: boolean
}

const BLANK: Omit<DDayTimelineRow, 'id' | 'order'> = {
  imageCode: '', imageId: '', referenceImageIds: [], location: '', timeStart: '', timeEnd: '', modelIds: [], stylingId: '', notes: '',
}

export default function DDayTimelineTable({
  rows, models, stylings = [], onAdd, onUpdate, onRemove, onMove, projectId, readOnly,
}: DDayTimelineTableProps) {
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(BLANK)

  // Scheduled shot list reads chronologically; untimed rows fall back to manual order.
  const sorted = [...rows].sort(compareByTimeThenOrder)
  const d = (k: keyof typeof draft, v: unknown) => setDraft((prev) => ({ ...prev, [k]: v }))

  const handleAdd = () => {
    if (!draft.imageCode.trim() && !draft.location.trim()) return
    onAdd({ ...draft })
    setDraft(BLANK)
    setShowForm(false)
  }

  const thCls = 'text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-2 py-2 border-b border-surface-3'
  const tdCls = 'px-2 py-1.5 border-b border-surface-3 align-top'
  const cellInput = 'w-full bg-transparent text-xs text-ink focus:outline-none focus:bg-white focus:border focus:border-surface-3 rounded px-1 py-0.5'

  return (
    <div>
      {sorted.length === 0 && !showForm ? (
        <EmptyState
          icon={Clock}
          title="No D-Day timeline yet"
          description="Add rows for each shot slot on the day."
          action={
            readOnly ? undefined : (
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
                <Plus size={13} /> Add row
              </button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className={thCls} style={{ width: 70 }}>Code</th>
                <th className={thCls} style={{ width: 60 }}>Ref</th>
                <th className={thCls} style={{ width: 150 }}>References</th>
                <th className={thCls}>Location</th>
                <th className={thCls} style={{ width: 150 }}>Time</th>
                {stylings.length > 0 && <th className={thCls} style={{ width: 120 }}>Styling</th>}
                <th className={thCls}>Models</th>
                <th className={thCls}>Notes</th>
                {!readOnly && <th className={`${thCls} no-print`} style={{ width: 60 }}></th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <DDayRow
                  key={row.id}
                  row={row}
                  models={models}
                  stylings={stylings}
                  isFirst={i === 0}
                  isLast={i === sorted.length - 1}
                  onUpdate={(p) => onUpdate(row.id, p)}
                  onRemove={() => onRemove(row.id)}
                  onMove={(dir) => onMove(row.id, dir)}
                  tdCls={tdCls}
                  cellInput={cellInput}
                  projectId={projectId}
                  readOnly={readOnly}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inline add form — not visible in print */}
      {showForm && !readOnly && (
        <div className="no-print mt-3 p-3 border border-surface-3 rounded bg-surface-1 space-y-2">
          <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">New Row</p>
          <div className="grid grid-cols-5 gap-2">
            <input autoFocus type="text" placeholder="Code" value={draft.imageCode}
              onChange={(e) => d('imageCode', e.target.value)}
              className="text-sm border border-surface-3 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:border-accent" />
            <input type="text" placeholder="Location" value={draft.location}
              onChange={(e) => d('location', e.target.value)}
              className="col-span-2 text-sm border border-surface-3 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:border-accent" />
            <input type="time" value={draft.timeStart}
              onChange={(e) => d('timeStart', e.target.value)}
              className="text-sm border border-surface-3 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:border-accent" />
            <input type="time" value={draft.timeEnd}
              onChange={(e) => d('timeEnd', e.target.value)}
              className="text-sm border border-surface-3 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:border-accent" />
          </div>
          <input type="text" placeholder="Notes" value={draft.notes}
            onChange={(e) => d('notes', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="w-full text-sm border border-surface-3 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:border-accent" />
          <div className="flex gap-2">
            <button onClick={handleAdd}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
              Add row
            </button>
            <button onClick={() => { setShowForm(false); setDraft(BLANK) }}
              className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {sorted.length > 0 && !showForm && !readOnly && (
        <button onClick={() => setShowForm(true)}
          className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors px-1">
          <Plus size={13} /> Add row
        </button>
      )}
    </div>
  )
}

// ─── Inline editable D-Day row ────────────────────────────────────────────────

function DDayRow({
  row, models, stylings, isFirst, isLast, onUpdate, onRemove, onMove, tdCls, cellInput, projectId, readOnly,
}: {
  row: DDayTimelineRow
  models: Model[]
  stylings: Styling[]
  isFirst: boolean
  isLast: boolean
  onUpdate: (patch: Partial<DDayTimelineRow>) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
  tdCls: string
  cellInput: string
  projectId?: string
  readOnly?: boolean
}) {
  const mediaContext = buildMediaContext(projectId, MEDIA_ENTITY.ddayReference, row.id)
  const refImageIds = row.referenceImageIds ?? []

  const toggleModel = (modelId: string) => {
    const ids = row.modelIds.includes(modelId)
      ? row.modelIds.filter((id) => id !== modelId)
      : [...row.modelIds, modelId]
    onUpdate({ modelIds: ids })
  }

  const selectedStyling = stylings.find((s) => s.id === row.stylingId)

  return (
    <tr className="hover:bg-surface-1/30 group transition-colors">
      <td className={tdCls}>
        <input type="text" value={row.imageCode} readOnly={readOnly}
          onChange={(e) => onUpdate({ imageCode: e.target.value })}
          className={`${cellInput} font-medium`} />
      </td>
      <td className={tdCls}>
        <ImageThumbWithModal
          imageId={row.imageId}
          size="sm"
          onUpload={readOnly ? undefined : (id) => onUpdate({ imageId: id })}
          onRemove={readOnly ? undefined : () => onUpdate({ imageId: '' })}
          mediaContext={mediaContext}
        />
      </td>
      <td className={tdCls}>
        {/* Additional shot references — paste/upload multiple; each flows into the brief deck */}
        <div className="flex flex-wrap gap-1">
          {refImageIds.map((rid, i) => (
            <ImageThumbWithModal
              key={`${rid}-${i}`}
              imageId={rid}
              size="sm"
              onRemove={readOnly ? undefined : () => onUpdate({ referenceImageIds: refImageIds.filter((_, idx) => idx !== i) })}
              mediaContext={mediaContext}
            />
          ))}
          {!readOnly && (
            <div className="no-print">
              <ImageThumbWithModal
                imageId=""
                size="sm"
                onUpload={(id) => onUpdate({ referenceImageIds: [...refImageIds, id] })}
                mediaContext={mediaContext}
              />
            </div>
          )}
          {readOnly && refImageIds.length === 0 && <span className="text-xs text-ink-faint">—</span>}
        </div>
      </td>
      <td className={tdCls}>
        <textarea value={row.location} readOnly={readOnly}
          onChange={(e) => onUpdate({ location: e.target.value })}
          rows={2}
          className={`${cellInput} resize-none leading-snug`} />
      </td>
      <td className={tdCls}>
        <div className="flex items-center gap-1 text-xs">
          <input type="time" value={row.timeStart} readOnly={readOnly}
            onChange={(e) => onUpdate({ timeStart: e.target.value })}
            className={cellInput} style={{ minWidth: 72 }} />
          <span className="text-ink-faint shrink-0">–</span>
          <input type="time" value={row.timeEnd} readOnly={readOnly}
            onChange={(e) => onUpdate({ timeEnd: e.target.value })}
            className={cellInput} style={{ minWidth: 72 }} />
        </div>
      </td>
      {stylings.length > 0 && (
        <td className={tdCls}>
          <select
            value={row.stylingId}
            onChange={(e) => onUpdate({ stylingId: e.target.value })}
            disabled={readOnly}
            className="w-full bg-transparent text-xs text-ink focus:outline-none focus:bg-white rounded px-1 py-0.5 border-0 disabled:opacity-100"
          >
            <option value="">—</option>
            {stylings.map((s) => (
              <option key={s.id} value={s.id}>
                {s.stylingCode}{s.name ? ` · ${s.name}` : ''}
              </option>
            ))}
          </select>
          {selectedStyling && (
            <span className="text-2xs text-accent font-mono block truncate px-1">
              {selectedStyling.stylingCode}
            </span>
          )}
        </td>
      )}
      <td className={tdCls}>
        <div className="flex flex-wrap gap-1">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => toggleModel(m.id)}
              disabled={readOnly}
              className={`text-2xs px-1.5 py-0.5 rounded border transition-colors ${
                row.modelIds.includes(m.id)
                  ? 'bg-accent text-white border-accent'
                  : 'bg-white text-ink-muted border-surface-3 hover:border-accent/40'
              } disabled:cursor-default`}
            >
              {m.name.split(' ')[0]}
            </button>
          ))}
          {models.length === 0 && <span className="text-xs text-ink-faint">—</span>}
        </div>
        {/* Print fallback — buttons are hidden in @media print */}
        <span className="print-only text-xs text-ink">
          {row.modelIds.length > 0
            ? row.modelIds.map((mid) => models.find((m) => m.id === mid)?.name.split(' ')[0]).filter(Boolean).join(', ')
            : '—'}
        </span>
      </td>
      <td className={tdCls}>
        <textarea value={row.notes} readOnly={readOnly}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          placeholder="—"
          rows={2}
          className={`${cellInput} resize-none leading-snug`} />
      </td>
      {!readOnly && (
        <td className={`${tdCls} no-print`}>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onMove('up')} disabled={isFirst}
              className="p-0.5 rounded text-ink-faint hover:text-ink disabled:opacity-30">
              <ArrowUp size={11} />
            </button>
            <button onClick={() => onMove('down')} disabled={isLast}
              className="p-0.5 rounded text-ink-faint hover:text-ink disabled:opacity-30">
              <ArrowDown size={11} />
            </button>
            <button onClick={onRemove}
              className="p-0.5 rounded text-ink-faint hover:text-red-500">
              <Trash2 size={11} />
            </button>
          </div>
        </td>
      )}
    </tr>
  )
}
