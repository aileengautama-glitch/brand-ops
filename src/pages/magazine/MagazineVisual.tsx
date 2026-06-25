import { useRef, useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Plus, ImagePlus, ZoomIn, X, Trash2, ChevronUp, ChevronDown, Image,
  Camera, Calendar, MapPin, ArrowRight, Link2, PenLine,
} from 'lucide-react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { MagazineVisualProjectRepository, MagazineMoodTileRepository } from '@/repositories'
import { useCurrentMagazineProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useStoredImage, useImageStorage, buildMediaContext } from '@/hooks/useImageStorage'
import ImageDropZone from '@/components/ui/ImageDropZone'
import { MEDIA_ENTITY } from '@/lib/mediaEntityTypes'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { cn, formatDate } from '@/lib/utils'
import type { MoodTile, VisualProject, VisualProjectStatus } from '@/types/magazine'

// ─── Visual project status config (shared with the detail page) ────────────────

export const VISUAL_STATUS_CONFIG: Record<VisualProjectStatus, { label: string; className: string }> = {
  planning:  { label: 'Planning',  className: 'bg-surface-3 text-ink-muted'  },
  scheduled: { label: 'Scheduled', className: 'bg-amber-100 text-amber-700'  },
  shot:      { label: 'Shot',      className: 'bg-blue-100 text-blue-700'    },
  delivered: { label: 'Delivered', className: 'bg-green-100 text-green-700'  },
}

// ─── VisualProjectCard ─────────────────────────────────────────────────────────

