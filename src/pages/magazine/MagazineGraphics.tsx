import { useRef, useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  Plus, Layers, Trash2, ImagePlus, ZoomIn, X,
  ChevronUp, ChevronDown, ExternalLink, Link2, Image as ImageIcon,
} from 'lucide-react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { MagazineGraphicRepository, MagazineGraphicsInspoRepository } from '@/repositories'
import { useCurrentMagazineProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
  useStoredImage, useImageStorage, buildMediaContext,
  type MediaContext,
} from '@/hooks/useImageStorage'
import ImageDropZone from '@/components/ui/ImageDropZone'
import { MEDIA_ENTITY } from '@/lib/mediaEntityTypes'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { inputCls } from '@/components/ui/FormField'
import { cn, generateId } from '@/lib/utils'
import type { Graphic, GraphicStatus, Article, VisualProject, GraphicsInspoItem } from '@/types/magazine'

// ─── Status config ─────────────────────────────────────────────────────────────

const GRAPHIC_STATUS_CONFIG: Record<GraphicStatus, { label: string; chipCls: string }> = {
  brief:  { label: 'Brief',     chipCls: 'bg-surface-3 text-ink-muted' },
  design: { label: 'Design',    chipCls: 'bg-amber-100 text-amber-700' },
  review: { label: 'In Review', chipCls: 'bg-blue-100  text-blue-700'  },
  final:  { label: 'Final',     chipCls: 'bg-green-100 text-green-700' },
}
const STATUS_KEYS = Object.keys(GRAPHIC_STATUS_CONFIG) as GraphicStatus[]
type FilterVal = GraphicStatus | 'all'

const labelCls = 'text-2xs font-bold uppercase tracking-widest text-ink-faint block'

// ─── Reference image slot (small, aspect-square) ────────────────────────────────

function GraphicImageSlot({
  imageId, onUpload, onRemove, mediaContext,
}: {
  imageId: string
  onUpload?: (id: string) => void
  onRemove?: () => void
  mediaContext?: MediaContext
}) {
  const url     = useStoredImage(imageId || undefined)
  const { save } = useImageStorage()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [lightbox, setLightbox] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onUpload) return
    const id = await save(file, mediaContext)
    onUpload(id)
    if (fileRef.current) fileRef.current.value = ''
  }

  if (url) {
    return (
      <>
        <div className="relative group aspect-square rounded overflow-hidden border border-surface-3 bg-surface-1">
          <img src={url} alt="Reference" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/20 transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1">
            <button onClick={() => setLightbox(true)} className="p-1 bg-white/90 rounded text-ink hover:bg-white transition-colors"><ZoomIn size={10} /></button>
            {onRemove && <button onClick={onRemove} className="p-1 bg-white/90 rounded text-ink hover:bg-white transition-colors"><X size={10} /></button>}
          </div>
        </div>
        {lightbox && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 p-8" onClick={() => setLightbox(false)}>
            <button onClick={() => setLightbox(false)} className="absolute top-4 right-4 p-2 bg-white/10 rounded text-white hover:bg-white/20 transition-colors"><X size={16} /></button>
            <img src={url} alt="Reference" className="max-w-full max-h-full object-contain rounded shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </>
    )
  }

  return (
    <div className="aspect-square rounded bg-surface-1 border border-dashed border-surface-3 flex items-center justify-center cursor-pointer hover:bg-surface-2 transition-colors group" onClick={() => fileRef.current?.click()}>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      <ImagePlus size={12} className="text-ink-faint group-hover:text-ink-muted transition-colors" />
    </div>
  )
}

// ─── Deliverable preview (large) ────────────────────────────────────────────────

