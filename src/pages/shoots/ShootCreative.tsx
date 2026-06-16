import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Image, LayoutGrid } from 'lucide-react'
import { useShootStore } from '@/store/useShootStore'
import { useCurrentShootProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import MoodboardGrid from '@/components/creative/MoodboardGrid'
import TagCloud from '@/components/creative/TagCloud'
import ColourPalette from '@/components/creative/ColourPalette'
import ShotRow from '@/components/creative/ShotRow'
import EmptyState from '@/components/ui/EmptyState'
import { inputCls } from '@/components/ui/FormField'
import MoodboardCompileView, { type MoodboardGroup } from '@/components/creative/MoodboardCompileView'

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

export default function ShootCreative() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentShootProject()
  const { canEdit } = useCurrentUser()
  const updateProject = useShootStore((s) => s.updateProject)

  const addMoodboardItem = useShootStore((s) => s.addMoodboardItem)
  const updateMoodboardItem = useShootStore((s) => s.updateMoodboardItem)
  const removeMoodboardItem = useShootStore((s) => s.removeMoodboardItem)
  const reorderMoodboardItems = useShootStore((s) => s.reorderMoodboardItems)

  const addTag = useShootStore((s) => s.addTag)
  const removeTag = useShootStore((s) => s.removeTag)
  const addColour = useShootStore((s) => s.addColour)
  const updateColour = useShootStore((s) => s.updateColour)
  const removeColour = useShootStore((s) => s.removeColour)
  const addShot = useShootStore((s) => s.addShot)
  const updateShot = useShootStore((s) => s.updateShot)
  const removeShot = useShootStore((s) => s.removeShot)
  const moveShot = useShootStore((s) => s.moveShot)

  const [showShotForm, setShowShotForm] = useState(false)
  const [shotId, setShotId] = useState('')
  const [shotName, setShotName] = useState('')
  const [showCompile, setShowCompile] = useState(false)

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const readOnly = !canEdit('shoot.creative', id)

  const sortedShots = [...project.shots].sort((a, b) => a.order - b.order)

  const moodboardGroups: MoodboardGroup[] = [
    {
      label: 'Moodboard',
      items: project.moodboardItems.map((i) => ({ imageId: i.imageId, caption: i.caption })),
    },
    {
      label: 'Shot References',
      items: sortedShots
        .filter((s) => s.imageId)
        .map((s) => ({ imageId: s.imageId, caption: `${s.shotId}${s.name ? ` · ${s.name}` : ''}` })),
    },
    ...(project.wardrobeImages?.length
      ? [{ label: 'Wardrobe', items: project.wardrobeImages.map((i) => ({ imageId: i.imageId, caption: i.caption })) }]
      : []),
    ...(project.hairAndMakeupImages?.length
      ? [{ label: 'Hair & Make-Up', items: project.hairAndMakeupImages.map((i) => ({ imageId: i.imageId, caption: i.caption })) }]
      : []),
    ...(project.locationsImages?.length
      ? [{ label: 'Locations', items: project.locationsImages.map((i) => ({ imageId: i.imageId, caption: i.caption })) }]
      : []),
  ]

  const handleAddShot = () => {
    const nextId = shotId.trim() || `S${String(sortedShots.length + 1).padStart(2, '0')}`
    addShot(id, { shotId: nextId, name: shotName.trim(), description: '', notes: '', imageId: '' })
    setShotId('')
    setShotName('')
    setShowShotForm(false)
  }

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

      {/* ── Shot List — full width below ─────────────────────────────────────── */}
      <Panel
        title={`Shot List — ${sortedShots.length} shot${sortedShots.length !== 1 ? 's' : ''}`}
        actions={readOnly ? undefined : (
          <button
            onClick={() => setShowShotForm(true)}
            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors"
          >
            <Plus size={12} /> Add shot
          </button>
        )}
      >
        {showShotForm && !readOnly && (
          <div className="mb-4 p-3 bg-surface-1 border border-surface-3 rounded space-y-2">
            <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">New Shot</p>
            <div className="grid grid-cols-4 gap-2">
              <input
                autoFocus
                type="text"
                placeholder={`S${String(sortedShots.length + 1).padStart(2, '0')}`}
                value={shotId}
                onChange={(e) => setShotId(e.target.value)}
                className={inputCls}
              />
              <input
                type="text"
                placeholder="Shot name"
                value={shotName}
                onChange={(e) => setShotName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddShot()}
                className={`${inputCls} col-span-3`}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddShot}
                className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors"
              >
                Add shot
              </button>
              <button
                onClick={() => { setShowShotForm(false); setShotId(''); setShotName('') }}
                className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {sortedShots.length === 0 ? (
          <EmptyState
            icon={Image}
            title="No shots yet"
            description="Add shots to build your visual shot list."
            action={readOnly ? undefined : (
              <button
                onClick={() => setShowShotForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors"
              >
                <Plus size={13} /> Add shot
              </button>
            )}
          />
        ) : (
          <div className="space-y-2">
            {sortedShots.map((shot, i) => (
              <ShotRow
                key={shot.id}
                shot={shot}
                isFirst={i === 0}
                isLast={i === sortedShots.length - 1}
                onUpdate={(patch) => updateShot(id, shot.id, patch)}
                onRemove={() => removeShot(id, shot.id)}
                onMove={(dir) => moveShot(id, shot.id, dir)}
                projectId={id}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}

        {sortedShots.length > 0 && !showShotForm && !readOnly && (
          <button
            onClick={() => setShowShotForm(true)}
            className="mt-3 flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors px-1"
          >
            <Plus size={13} /> Add shot
          </button>
        )}
      </Panel>
    </div>
    </>
  )
}
