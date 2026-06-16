import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { useEventStore } from '@/store/useEventStore'
import { useCurrentEventProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import TeamMemberCard from '@/components/team/TeamMemberCard'
import ProjectAccessManager from '@/components/access/ProjectAccessManager'
import EmptyState from '@/components/ui/EmptyState'
import { inputCls } from '@/components/ui/FormField'

export default function EventTeams() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentEventProject()
  const { canEdit } = useCurrentUser()
  const updateProject = useEventStore((s) => s.updateProject)
  const addTeamMember = useEventStore((s) => s.addTeamMember)
  const updateTeamMember = useEventStore((s) => s.updateTeamMember)
  const removeTeamMember = useEventStore((s) => s.removeTeamMember)
  const addTask = useEventStore((s) => s.addTask)
  const updateTask = useEventStore((s) => s.updateTask)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [contact, setContact] = useState('')

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const readOnly = !canEdit('event.teams', id)

  const handleAdd = () => {
    if (!name.trim()) return
    addTeamMember(id, { name: name.trim(), role: role.trim(), contact: contact.trim(), notes: '' })
    setName(''); setRole(''); setContact('')
    setShowForm(false)
  }

  const allMembers = project.teamMembers.map((m) => ({ id: m.id, name: m.name }))

  return (
    <div className="p-6 max-w-3xl">
      <ProjectHeader
        name={project.name}
        description={project.description}
        onUpdateName={(n) => updateProject(id, { name: n })}
        onUpdateDescription={(desc) => updateProject(id, { description: desc })}
        actions={readOnly ? undefined : (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
            <Plus size={13} /> Add member
          </button>
        )}
      />

      {/* Inline add form */}
      {showForm && !readOnly && (
        <div className="mb-5 p-4 bg-surface-1 border border-surface-3 rounded space-y-2">
          <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">New Team Member</p>
          <div className="grid grid-cols-3 gap-2">
            <input autoFocus type="text" placeholder="Name *" value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className={inputCls} />
            <input type="text" placeholder="Role" value={role}
              onChange={(e) => setRole(e.target.value)} className={inputCls} />
            <input type="text" placeholder="Contact" value={contact}
              onChange={(e) => setContact(e.target.value)} className={inputCls} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!name.trim()}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40">
              Add member
            </button>
            <button onClick={() => { setShowForm(false); setName(''); setRole(''); setContact('') }}
              className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      <PageSection label={`Team & Roles — ${project.teamMembers.length} member${project.teamMembers.length !== 1 ? 's' : ''}`}>
        {project.teamMembers.length === 0 ? (
          <EmptyState icon={Users} title="No team members yet"
            action={readOnly ? undefined : (
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
                <Plus size={13} /> Add member
              </button>
            )}
          />
        ) : (
          <div className="space-y-2">
            {project.teamMembers.map((member) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                tasks={project.tasks.filter((t) => t.assignedTo === member.id)}
                allMembers={allMembers}
                onUpdate={(patch) => updateTeamMember(id, member.id, patch)}
                onRemove={() => removeTeamMember(id, member.id)}
                onUpdateTask={(tid, patch) => updateTask(id, tid, patch)}
                onAddTask={(data) => addTask(id, data)}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </PageSection>

      {/* Per-project page access (admin only) — same access model as Settings + magazine */}
      <ProjectAccessManager module="event" projectId={id} />
    </div>
  )
}
