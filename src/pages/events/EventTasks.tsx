import { useParams } from 'react-router-dom'
import { useEventStore } from '@/store/useEventStore'
import { useCurrentEventProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import TaskList from '@/components/tasks/TaskList'

export default function EventTasks() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentEventProject()
  const updateProject = useEventStore((s) => s.updateProject)
  const addTask = useEventStore((s) => s.addTask)
  const updateTask = useEventStore((s) => s.updateTask)
  const removeTask = useEventStore((s) => s.removeTask)

  const { canEdit, getMemberId } = useCurrentUser()

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const done = project.tasks.filter((t) => t.status === 'done').length
  const total = project.tasks.length
  const readOnly = !canEdit('event.tasks', id)
  const myMemberId = getMemberId('event', id) ?? undefined

  return (
    <div className="p-6 max-w-3xl">
      <ProjectHeader
        name={project.name}
        description={project.description}
        onUpdateName={(name) => updateProject(id, { name })}
        onUpdateDescription={(description) => updateProject(id, { description })}
      />

      <PageSection
        label={`Tasks & Checklist — ${done} / ${total} done`}
      >
        <TaskList
          tasks={project.tasks}
          members={project.teamMembers}
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
