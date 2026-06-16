import { useParams } from 'react-router-dom'
import { useEventStore } from '@/store/useEventStore'
import { useCurrentEventProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import MilestoneList from '@/components/timeline/MilestoneList'
import DayOfSchedule from '@/components/timeline/DayOfSchedule'

export default function EventTimeline() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentEventProject()
  const { canEdit } = useCurrentUser()
  const updateProject = useEventStore((s) => s.updateProject)
  const addMilestone = useEventStore((s) => s.addMilestone)
  const updateMilestone = useEventStore((s) => s.updateMilestone)
  const removeMilestone = useEventStore((s) => s.removeMilestone)
  const moveMilestone = useEventStore((s) => s.moveMilestone)
  const reorderMilestones = useEventStore((s) => s.reorderMilestones)
  const addDayOfSlot = useEventStore((s) => s.addDayOfSlot)
  const updateDayOfSlot = useEventStore((s) => s.updateDayOfSlot)
  const removeDayOfSlot = useEventStore((s) => s.removeDayOfSlot)
  const moveDayOfSlot = useEventStore((s) => s.moveDayOfSlot)

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const readOnly = !canEdit('event.timeline', id)

  return (
    <div className="p-6 max-w-4xl">
      <ProjectHeader
        name={project.name}
        description={project.description}
        onUpdateName={(name) => updateProject(id, { name })}
        onUpdateDescription={(description) => updateProject(id, { description })}
      />

      <PageSection label="Pre-Production Milestones" card>
        <MilestoneList
          milestones={project.milestones}
          onAdd={(data) => addMilestone(id, data)}
          onUpdate={(mid, patch) => updateMilestone(id, mid, patch)}
          onRemove={(mid) => removeMilestone(id, mid)}
          onMove={(mid, dir) => moveMilestone(id, mid, dir)}
          onReorder={(ids) => reorderMilestones(id, ids)}
          readOnly={readOnly}
        />
      </PageSection>

      <PageSection label="Day-Of Schedule" card>
        <DayOfSchedule
          slots={project.dayOfSlots}
          onAdd={(data) => addDayOfSlot(id, data)}
          onUpdate={(sid, patch) => updateDayOfSlot(id, sid, patch)}
          onRemove={(sid) => removeDayOfSlot(id, sid)}
          onMove={(sid, dir) => moveDayOfSlot(id, sid, dir)}
          readOnly={readOnly}
        />
      </PageSection>
    </div>
  )
}