function GraphicPreview({
  imageId, onUpload, onRemove, mediaContext, readOnly,
}: {
  imageId: string
  onUpload: (id: string) => void
  onRemove: () => void
  mediaContext?: MediaContext
  readOnly: boolean
}) {
  const url      = useStoredImage(imageId || undefined)
  const { save } = useImageStorage()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [lightbox, setLightbox] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const id = await save(file, mediaContext)
    onUpload(id)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-1">
      <label className={labelCls}>Deliverable preview</label>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      {url ? (
        <>
          <div className="relative group rounded overflow-hidden border border-surface-3 bg-[repeating-conic-gradient(#f4f4f4_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
            <img src={url} alt="Deliverable preview" className="w-full max-h-72 object-contain mx-auto" />
            <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/15 transition-colors opacity-0 group-hover:opacity-100 flex items-start justify-end p-2 gap-1">
              <button onClick={() => setLightbox(true)} className="p-1.5 bg-white/90 rounded text-ink hover:bg-white transition-colors" title="Zoom"><ZoomIn size={12} /></button>
              {!readOnly && (
                <>
                  <button onClick={() => fileRef.current?.click()} className="p-1.5 bg-white/90 rounded text-ink hover:bg-white transition-colors" title="Replace"><ImagePlus size={12} /></button>
                  <button onClick={onRemove} className="p-1.5 bg-white/90 rounded text-ink hover:bg-white transition-colors" title="Remove"><X size={12} /></button>
                </>
              )}
            </div>
          </div>
          {lightbox && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 p-8" onClick={() => setLightbox(false)}>
              <button onClick={() => setLightbox(false)} className="absolute top-4 right-4 p-2 bg-white/10 rounded text-white hover:bg-white/20 transition-colors"><X size={16} /></button>
              <img src={url} alt="Deliverable preview" className="max-w-full max-h-full object-contain rounded shadow-2xl" onClick={(e) => e.stopPropagation()} />
            </div>
          )}
        </>
      ) : readOnly ? (
        <div className="rounded border border-dashed border-surface-3 bg-surface-1 py-8 flex flex-col items-center justify-center text-ink-faint">
          <ImageIcon size={20} className="mb-1 opacity-50" />
          <span className="text-2xs">No preview yet</span>
        </div>
      ) : (
        <div onClick={() => fileRef.current?.click()} className="rounded border border-dashed border-surface-3 bg-surface-1 py-8 flex flex-col items-center justify-center cursor-pointer hover:bg-surface-2 hover:border-accent/40 transition-colors">
          <ImagePlus size={20} className="text-ink-faint mb-1" />
          <span className="text-2xs text-ink-faint">Upload current design / screenshot</span>
        </div>
      )}
    </div>
  )
}

// ─── GraphicCard ───────────────────────────────────────────────────────────────