function VisualProjectCard({
  project, leadName, articleTitle,
}: {
  project: VisualProject
  leadName: string
  articleTitle: string
}) {
  const statusCfg  = VISUAL_STATUS_CONFIG[project.status] ?? VISUAL_STATUS_CONFIG.planning
  const shotsTotal = project.shots.length
  const shotsDone  = project.shots.filter((s) => s.status === 'shot').length
  const links      = project.resultLinks.length

  return (
    <Link
      to={project.id}
      className="group flex flex-col bg-white border border-surface-3 rounded-lg p-3.5 hover:border-accent/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="text-sm font-semibold text-ink leading-snug line-clamp-2 group-hover:text-accent transition-colors">
          {project.name || 'Untitled visual project'}
        </h3>
        <span className={cn('text-2xs font-medium px-1.5 py-0.5 rounded shrink-0', statusCfg.className)}>
          {statusCfg.label}
        </span>
      </div>

      {project.concept && (
        <p className="text-xs text-ink-muted line-clamp-2 mb-2.5">{project.concept}</p>
      )}

      <div className="space-y-1 text-2xs text-ink-faint mb-3">
        <div className="flex items-center gap-1.5">
          <Calendar size={11} className="shrink-0" />
          {project.shootDate ? formatDate(project.shootDate, 'dd MMM yyyy') : 'Date TBC'}
        </div>
        {project.location && (
          <div className="flex items-center gap-1.5">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">{project.location}</span>
          </div>
        )}
        {leadName && (
          <div className="flex items-center gap-1.5">
            <Camera size={11} className="shrink-0" />
            <span className="truncate">{leadName}</span>
          </div>
        )}
        {articleTitle && (
          <div className="flex items-center gap-1.5 text-accent">
            <PenLine size={11} className="shrink-0" />
            <span className="truncate">{articleTitle}</span>
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2.5 text-2xs text-ink-faint">
          <span>{shotsDone}/{shotsTotal} shot{shotsTotal !== 1 ? 's' : ''}</span>
          {links > 0 && (
            <span className="flex items-center gap-1 text-accent">
              <Link2 size={11} /> {links}
            </span>
          )}
        </div>
        <ArrowRight size={13} className="text-ink-faint group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  )
}

// ─── MoodTileCard ──────────────────────────────────────────────────────────────

function MoodTileCard({
  tile,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  projectId,
  readOnly,
}: {
  tile: MoodTile
  onUpdate: (patch: Partial<MoodTile>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  projectId: string
  readOnly: boolean
}) {
  const url      = useStoredImage(tile.imageId || undefined)
  const { save } = useImageStorage()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [lightbox, setLightbox]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ctx = buildMediaContext(projectId, MEDIA_ENTITY.moodTile, tile.id)
    const id  = await save(file, ctx)
    onUpdate({ imageId: id })
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <div className="flex flex-col bg-white border border-surface-3 rounded overflow-hidden">
        {/* ── Image / swatch / placeholder area ──────────────────────── */}
        <div
          className={cn(
            'relative aspect-[3/4] overflow-hidden group',
            !url && !tile.color && !readOnly && 'cursor-pointer',
          )}
          style={!url && tile.color ? { backgroundColor: tile.color } : undefined}
          onClick={() => !url && !readOnly && fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />

          {url ? (
            <img src={url} alt={tile.caption || 'Mood tile'} className="w-full h-full object-cover" />
          ) : !tile.color ? (
            /* Placeholder */
            <div className="flex flex-col items-center justify-center h-full bg-surface-1 hover:bg-surface-2 transition-colors">
              {!readOnly && (
                <>
                  <ImagePlus size={20} className="text-ink-faint mb-1.5" />
                  <span className="text-2xs text-ink-faint">Upload image</span>
                </>
              )}
              {readOnly && <Image size={20} className="text-ink-faint/40" />}
            </div>
          ) : null /* solid color fill via style above */}

          {/* Hover overlay — only when image is set */}
          {url && (
            <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/20 transition-colors opacity-0 group-hover:opacity-100 flex items-start justify-between p-1.5">
              <button
                onClick={() => setLightbox(true)}
                className="p-1 bg-white/90 rounded text-ink hover:bg-white transition-colors"
              >
                <ZoomIn size={11} />
              </button>
              {!readOnly && (
                <button
                  onClick={() => onUpdate({ imageId: '' })}
                  className="p-1 bg-white/90 rounded text-ink hover:bg-white transition-colors"
                  title="Remove image"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          )}

          {/* Upload button overlay — visible when color swatch is set (no image) */}
          {!url && tile.color && !readOnly && (
            <div
              className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <div className="bg-black/40 rounded p-1.5">
                <ImagePlus size={16} className="text-white" />
              </div>
            </div>
          )}
        </div>

        {/* ── Caption + controls ──────────────────────────────────────── */}
        <div className="px-2 pt-1.5 pb-2 space-y-1.5">
          {/* Caption */}
          {readOnly ? (
            <p className="text-xs text-ink-muted min-h-[1.2em] line-clamp-2">
              {tile.caption || '—'}
            </p>
          ) : (
            <input
              type="text"
              value={tile.caption}
              onChange={(e) => onUpdate({ caption: e.target.value })}
              placeholder="Caption…"
              className="w-full text-xs text-ink bg-transparent outline-none placeholder:text-ink-faint"
            />
          )}

          {/* Controls row */}
          {!readOnly && (
            <div className="flex items-center gap-1">
              {/* Colour swatch picker */}
              <label className="relative cursor-pointer shrink-0" title="Set swatch colour">
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border border-surface-3 transition-colors',
                    !tile.color && 'bg-surface-2',
                  )}
                  style={tile.color ? { backgroundColor: tile.color } : undefined}
                />
                <input
                  type="color"
                  value={tile.color || '#d4d4d4'}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  className="sr-only"
                />
              </label>
              {tile.color && (
                <button
                  onClick={() => onUpdate({ color: '' })}
                  className="text-2xs text-ink-faint hover:text-ink transition-colors leading-none"
                  title="Clear colour"
                >
                  ×
                </button>
              )}

              <div className="flex-1" />

              <button
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className="p-0.5 rounded text-ink-faint hover:text-ink hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-default"
                title="Move up"
              >
                <ChevronUp size={11} />
              </button>
              <button
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className="p-0.5 rounded text-ink-faint hover:text-ink hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-default"
                title="Move down"
              >
                <ChevronDown size={11} />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-0.5 rounded text-ink-faint hover:text-red-500 transition-colors"
                title="Delete tile"
              >
                <Trash2 size={11} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && url && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 p-8"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded text-white hover:bg-white/20 transition-colors"
          >
            <X size={16} />
          </button>
          <img
            src={url}
            alt={tile.caption || 'Mood tile'}
            className="max-w-full max-h-full object-contain rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete tile"
        message="Remove this mood tile from the board?"
        onConfirm={() => { onRemove(); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MagazineVisual() {
  const { id }           = useParams<{ id: string }>()
  const navigate         = useNavigate()
  const project          = useCurrentMagazineProject()
  const updateProject    = useMagazineStore((s) => s.updateProject)
  const addMoodTile      = useMagazineStore((s) => s.addMoodTile)
  const updateMoodTile   = useMagazineStore((s) => s.updateMoodTile)
  const removeMoodTile   = useMagazineStore((s) => s.removeMoodTile)
  const moveMoodTile     = useMagazineStore((s) => s.moveMoodTile)
  const addVisualProject = useMagazineStore((s) => s.addVisualProject)
  const { canEdit }      = useCurrentUser()
  const readOnly         = !canEdit('magazine.visual', id)

  // Image intake → new mood tile(s): click to pick, drag & drop, or paste (jpg/png).
  const { save }             = useImageStorage()
  const addMoodTileWithImage = useMagazineStore((s) => s.addMoodTileWithImage)
  const [pasteToast, setPasteToast] = useState<string | null>(null)
  const handleTileFiles = useCallback(async (files: File[]) => {
    if (!id) return
    for (const file of files) {
      const imageId = await save(file)
      addMoodTileWithImage(id, imageId)
    }
    setPasteToast(`Added ${files.length} image${files.length > 1 ? 's' : ''} to mood board`)
    window.setTimeout(() => setPasteToast(null), 2500)
  }, [id, save, addMoodTileWithImage])

  // Phase 5H — Supabase-first read of this project's visual projects. Fetched once per
  // project; null = no Supabase answer (disabled / non-UUID / error / no rows).
  const [remoteVisualProjects, setRemoteVisualProjects] = useState<VisualProject[] | null>(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    MagazineVisualProjectRepository.list(id).then((rows) => {
      if (!cancelled) setRemoteVisualProjects(rows)
    })
    return () => { cancelled = true }
  }, [id])

  // Phase 5J — Supabase-first read of this project's mood tiles. Independent of the
  // visualProjects fetch above (separate state + effect, same [id] key).
  const [remoteMoodTiles, setRemoteMoodTiles] = useState<MoodTile[] | null>(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    MagazineMoodTileRepository.list(id).then((rows) => {
      if (!cancelled) setRemoteMoodTiles(rows)
    })
    return () => { cancelled = true }
  }, [id])

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const teamMembers    = project.teamMembers ?? []
  const articles       = project.articles ?? []
  // Read authority (Phase 5J + 5H): Supabase rows when present, else the local store copy.
  // Two independent Supabase-first reads — moodTiles and visualProjects — each resolving
  // remote ?? local. Until the tables are populated they fall back to local (no UI change).
  const sortedTiles    = [...(remoteMoodTiles ?? project.moodTiles ?? [])].sort((a, b) => a.order - b.order)
  const sortedProjects = [...(remoteVisualProjects ?? project.visualProjects ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const leadName = (vp: VisualProject) =>
    vp.assignedTo ? (teamMembers.find((m) => m.id === vp.assignedTo)?.name ?? '') : ''
  const articleTitle = (vp: VisualProject) =>
    vp.articleId ? (articles.find((a) => a.id === vp.articleId)?.title || 'Untitled article') : ''

  // Add a visual project and open it straight away
  const handleAddProject = () => {
    addVisualProject(id)
    const fresh  = useMagazineStore.getState().projects.find((p) => p.id === id)?.visualProjects ?? []
    const newest = [...fresh].sort((a, b) => (b.order ?? 0) - (a.order ?? 0))[0]
    if (newest) navigate(`/magazine/${id}/visual/${newest.id}`)
  }

  const addProjectBtn = !readOnly ? (
    <button
      onClick={handleAddProject}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors"
    >
      <Plus size={13} /> Add visual project
    </button>
  ) : undefined

  const addTileBtn = !readOnly ? (
    <button
      onClick={() => addMoodTile(id)}
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-surface-2 text-ink-secondary rounded hover:bg-surface-3 transition-colors"
    >
      <Plus size={12} /> Add tile
    </button>
  ) : undefined

  return (
    <div className="p-6 max-w-6xl">
      <ProjectHeader
        name={project.name}
        description={project.description}
        onUpdateName={(name) => updateProject(id, { name })}
        onUpdateDescription={(description) => updateProject(id, { description })}
        actions={addProjectBtn}
      />

      {pasteToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2 rounded-lg bg-ink text-white text-xs shadow-lg">
          <ImagePlus size={13} /> {pasteToast}
        </div>
      )}

      {/* ── Visual production projects ───────────────────────────────────────── */}
      <PageSection label={`Visual Projects — ${sortedProjects.length}`}>
        {sortedProjects.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="No visual projects yet"
            description="Plan a shoot: track the shoot date, shot list, and final Dropbox / delivery links. Separate from the mood board below."
            action={addProjectBtn}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedProjects.map((vp) => (
              <VisualProjectCard
                key={vp.id}
                project={vp}
                leadName={leadName(vp)}
                articleTitle={articleTitle(vp)}
              />
            ))}
          </div>
        )}
      </PageSection>

      {/* ── Mood board (inspiration — kept separate) ─────────────────────────── */}
      <PageSection label="Mood Board" actions={addTileBtn}>
        <p className="text-xs text-ink-faint mb-3">
          Inspiration &amp; visual direction for the issue — images, colour swatches, and captions.
          Kept separate from the production projects above.
          {!readOnly && <span className="text-ink-muted"> Tip: paste an image (⌘/Ctrl+V) to add it as a tile.</span>}
        </p>
        {sortedTiles.length === 0 ? (
          <div className="bg-surface-1 border border-dashed border-surface-3 rounded-lg p-6 text-center">
            <Image size={22} className="text-ink-faint mx-auto mb-2" />
            <p className="text-sm text-ink-muted mb-1">Mood board is empty</p>
            <p className="text-xs text-ink-faint mb-3">
              Add images, colour swatches, and captions to define the visual direction for this issue.
            </p>
            <ImageDropZone onFiles={handleTileFiles} disabled={readOnly} label="Upload mood board images" className="max-w-md mx-auto mb-3" />
            {addTileBtn}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {sortedTiles.map((tile, idx) => (
              <MoodTileCard
                key={tile.id}
                tile={tile}
                onUpdate={(patch) => updateMoodTile(id, tile.id, patch)}
                onRemove={() => removeMoodTile(id, tile.id)}
                onMoveUp={() => moveMoodTile(id, tile.id, 'up')}
                onMoveDown={() => moveMoodTile(id, tile.id, 'down')}
                canMoveUp={idx > 0}
                canMoveDown={idx < sortedTiles.length - 1}
                projectId={id}
                readOnly={readOnly}
              />
            ))}
            {!readOnly && (
              <div
                onClick={() => addMoodTile(id)}
                className="aspect-[3/4] flex flex-col items-center justify-center border border-dashed border-surface-3 rounded cursor-pointer hover:bg-surface-1 hover:border-accent/40 transition-colors"
              >
                <Plus size={18} className="text-ink-faint mb-1" />
                <span className="text-2xs text-ink-faint">Add tile</span>
              </div>
            )}
          </div>
        )}
        {!readOnly && sortedTiles.length > 0 && (
          <ImageDropZone onFiles={handleTileFiles} compact className="mt-3" />
        )}
      </PageSection>
    </div>
  )
}
