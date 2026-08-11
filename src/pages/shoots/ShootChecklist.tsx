import { useParams } from 'react-router-dom'
import { useShootStore } from '@/store/useShootStore'
import { useCurrentShootProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import TaskList from '@/components/tasks/TaskList'
import ChecklistPanel from '@/components/checklist/ChecklistPanel'
import { templatesForModule } from '@/lib/checklistTemplates'

export default function ShootChecklist() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentShootProject()
  const updateProject = useShootStore((s) => s.updateProject)
  const addTask = useShootStore((s) => s.addTask)
  const updateTask = useShootStore((s) => s.updateTask)
  const removeTask = useShootStore((s) => s.removeTask)
  const addChecklistItem = useShootStore((s) => s.addChecklistItem)
  const updateChecklistItem = useShootStore((s) => s.updateChecklistItem)
  const removeChecklistItem = useShootStore((s) => s.removeChecklistItem)
  const setChecklistItems = useShootStore((s) => s.setChecklistItems)

  const { canEdit, getMemberId } = useCurrentUser()

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const done = project.tasks.filter((t) => t.status === 'done').length
  const total = project.tasks.length
  const members = project.crewMembers.map((m) => ({ id: m.id, name: m.name }))
  const readOnly = !canEdit('shoot.checklist', id)
  const myMemberId = getMemberId('shoot', id) ?? undefined

  return (
    <div className="p-6 max-w-3xl">
      <ProjectHeader
        name={project.name}
        description={project.description}
        onUpdateName={(name) => updateProject(id, { name })}
        onUpdateDescription={(description) => updateProject(id, { description })}
      />

      <PageSection label="Pre-Production Checklist">
        <ChecklistPanel
          items={project.checklistItems ?? []}
          templates={templatesForModule('shoot')}
          anchors={{ shoot: project.shootDateISO, launch: project.launchDate }}
          module="shoot"
          readOnly={readOnly}
          onAdd={(data) => addChecklistItem(id, data)}
          onUpdate={(cid, patch) => updateChecklistItem(id, cid, patch)}
          onRemove={(cid) => removeChecklistItem(id, cid)}
          onReplaceAll={(items) => setChecklistItems(id, items)}
        />
      </PageSection>

      <PageSection label={`Tasks — ${done} / ${total} done`}>
        <TaskList
          tasks={project.tasks}
          members={members}
          onAdd={(data) => addTask(id, data)}
          onUpdate={(tid, patch) => updateTask(id, tid, patch)}
          onRemove={(tid) => removeTask(id, tid)}
          projectId={id}
          showStatusFilter
          readOnly={readOnly}
          currentMemberId={myMemberId}
        />
      </PageSection>
    </div>
  )
}
