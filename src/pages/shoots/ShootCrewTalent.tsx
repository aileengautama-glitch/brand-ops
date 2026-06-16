import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { useShootStore } from '@/store/useShootStore'
import { useCurrentShootProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import CrewCard from '@/components/crew/CrewCard'
import ModelCard from '@/components/crew/ModelCard'
import ProjectAccessManager from '@/components/access/ProjectAccessManager'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import { FormField, inputCls } from '@/components/ui/FormField'
import type { Model } from '@/types/shoot'

type ModelDraft = Omit<Model, 'id' | 'createdAt' | 'imageId'>
const BLANK_MODEL: ModelDraft = { name: '', agency: '', height: '', shoeSize: '', apparelSize: '', dressSize: '', generalMeasurements: '', notes: '' }

export default function ShootCrewTalent() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentShootProject()
  const { canEdit } = useCurrentUser()
  const updateProject = useShootStore((s) => s.updateProject)
  const addCrewMember = useShootStore((s) => s.addCrewMember)
  const updateCrewMember = useShootStore((s) => s.updateCrewMember)
  const removeCrewMember = useShootStore((s) => s.removeCrewMember)
  const addModel = useShootStore((s) => s.addModel)
  const removeModel = useShootStore((s) => s.removeModel)
  const addTask = useShootStore((s) => s.addTask)
  const updateTask = useShootStore((s) => s.updateTask)

  // Crew add form
  const [showCrewForm, setShowCrewForm] = useState(false)
  const [crewName, setCrewName] = useState('')
  const [crewRole, setCrewRole] = useState('')
  const [crewContact, setCrewContact] = useState('')

  // Model add modal
  const [showModelForm, setShowModelForm] = useState(false)
  const [modelDraft, setModelDraft] = useState<ModelDraft>(BLANK_MODEL)

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const readOnly = !canEdit('shoot.crew', id)

  const allCrew = project.crewMembers.map((m) => ({ id: m.id, name: m.name }))

  const handleAddCrew = () => {
    if (!crewName.trim()) return
    addCrewMember(id, { name: crewName.trim(), role: crewRole.trim(), contact: crewContact.trim(), notes: '' })
    setCrewName(''); setCrewRole(''); setCrewContact('')
    setShowCrewForm(false)
  }

  const handleAddModel = () => {
    if (!modelDraft.name.trim()) return
    addModel(id, { ...modelDraft, imageId: '' })
    setModelDraft(BLANK_MODEL)
    setShowModelForm(false)
  }

  const md = (k: keyof ModelDraft, v: string) => setModelDraft((p) => ({ ...p, [k]: v }))

  return (
    <div className="p-6 max-w-4xl">
      <ProjectHeader
        name={project.name}
        description={project.description}
        onUpdateName={(name) => updateProject(id, { name })}
        onUpdateDescription={(description) => updateProject(id, { description })}
      />

      {/* ── Crew ──────────────────────────────────────────────────────────── */}
      <PageSection
        label={`Crew — ${project.crewMembers.length} member${project.crewMembers.length !== 1 ? 's' : ''}`}
        actions={readOnly ? undefined : (
          <button onClick={() => setShowCrewForm(true)}
            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors">
            <Plus size={12} /> Add crew
          </button>
        )}
      >
        {showCrewForm && !readOnly && (
          <div className="mb-3 p-3 bg-surface-1 border border-surface-3 rounded space-y-2">
            <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">New Crew Member</p>
            <div className="grid grid-cols-3 gap-2">
              <input autoFocus type="text" placeholder="Name *" value={crewName}
                onChange={(e) => setCrewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCrew()}
                className={inputCls} />
              <input type="text" placeholder="Role" value={crewRole}
                onChange={(e) => setCrewRole(e.target.value)} className={inputCls} />
              <input type="text" placeholder="Contact" value={crewContact}
                onChange={(e) => setCrewContact(e.target.value)} className={inputCls} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddCrew} disabled={!crewName.trim()}
                className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40">
                Add crew member
              </button>
              <button onClick={() => { setShowCrewForm(false); setCrewName(''); setCrewRole(''); setCrewContact('') }}
                className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {project.crewMembers.length === 0 ? (
          <EmptyState icon={Users} title="No crew members yet"
            action={readOnly ? undefined : (
              <button onClick={() => setShowCrewForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
                <Plus size={13} /> Add crew member</button>
            )} />
        ) : (
          <div className="space-y-2">
            {project.crewMembers.map((member) => (
              <CrewCard
                key={member.id}
                member={member}
                tasks={project.tasks.filter((t) => t.assignedTo === member.id)}
                allCrew={allCrew}
                onUpdate={(patch) => updateCrewMember(id, member.id, patch)}
                onRemove={() => removeCrewMember(id, member.id)}
                onUpdateTask={(tid, patch) => updateTask(id, tid, patch)}
                onAddTask={(data) => addTask(id, data)}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </PageSection>

      {/* Separator spacing */}
      <div className="mb-2" />

      {/* ── Models ────────────────────────────────────────────────────────── */}
      <PageSection
        label={`Models — ${project.models.length}`}
        actions={readOnly ? undefined : (
          <button onClick={() => setShowModelForm(true)}
            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors">
            <Plus size={12} /> Add model
          </button>
        )}
      >
        {project.models.length === 0 ? (
          <EmptyState icon={Users} title="No models added yet"
            action={readOnly ? undefined : (
              <button onClick={() => setShowModelForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
                <Plus size={13} /> Add model</button>
            )} />
        ) : (
          <div className="space-y-2">
            {project.models.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                projectId={id}
                onRemove={() => removeModel(id, model.id)}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </PageSection>

      {/* Per-project page access (admin only) — same access model as Settings + magazine */}
      <ProjectAccessManager module="shoot" projectId={id} />

      {/* Add model modal */}
      <Modal open={showModelForm} onClose={() => { setShowModelForm(false); setModelDraft(BLANK_MODEL) }}
        title="Add Model"
        footer={
          <>
            <button onClick={() => { setShowModelForm(false); setModelDraft(BLANK_MODEL) }}
              className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">Cancel</button>
            <button onClick={handleAddModel} disabled={!modelDraft.name.trim()}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40">Add model</button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Name" required>
              <input autoFocus type="text" value={modelDraft.name}
                onChange={(e) => md('name', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
                className={inputCls} />
            </FormField>
            <FormField label="Agency">
              <input type="text" value={modelDraft.agency} onChange={(e) => md('agency', e.target.value)} className={inputCls} />
            </FormField>
          </div>
          <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint pt-1">Measurements</p>
          <div className="grid grid-cols-4 gap-2">
            {([['Height', 'height'], ['Shoe size', 'shoeSize'], ['Apparel', 'apparelSize'], ['Dress/Suit', 'dressSize']] as [string, keyof ModelDraft][]).map(([label, key]) => (
              <FormField key={key} label={label}>
                <input type="text" value={modelDraft[key] as string} onChange={(e) => md(key, e.target.value)} className={inputCls} />
              </FormField>
            ))}
          </div>
          <FormField label="General measurements" hint="e.g. Bust 83 · Waist 60 · Hip 88">
            <input type="text" value={modelDraft.generalMeasurements} onChange={(e) => md('generalMeasurements', e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Notes">
            <textarea value={modelDraft.notes} onChange={(e) => md('notes', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
          </FormField>
        </div>
      </Modal>
    </div>
  )
}
