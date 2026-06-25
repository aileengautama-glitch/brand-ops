import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ImagePlus } from 'lucide-react'
import { useShootStore } from '@/store/useShootStore'
import { useCurrentShootProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useImageStorage } from '@/hooks/useImageStorage'
import { isValidUUID } from '@/repositories/projects'
import { MEDIA_ENTITY } from '@/lib/mediaEntityTypes'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import InlineEdit from '@/components/ui/InlineEdit'
import MoodboardGrid from '@/components/creative/MoodboardGrid'
import ImageThumbWithModal from '@/components/ui/ImageThumbWithModal'
import type { ShootBriefSection, MoodboardItem } from '@/types/shoot'

type ImageSection = 'wardrobe' | 'hairAndMakeup' | 'locations'

const BRIEF_SECTIONS: {
  key: keyof ShootBriefSection
  label: string
  placeholder: string
  imageSection?: ImageSection
}[] = [
  { key: 'overview',          label: 'Overview',           placeholder: 'Describe the overall concept and objectives of the shoot…' },
  { key: 'campaignMessaging', label: 'Campaign Messaging', placeholder: 'Key messaging, campaign narrative, and brand story…' },
  { key: 'creativeDirection', label: 'Creative Direction', placeholder: 'Describe the visual references, tone, mood, and aesthetic direction…' },
  { key: 'wardrobe',          label: 'Wardrobe',           placeholder: 'Describe wardrobe pieces, styling direction, and any specific requirements…', imageSection: 'wardrobe' },
  { key: 'hairAndMakeup',     label: 'Hair & Make-Up',     placeholder: 'Describe the HMU direction, product requirements, and references…', imageSection: 'hairAndMakeup' },
  { key: 'locations',         label: 'Locations',          placeholder: 'List shoot locations, access requirements, and timing notes…', imageSection: 'locations' },
  { key: 'additionalNotes',   label: 'Additional Notes',   placeholder: 'Any other information the crew and talent need to know…' },
]

const SECTION_IMAGES_KEY: Record<ImageSection, 'wardrobeImages' | 'hairAndMakeupImages' | 'locationsImages'> = {
  wardrobe:     'wardrobeImages',
  hairAndMakeup: 'hairAndMakeupImages',
  locations:    'locationsImages',
}

// media.entity_type label per brief image section (Phase D2).
const SECTION_ENTITY_TYPE: Record<ImageSection, string> = {
  wardrobe:      MEDIA_ENTITY.shootBriefWardrobe,
  hairAndMakeup: MEDIA_ENTITY.shootBriefHmu,
  locations:     MEDIA_ENTITY.shootBriefLocation,
}

// ─── Section image strip ──────────────────────────────────────────────────────