function GraphicCard({
  graphic, cardNumber, articles, visualProjects,
  onUpdate, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown,
  projectId, readOnly,
}: {
  graphic: Graphic
  cardNumber: number
  articles: Article[]
  visualProjects: VisualProject[]
  onUpdate: (patch: Partial<Graphic>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  projectId: string
  readOnly: boolean
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const statusCfg     = GRAPHIC_STATUS_CONFIG[graphic.status] ?? GRAPHIC_STATUS_CONFIG.brief
  const refContext    = buildMediaContext(projectId, MEDIA_ENTITY.graphicRef, graphic.id)
  const previewContext = buildMediaContext(projectId, MEDIA_ENTITY.graphicPreview, graphic.id)

  const handleAddImage = (imageId: string) => {
    if (graphic.imageIds.length >= 4) return
    onUpdate({ imageIds: [...graphic.imageIds, imageId] })
  }
  const handleRemoveImage = (idx: number) =>
    onUpdate({ imageIds: graphic.imageIds.filter((_, i) => i !== idx) })

  // Delivery links (nested array, persisted via updateGraphic)
  const addLink = () => onUpdate({ resultLinks: [...graphic.resultLinks, { id: generateId(), label: '', url: '' }] })
  const updateLink = (linkId: string, patch: Partial<{ label: string; url: string }>) =>
    onUpdate({ resultLinks: graphic.resultLinks.map((l) => (l.id === linkId ? { ...l, ...patch } : l)) })
  const removeLink = (linkId: string) =>
    onUpdate({ resultLinks: graphic.resultLinks.filter((l) => l.id !== linkId) })

  return (
    <>
      <div className="bg-white border border-surface-3 rounded-lg overflow-hidden">
        {/* Card header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-surface-1 border-b border-surface-3">
          <span className="text-2xs font-bold uppercase tracking-widest text-ink-faint w-5 shrink-0 tabular-nums">{cardNumber}</span>
          <input
            type="text" value={graphic.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            disabled={readOnly} placeholder="Graphic title…"
            className="flex-1 text-sm font-semibold bg-transparent border-none outline-none text-ink placeholder:text-ink-faint min-w-0 disabled:opacity-60"
          />
          {readOnly ? (
            <span className={cn('text-2xs font-medium px-2 py-0.5 rounded shrink-0', statusCfg.chipCls)}>{statusCfg.label}</span>
          ) : (
            <select
              value={graphic.status}
              onChange={(e) => onUpdate({ status: e.target.value as GraphicStatus })}
              className={cn('text-xs font-semibold px-2 py-0.5 rounded border-none outline-none cursor-pointer shrink-0', statusCfg.chipCls)}
            >
              {STATUS_KEYS.map((s) => <option key={s} value={s}>{GRAPHIC_STATUS_CONFIG[s].label}</option>)}
            </select>
          )}
          {!readOnly && (
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={onMoveUp} disabled={!canMoveUp} className="p-1 rounded text-ink-faint hover:text-ink hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-default" title="Move up"><ChevronUp size={11} /></button>
              <button onClick={onMoveDown} disabled={!canMoveDown} className="p-1 rounded text-ink-faint hover:text-ink hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-default" title="Move down"><ChevronDown size={11} /></button>
              <button onClick={() => setConfirmDelete(true)} className="p-1 rounded text-ink-faint hover:text-red-500 transition-colors ml-0.5" title="Delete graphic"><Trash2 size={12} /></button>
            </div>
          )}
        </div>

        <div className="p-3 space-y-3">
          {/* Deliverable preview — prominent */}
          <GraphicPreview
            imageId={graphic.previewImageId}
            onUpload={(imgId) => onUpdate({ previewImageId: imgId })}
            onRemove={() => onUpdate({ previewImageId: '' })}
            mediaContext={previewContext}
            readOnly={readOnly}
          />

          {/* Format + Assignee */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-0.5">
              <label className={labelCls}>Format / Size</label>
              <input type="text" value={graphic.formatDetail} onChange={(e) => onUpdate({ formatDetail: e.target.value })} disabled={readOnly} placeholder="e.g. A4 portrait · 300 dpi" className={cn(inputCls, 'text-xs', readOnly && 'opacity-60')} />
            </div>
            <div className="space-y-0.5">
              <label className={labelCls}>Assignee</label>
              <input type="text" value={graphic.assignee} onChange={(e) => onUpdate({ assignee: e.target.value })} disabled={readOnly} placeholder="Designer name" className={cn(inputCls, 'text-xs', readOnly && 'opacity-60')} />
            </div>
          </div>

          {/* Design brief */}
          <div className="space-y-0.5">
            <label className={labelCls}>Design brief</label>
            <textarea value={graphic.brief} onChange={(e) => onUpdate({ brief: e.target.value })} disabled={readOnly} rows={2} placeholder="What this deliverable needs to achieve, creative direction, constraints…" className={cn(inputCls, 'resize-none text-xs', readOnly && 'opacity-60')} />
          </div>

          {/* Reference images — inspiration / refs for this deliverable */}
          <div className="space-y-1">
            <label className={labelCls}>Reference images <span className="font-normal normal-case tracking-normal text-ink-faint/70">(up to 4)</span></label>
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 4 }).map((_, i) => {
                const imgId    = graphic.imageIds[i] ?? ''
                const isFilled = i < graphic.imageIds.length
                return (
                  <GraphicImageSlot
                    key={i}
                    imageId={imgId}
                    onUpload={!isFilled && !readOnly ? handleAddImage : undefined}
                    onRemove={isFilled && !readOnly ? () => handleRemoveImage(i) : undefined}
                    mediaContext={refContext}
                  />
                )
              })}
            </div>
          </div>

          {/* Backlinks — Writing + Visual work */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-0.5">
              <label className={labelCls}>Related writing</label>
              {readOnly ? (
                <p className="text-xs text-ink-muted">{articles.find((a) => a.id === graphic.articleId)?.title ?? '—'}</p>
              ) : (
                <select value={graphic.articleId} onChange={(e) => onUpdate({ articleId: e.target.value })} className={cn(inputCls, 'text-xs')}>
                  <option value="">— none —</option>
                  {articles.map((a) => <option key={a.id} value={a.id}>{a.title || 'Untitled'}</option>)}
                </select>
              )}
            </div>
            <div className="space-y-0.5">
              <label className={labelCls}>Related visual</label>
              {readOnly ? (
                <p className="text-xs text-ink-muted">{visualProjects.find((v) => v.id === graphic.visualProjectId)?.name ?? '—'}</p>
              ) : (
                <select value={graphic.visualProjectId} onChange={(e) => onUpdate({ visualProjectId: e.target.value })} className={cn(inputCls, 'text-xs')}>
                  <option value="">— none —</option>
                  {visualProjects.map((v) => <option key={v.id} value={v.id}>{v.name || 'Untitled visual'}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Delivery & final links */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className={labelCls}>Delivery &amp; final links</label>
              {!readOnly && (
                <button onClick={addLink} className="flex items-center gap-1 text-2xs text-ink-muted hover:text-accent transition-colors">
                  <Plus size={11} /> Add link
                </button>
              )}
            </div>
            {graphic.resultLinks.length === 0 ? (
              <p className="text-2xs text-ink-faint italic">No delivery links yet.</p>
            ) : (
              <div className="space-y-1">
                {graphic.resultLinks.map((link) => (
                  <div key={link.id} className="flex items-center gap-1.5 border border-surface-3 rounded px-2 py-1 bg-white">
                    <Link2 size={12} className="text-ink-faint shrink-0" />
                    {readOnly ? (
                      <>
                        <span className="text-xs text-ink shrink-0 max-w-[40%] truncate">{link.label || 'Link'}</span>
                        <span className="flex-1 text-2xs text-ink-faint truncate">{link.url}</span>
                      </>
                    ) : (
                      <>
                        <input type="text" value={link.label} onChange={(e) => updateLink(link.id, { label: e.target.value })} placeholder="Label" className="w-1/3 text-xs bg-transparent outline-none text-ink placeholder:text-ink-faint border-r border-surface-2 pr-1.5" />
                        <input type="url" value={link.url} onChange={(e) => updateLink(link.id, { url: e.target.value })} placeholder="https://dropbox.com/…" className="flex-1 text-2xs bg-transparent outline-none text-ink-secondary placeholder:text-ink-faint" />
                      </>
                    )}
                    {link.url && (
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-0.5 rounded text-ink-faint hover:text-accent hover:bg-surface-1 transition-colors shrink-0" title="Open"><ExternalLink size={11} /></a>
                    )}
                    {!readOnly && (
                      <button onClick={() => removeLink(link.id)} className="p-0.5 rounded text-ink-faint hover:text-red-500 transition-colors shrink-0" title="Remove"><X size={11} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Revision notes */}
          <div className="space-y-0.5">
            <label className={labelCls}>Revision notes</label>
            <textarea value={graphic.notes} onChange={(e) => onUpdate({ notes: e.target.value })} disabled={readOnly} rows={2} placeholder="Revision notes, status updates…" className={cn(inputCls, 'resize-none text-xs', readOnly && 'opacity-60')} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete graphic"
        message={`Delete "${graphic.title || 'Untitled graphic'}"?`}
        confirmLabel="Delete"
        onConfirm={() => { onRemove(); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

// ─── InspoTile (section inspiration board) ──────────────────────────────────────

function InspoTile({
  item, onUpdate, onRemove, projectId, readOnly,
}: {
  item: GraphicsInspoItem
  onUpdate: (patch: Partial<GraphicsInspoItem>) => void
  onRemove: () => void
  projectId: string
  readOnly: boolean
}) {
  const url      = useStoredImage(item.imageId || undefined)
  const { save } = useImageStorage()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [lightbox, setLightbox] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ctx = buildMediaContext(projectId, MEDIA_ENTITY.graphicsInspo, item.id)
    const newId = await save(file, ctx)
    onUpdate({ imageId: newId })
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="bg-white border border-surface-3 rounded overflow-hidden flex flex-col">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      {/* Image area */}
      <div
        className={cn('relative group aspect-[4/3] bg-surface-1', !url && !readOnly && 'cursor-pointer')}
        onClick={() => !url && !readOnly && fileRef.current?.click()}
      >
        {url ? (
          <>
            <img src={url} alt={item.caption || 'Inspiration'} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/20 transition-colors opacity-0 group-hover:opacity-100 flex items-start justify-end p-1.5 gap-1">
              <button onClick={() => setLightbox(true)} className="p-1 bg-white/90 rounded text-ink hover:bg-white transition-colors"><ZoomIn size={10} /></button>
              {!readOnly && <button onClick={() => onUpdate({ imageId: '' })} className="p-1 bg-white/90 rounded text-ink hover:bg-white transition-colors" title="Remove image"><X size={10} /></button>}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-ink-faint">
            <ImagePlus size={16} className="mb-1" />
            {!readOnly && <span className="text-2xs">Upload</span>}
          </div>
        )}
      </div>

      {/* Caption + source + delete */}
      <div className="p-1.5 space-y-1">
        {readOnly ? (
          <p className="text-2xs text-ink-muted line-clamp-2 min-h-[1.5em]">{item.caption || '—'}</p>
        ) : (
          <input type="text" value={item.caption} onChange={(e) => onUpdate({ caption: e.target.value })} placeholder="Caption…" className="w-full text-2xs bg-transparent outline-none text-ink placeholder:text-ink-faint" />
        )}
        <div className="flex items-center gap-1">
          {readOnly ? (
            item.sourceUrl ? (
              <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-2xs text-accent hover:underline truncate"><ExternalLink size={9} /> source</a>
            ) : <span className="text-2xs text-ink-faint/60">—</span>
          ) : (
            <input type="url" value={item.sourceUrl} onChange={(e) => onUpdate({ sourceUrl: e.target.value })} placeholder="source url" className="flex-1 text-2xs bg-transparent outline-none text-ink-faint placeholder:text-ink-faint/60" />
          )}
          {item.sourceUrl && !readOnly && (
            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-ink-faint hover:text-accent transition-colors shrink-0" title="Open"><ExternalLink size={10} /></a>
          )}
          {!readOnly && (
            <button onClick={onRemove} className="text-ink-faint hover:text-red-500 transition-colors shrink-0" title="Delete"><Trash2 size={10} /></button>
          )}
        </div>
      </div>

      {lightbox && url && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 p-8" onClick={() => setLightbox(false)}>
          <button onClick={() => setLightbox(false)} className="absolute top-4 right-4 p-2 bg-white/10 rounded text-white hover:bg-white/20 transition-colors"><X size={16} /></button>
          <img src={url} alt={item.caption || 'Inspiration'} className="max-w-full max-h-full object-contain rounded shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MagazineGraphics() {
  const { id }        = useParams<{ id: string }>()
  const project       = useCurrentMagazineProject()
  const updateProject = useMagazineStore((s) => s.updateProject)
  const addGraphic    = useMagazineStore((s) => s.addGraphic)
  const updateGraphic = useMagazineStore((s) => s.updateGraphic)
  const removeGraphic = useMagazineStore((s) => s.removeGraphic)
  const moveGraphic   = useMagazineStore((s) => s.moveGraphic)
  const addInspo      = useMagazineStore((s) => s.addGraphicsInspo)
  const updateInspo   = useMagazineStore((s) => s.updateGraphicsInspo)
  const removeInspo   = useMagazineStore((s) => s.removeGraphicsInspo)
  const { canEdit }   = useCurrentUser()
  const readOnly      = !canEdit('magazine.graphics', id)

  // Image intake → new inspiration tile(s): click to pick, drag & drop, or paste (jpg/png).
  const { save }                = useImageStorage()
  const addInspoWithImage       = useMagazineStore((s) => s.addGraphicsInspoWithImage)
  const [pasteToast, setPasteToast] = useState<string | null>(null)
  const handleInspoFiles = useCallback(async (files: File[]) => {
    if (!id) return
    for (const file of files) {
      const imageId = await save(file)
      addInspoWithImage(id, imageId)
    }
    setPasteToast(`Added ${files.length} image${files.length > 1 ? 's' : ''} to inspiration board`)
    window.setTimeout(() => setPasteToast(null), 2500)
  }, [id, save, addInspoWithImage])

  const [filter, setFilter] = useState<FilterVal>('all')

  // Phase 5F — Supabase-first read of this project's graphics. Fetched once per
  // project; null = no Supabase answer (disabled / non-UUID / error / no rows).
  const [remoteGraphics, setRemoteGraphics] = useState<Graphic[] | null>(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    MagazineGraphicRepository.list(id).then((rows) => {
      if (!cancelled) setRemoteGraphics(rows)
    })
    return () => { cancelled = true }
  }, [id])

  // Phase 5K — Supabase-first read of this project's graphics inspiration tiles.
  // Independent of the graphics fetch above (separate state + effect, same [id] key).
  const [remoteGraphicsInspo, setRemoteGraphicsInspo] = useState<GraphicsInspoItem[] | null>(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    MagazineGraphicsInspoRepository.list(id).then((rows) => {
      if (!cancelled) setRemoteGraphicsInspo(rows)
    })
    return () => { cancelled = true }
  }, [id])

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const articles       = project.articles ?? []
  const visualProjects = project.visualProjects ?? []
  // Read authority (Phase 5K + 5F): Supabase rows when present, else the local store copy.
  // Two independent Supabase-first reads — graphicsInspo and graphics — each resolving
  // remote ?? local. Until the tables are populated they fall back to local (no UI change).
  const inspo          = [...(remoteGraphicsInspo ?? project.graphicsInspo ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const sorted   = [...(remoteGraphics ?? project.graphics ?? [])].sort((a, b) => a.order - b.order)
  const filtered = filter === 'all' ? sorted : sorted.filter((g) => g.status === filter)
  const counts   = Object.fromEntries(
    STATUS_KEYS.map((s) => [s, sorted.filter((g) => g.status === s).length])
  ) as Record<GraphicStatus, number>

  const addBtn = !readOnly ? (
    <button onClick={() => addGraphic(id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
      <Plus size={13} /> Add graphic
    </button>
  ) : undefined

  return (
    <div className="p-6 max-w-6xl">
      <ProjectHeader
        name={project.name}
        description={project.description}
        onUpdateName={(name) => updateProject(id, { name })}
        onUpdateDescription={(description) => updateProject(id, { description })}
      />

      {pasteToast && (
        <div className="fixed bottom-5 right-5 z-50 px-3.5 py-2 rounded-lg bg-ink text-white text-xs shadow-lg">
          {pasteToast}
        </div>
      )}

      {/* Inspiration board — separate from deliverables, same section */}
      <PageSection
        label={`Inspiration — ${inspo.length}`}
        actions={!readOnly ? (
          <button onClick={() => addInspo(id)} className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-surface-2 text-ink-secondary rounded hover:bg-surface-3 transition-colors">
            <Plus size={12} /> Add inspiration
          </button>
        ) : undefined}
      >
        <p className="text-xs text-ink-faint mb-3">Type, layout, and palette references for the issue's design — kept separate from the deliverables below.{!readOnly && <span className="text-ink-muted"> Click, drag &amp; drop, or paste images (JPG/PNG) to add.</span>}</p>
        {inspo.length === 0 && readOnly ? (
          <p className="text-xs text-ink-faint italic">No inspiration added yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {inspo.map((item) => (
              <InspoTile
                key={item.id}
                item={item}
                onUpdate={(patch) => updateInspo(id, item.id, patch)}
                onRemove={() => removeInspo(id, item.id)}
                projectId={id}
                readOnly={readOnly}
              />
            ))}
            {!readOnly && (
              <div onClick={() => addInspo(id)} className="aspect-[4/3] flex flex-col items-center justify-center border border-dashed border-surface-3 rounded cursor-pointer hover:bg-surface-1 hover:border-accent/40 transition-colors">
                <Plus size={16} className="text-ink-faint mb-1" />
                <span className="text-2xs text-ink-faint">Add</span>
              </div>
            )}
          </div>
        )}
        {!readOnly && (
          <ImageDropZone onFiles={handleInspoFiles} compact className="mt-3" />
        )}
      </PageSection>

      {/* Deliverables */}
      <PageSection label="Deliverables" actions={addBtn}>
      {sorted.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No graphics yet"
          description="Track design deliverables — covers, spreads, ads, and infographics."
          action={addBtn}
        />
      ) : (
        <>
          {/* Status summary chips */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {STATUS_KEYS.filter((s) => counts[s] > 0).map((s) => (
              <span key={s} className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full', GRAPHIC_STATUS_CONFIG[s].chipCls)}>
                {counts[s]} {GRAPHIC_STATUS_CONFIG[s].label}
              </span>
            ))}
            <span className="text-xs text-ink-faint">{sorted.length} total</span>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap items-center gap-1 mb-5">
            {(['all', ...STATUS_KEYS] as FilterVal[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn('px-3 py-1 text-xs rounded transition-colors', filter === f ? 'bg-accent text-white font-medium' : 'text-ink-muted hover:text-ink hover:bg-surface-2')}
              >
                {f === 'all' ? `All (${sorted.length})` : `${GRAPHIC_STATUS_CONFIG[f].label} (${counts[f]})`}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="bg-surface-1 border border-dashed border-surface-3 rounded-lg p-8 text-center">
              <p className="text-sm text-ink-muted">No graphics match this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filtered.map((graphic) => {
                const sortedIdx = sorted.indexOf(graphic)
                return (
                  <GraphicCard
                    key={graphic.id}
                    graphic={graphic}
                    cardNumber={sortedIdx + 1}
                    articles={articles}
                    visualProjects={visualProjects}
                    onUpdate={(patch) => updateGraphic(id, graphic.id, patch)}
                    onRemove={() => removeGraphic(id, graphic.id)}
                    onMoveUp={() => moveGraphic(id, graphic.id, 'up')}
                    onMoveDown={() => moveGraphic(id, graphic.id, 'down')}
                    canMoveUp={sortedIdx > 0}
                    canMoveDown={sortedIdx < sorted.length - 1}
                    projectId={id}
                    readOnly={readOnly}
                  />
                )
              })}
            </div>
          )}
        </>
      )}
      </PageSection>
    </div>
  )
}
