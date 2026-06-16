import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { useShootStore } from '@/store/useShootStore'
import { useCurrentShootProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import DDayTimelineTable from '@/components/creative/DDayTimelineTable'
import { usePrint } from '@/hooks/usePrint'

export default function ShootDDayTimeline() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentShootProject()
  const { canEdit } = useCurrentUser()
  const updateProject = useShootStore((s) => s.updateProject)
  const addDDayRow = useShootStore((s) => s.addDDayRow)
  const updateDDayRow = useShootStore((s) => s.updateDDayRow)
  const removeDDayRow = useShootStore((s) => s.removeDDayRow)
  const moveDDayRow = useShootStore((s) => s.moveDDayRow)

  const triggerPrint = usePrint('landscape')

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const readOnly = !canEdit('shoot.timeline', id)

  return (
    <div className="print-page-wrapper p-6 max-w-5xl">
      <ProjectHeader
        name={project.name}
        description={project.description}
        onUpdateName={(name) => updateProject(id, { name })}
        onUpdateDescription={(description) => updateProject(id, { description })}
      />

      <PageSection
        label={`Detailed D-Day Timeline — ${project.ddayRows.length} row${project.ddayRows.length !== 1 ? 's' : ''}`}
        actions={
          project.ddayRows.length > 0 ? (
            <button
              onClick={triggerPrint}
              className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors no-print"
            >
              <Printer size={12} /> Print / Export
            </button>
          ) : undefined
        }
      >
        <div className="print-area">
          <DDayTimelineTable
            rows={project.ddayRows}
            models={project.models}
            stylings={project.stylings ?? []}
            onAdd={(data) => addDDayRow(id, data)}
            onUpdate={(rid, patch) => updateDDayRow(id, rid, patch)}
            onRemove={(rid) => removeDDayRow(id, rid)}
            onMove={(rid, dir) => moveDDayRow(id, rid, dir)}
            projectId={id}
            readOnly={readOnly}
          />
        </div>
      </PageSection>
    </div>
  )
}