function SectionImageStrip({
  items,
  onAdd,
  onRemove,
  projectId,
  entityType,
  readOnly,
}: {
  items: MoodboardItem[]
  onAdd: (imageId: string) => void
  onRemove: (itemId: string) => void
  /** Owning project's UUID; enables Supabase sync when valid. */
  projectId?: string
  /** media.entity_type label for this brief section. */
  entityType: string
  /** When true, hides the upload button and per-image remove controls. */
  readOnly?: boolean
}) {
  const { save } = useImageStorage()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const hasValidProject = !!projectId && isValidUUID(projectId)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      // entity_id is '' — the MoodboardItem is created by the store after upload.
      const id = await save(
        file,
        hasValidProject
          ? { projectId: projectId!, entityType, entityId: '' }
          : undefined
      )
      onAdd(id)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (readOnly && items.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap mt-2">
      {items.map((item) => (
        <ImageThumbWithModal
          key={item.id}
          imageId={item.imageId}
          size="sm"
          onRemove={readOnly ? undefined : () => onRemove(item.id)}
        />
      ))}
      {!readOnly && (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center w-16 h-16 border border-dashed border-surface-3 rounded bg-surface-1 hover:border-accent/40 hover:bg-surface-2/50 transition-colors text-ink-faint"
          title="Add reference image"
        >
          {uploading ? (
            <span className="text-2xs">…</span>
          ) : (
            <>
              <ImagePlus size={13} className="mb-0.5" />
              <span className="text-2xs">Ref</span>
            </>
          )}
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShootBrief() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentShootProject()
  const { canEdit } = useCurrentUser()
  const updateProject = useShootStore((s) => s.updateProject)
  const updateShootBrief = useShootStore((s) => s.updateShootBrief)
  // Shoot Brief moodboard is the SAME board as Creative & Shot List (single source).
  const addMoodboardItem = useShootStore((s) => s.addMoodboardItem)
  const updateMoodboardItem = useShootStore((s) => s.updateMoodboardItem)
  const removeMoodboardItem = useShootStore((s) => s.removeMoodboardItem)
  const reorderMoodboardItems = useShootStore((s) => s.reorderMoodboardItems)
  const consolidateBriefMoodboard = useShootStore((s) => s.consolidateBriefMoodboard)
  const addBriefSectionImage = useShootStore((s) => s.addBriefSectionImage)
  const removeBriefSectionImage = useShootStore((s) => s.removeBriefSectionImage)

  // One-time, non-destructive: fold any legacy brief-only moodboard images into the
  // shared moodboard so nothing is lost. Guarded so it no-ops once consolidated.
  useEffect(() => {
    if (id && (project?.briefMoodboardItems?.length ?? 0) > 0) consolidateBriefMoodboard(id)
  }, [id, project?.briefMoodboardItems?.length, consolidateBriefMoodboard])

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const readOnly = !canEdit('shoot.brief', id)

  return (
    <div className="p-6 max-w-4xl">
      <ProjectHeader
        name={project.name}
        description={project.description}
        onUpdateName={(name) => updateProject(id, { name })}
        onUpdateDescription={(description) => updateProject(id, { description })}
      />

      {/* ── Moodboard (top) ──────────────────────────────────────────────── */}
      <PageSection label="Moodboard">
        <p className="text-xs text-ink-muted mb-2 no-print">Shared with the Creative &amp; Shot List moodboard — edits here update both.</p>
        <MoodboardGrid
          items={project.moodboardItems}
          onAdd={(imageId, caption) => addMoodboardItem(id, { imageId, caption })}
          onUpdate={(mid, patch) => updateMoodboardItem(id, mid, patch)}
          onRemove={(mid) => removeMoodboardItem(id, mid)}
          onReorder={(orderedIds) => reorderMoodboardItems(id, orderedIds)}
          projectId={id}
          readOnly={readOnly}
        />
      </PageSection>

      {/* ── Brief text sections ───────────────────────────────────────────── */}
      {BRIEF_SECTIONS.map(({ key, label, placeholder, imageSection }) => (
        <PageSection key={key} label={label}>
          <div className="bg-white border border-surface-3 rounded p-3 min-h-[80px]">
            <InlineEdit
              value={project.shootBrief[key] ?? ''}
              onSave={(v) => updateShootBrief(id, { [key]: v })}
              placeholder={placeholder}
              multiline
              rows={4}
              textClassName="text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap"
              inputClassName="text-sm leading-relaxed"
              readOnly={readOnly}
            />
            {imageSection && (
              <SectionImageStrip
                items={project[SECTION_IMAGES_KEY[imageSection]] ?? []}
                onAdd={(imageId) => addBriefSectionImage(id, imageSection, imageId)}
                onRemove={(itemId) => removeBriefSectionImage(id, imageSection, itemId)}
                projectId={id}
                entityType={SECTION_ENTITY_TYPE[imageSection]}
                readOnly={readOnly}
              />
            )}
          </div>
        </PageSection>
      ))}

      {/* ── Crew & contact points ─────────────────────────────────────────── */}
      <PageSection label="Crew & Contact Points">
        {project.crewMembers.length === 0 ? (
          <p className="text-sm text-ink-faint">
            No crew added yet — add them on the Crew & Talent page.
          </p>
        ) : (
          <div className="bg-white border border-surface-3 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1">
                  <th className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-4 py-2 w-40">Name</th>
                  <th className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-4 py-2 w-36">Role</th>
                  <th className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-4 py-2">Contact</th>
                </tr>
              </thead>
              <tbody>
                {project.crewMembers.map((m, i) => (
                  <tr key={m.id} className={i % 2 === 0 ? 'bg-white' : 'bg-surface-1/30'}>
                    <td className="px-4 py-2 font-medium text-ink">{m.name}</td>
                    <td className="px-4 py-2 text-ink-muted">{m.role}</td>
                    <td className="px-4 py-2 text-ink-faint text-xs">{m.contact || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>
    </div>
  )
}
