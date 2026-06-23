import { useParams } from 'react-router-dom'
import { useShootStore } from '@/store/useShootStore'
import { useCurrentShootProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import MilestoneList from '@/components/timeline/MilestoneList'
import DayOfSchedule from '@/components/timeline/DayOfSchedule'

export default function ShootTimeline() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentShootProject()
  const { canEdit } = useCurrentUser()
  const updateProject = useShootStore((s) => s.updateProject)
  const addMilestone = useShootStore((s) => s.addMilestone)
  const updateMilestone = useShootStore((s) => s.updateMilestone)
  const removeMilestone = useShootStore((s) => s.removeMilestone)
  const moveMilestone = useShootStore((s) => s.moveMilestone)
  const reorderMilestones = useShootStore((s) => s.reorderMilestones)
  const addDayOfSlot = useShootStore((s) => s.addDayOfSlot)
  const updateDayOfSlot = useShootStore((s) => s.updateDayOfSlot)
  const removeDayOfSlot = useShootStore((s) => s.removeDayOfSlot)
  const moveDayOfSlot = useShootStore((s) => s.moveDayOfSlot)

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const readOnly = !canEdit('shoot.timeline', id)

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

      <PageSection label="Detailed Day-Of Schedule" card>
        <DayOfSchedule
          slots={project.dayOfSlots}
          onAdd={(data) => addDayOfSlot(id, data)}
          onUpdate={(sid, patch) => updateDayOfSlot(id, sid, patch)}
          onRemove={(sid) => removeDayOfSlot(id, sid)}
          onMove={(sid, dir) => moveDayOfSlot(id, sid, dir)}
          readOnly={readOnly}
          detailedSchedule
        />
      </PageSection>
    </div>
  )
}
