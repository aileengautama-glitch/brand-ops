import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Printer, LayoutGrid } from 'lucide-react'
import { useEventStore } from '@/store/useEventStore'
import { useCurrentEventProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import MoodboardGrid from '@/components/creative/MoodboardGrid'
import TagCloud from '@/components/creative/TagCloud'
import ColourPalette from '@/components/creative/ColourPalette'
import ReferenceBlockCard from '@/components/creative/ReferenceBlockCard'
import SketchBlockCard from '@/components/creative/SketchBlockCard'
import MoodboardCompileView, { type MoodboardGroup } from '@/components/creative/MoodboardCompileView'

// Lightweight section panel used throughout this page
function Panel({
  title,
  actions,
  children,
  className = '',
}: {
  title: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`card-soft overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-2 bg-surface-1">
        <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">{title}</h2>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export default function EventCreative() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentEventProject()
  const { canEdit } = useCurrentUser()
  const updateProject = useEventStore((s) => s.updateProject)

  const addMoodboardItem = useEventStore((s) => s.addMoodboardItem)
  const updateMoodboardItem = useEventStore((s) => s.updateMoodboardItem)
  const removeMoodboardItem = useEventStore((s) => s.removeMoodboardItem)
  const reorderMoodboardItems = useEventStore((s) => s.reorderMoodboardItems)

  const addTag = useEventStore((s) => s.addTag)
  const removeTag = useEventStore((s) => s.removeTag)
  const addColour = useEventStore((s) => s.addColour)
  const updateColour = useEventStore((s) => s.updateColour)
  const removeColour = useEventStore((s) => s.removeColour)

  const addReferenceBlock = useEventStore((s) => s.addReferenceBlock)
  const updateReferenceBlock = useEventStore((s) => s.updateReferenceBlock)
  const removeReferenceBlock = useEventStore((s) => s.removeReferenceBlock)
  const addReferenceImage = useEventStore((s) => s.addReferenceImage)
  const updateReferenceImage = useEventStore((s) => s.updateReferenceImage)
  const removeReferenceImage = useEventStore((s) => s.removeReferenceImage)

  const addSketchBlock = useEventStore((s) => s.addSketchBlock)
  const updateSketchBlock = useEventStore((s) => s.updateSketchBlock)
  const removeSketchBlock = useEventStore((s) => s.removeSketchBlock)
  const moveSketchBlock = useEventStore((s) => s.moveSketchBlock)

  const [showCompile, setShowCompile] = useState(false)

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const readOnly = !canEdit('event.creative', id)

  const refBlocks = [...(project.referenceBlocks ?? [])].sort((a, b) => a.order - b.order)
  const sketchBlocks = [...(project.sketchBlocks ?? [])].sort((a, b) => a.order - b.order)

  const moodboardGroups: MoodboardGroup[] = [
    {
      label: 'Moodboard',
      items: project.moodboardItems.map((i) => ({ imageId: i.imageId, caption: i.caption })),
    },
    ...refBlocks.map((block) => ({
      label: block.title || 'Reference',
      items: [...block.images]
        .sort((a, b) => a.order - b.order)
        .map((img) => ({ imageId: img.imageId, caption: img.caption })),
    })),
  ]

  return (
    <>
    {showCompile && (
      <MoodboardCompileView
        title={project.name}
        groups={moodboardGroups}
        onClose={() => setShowCompile(false)}
      />
    )}
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <ProjectHeader
          name={project.name}
          description={project.description}
          onUpdateName={(name) => updateProject(id, { name })}
          onUpdateDescription={(description) => updateProject(id, { description })}
        />
        <button
          onClick={() => setShowCompile(true)}
          className="shrink-0 flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors ml-4 mt-0.5"
        >
          <LayoutGrid size={13} /> Compile Moodboard
        </button>
      </div>

      {/* ── Two-column layout: Moodboard left, Tags + Colours right ─────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">
        <Panel title="Moodboard">
          <MoodboardGrid
            items={project.moodboardItems}
            onAdd={(imageId, caption) => addMoodboardItem(id, { imageId, caption })}
            onUpdate={(mid, patch) => updateMoodboardItem(id, mid, patch)}
            onRemove={(mid) => removeMoodboardItem(id, mid)}
            onReorder={(orderedIds) => reorderMoodboardItems(id, orderedIds)}
            projectId={id}
            readOnly={readOnly}
          />
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel title="Reference & Tone Tags">
            <TagCloud
              tags={project.tags}
              onAdd={(label) => addTag(id, label)}
              onRemove={(tid) => removeTag(id, tid)}
              readOnly={readOnly}
            />
          </Panel>
          <Panel title="Colour Palette">
            <ColourPalette
              colours={project.colours}
              onAdd={(hex, label) => addColour(id, hex, label)}
              onUpdate={(cid, patch) => updateColour(id, cid, patch)}
              onRemove={(cid) => removeColour(id, cid)}
              readOnly={readOnly}
            />
          </Panel>
        </div>
      </div>

      {/* ── Reference blocks — full width, horizontal grid ───────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">References</h2>
            <p className="text-xs text-ink-muted mt-0.5">Visual reference boards with images, captions and keywords</p>
          </div>
          <div className="flex items-center gap-2">
            {refBlocks.length > 0 && (
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors no-print"
              >
                <Printer size={12} /> Print
              </button>
            )}
            {!readOnly && (
              <button
                onClick={() => addReferenceBlock(id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors"
              >
                <Plus size={13} /> Add reference block
              </button>
            )}
          </div>
        </div>

        {refBlocks.length === 0 ? (
          <div className="bg-surface-1 border border-dashed border-surface-3 rounded-lg p-8 text-center">
            <p className="text-sm text-ink-muted mb-1">No reference blocks yet</p>
            {!readOnly && (
              <>
                <p className="text-xs text-ink-faint mb-3">Create blocks for different visual themes — lighting, venue, styling, etc.</p>
                <button
                  onClick={() => addReferenceBlock(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors mx-auto"
                >
                  <Plus size={13} /> Add reference block
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {refBlocks.map((block) => (
              <ReferenceBlockCard
                key={block.id}
                block={block}
                onUpdate={(patch) => updateReferenceBlock(id, block.id, patch)}
                onRemove={() => removeReferenceBlock(id, block.id)}
                onAddImage={(imageId) => addReferenceImage(id, block.id, imageId)}
                onUpdateImage={(imgId, patch) => updateReferenceImage(id, block.id, imgId, patch)}
                onRemoveImage={(imgId) => removeReferenceImage(id, block.id, imgId)}
                projectId={id}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Sketches & Renders ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">Sketches &amp; Renders</h2>
            <p className="text-xs text-ink-muted mt-0.5">Concept sketches, 3D renders and visualisations with vendor attribution</p>
          </div>
          {!readOnly && (
            <button
              onClick={() => addSketchBlock(id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors"
            >
              <Plus size={13} /> Add sketch
            </button>
          )}
        </div>

        {sketchBlocks.length === 0 ? (
          <div className="bg-surface-1 border border-dashed border-surface-3 rounded-lg p-8 text-center">
            <p className="text-sm text-ink-muted mb-1">No sketches or renders yet</p>
            {!readOnly && (
              <>
                <p className="text-xs text-ink-faint mb-3">Upload concept sketches, 3D visualisations, or design renders with vendor details.</p>
                <button
                  onClick={() => addSketchBlock(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors mx-auto"
                >
                  <Plus size={13} /> Add sketch
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sketchBlocks.map((block, i) => (
              <SketchBlockCard
                key={block.id}
                block={block}
                isFirst={i === 0}
                isLast={i === sketchBlocks.length - 1}
                onUpdate={(patch) => updateSketchBlock(id, block.id, patch)}
                onRemove={() => removeSketchBlock(id, block.id)}
                onMove={(dir) => moveSketchBlock(id, block.id, dir)}
                projectId={id}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  )
}
