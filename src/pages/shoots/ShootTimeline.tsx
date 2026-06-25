import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { useShootStore } from '@/store/useShootStore'
import { useCurrentShootProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import MilestoneList from '@/components/timeline/MilestoneList'
import DayOfSchedule from '@/components/timeline/DayOfSchedule'
import ShootScheduleExport from '@/components/timeline/ShootScheduleExport'
import { usePrint } from '@/hooks/usePrint'

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

  const triggerPrint = usePrint('portrait')

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const readOnly = !canEdit('shoot.timeline', id)

  return (
    <div className="print-page-wrapper p-6 max-w-4xl">
      {/* ── Editable timeline — screen only (the export below is what prints) ──── */}
      <div className="no-print">
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

      {/* ── D-Day Schedule export — matches the template; this is what prints ──── */}
      {project.dayOfSlots.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3 no-print">
            <div>
              <h2 className="text-sm font-bold text-ink">D-Day Schedule — Export Preview</h2>
              <p className="text-xs text-ink-muted mt-0.5">Distributable pre-shoot schedule. Export prints in portrait.</p>
            </div>
            <button
              onClick={triggerPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
            >
              <Printer size={13} /> Print / Export PDF
            </button>
          </div>
          <div className="print-area">
            <ShootScheduleExport
              slots={project.dayOfSlots}
              location={project.briefDetails.location}
              date={project.briefDetails.shootDate ?? ''}
              callTime={project.briefDetails.callTime}
              wrapTime={project.briefDetails.wrapTime}
            />
          </div>
        </div>
      )}
    </div>
  )
}
