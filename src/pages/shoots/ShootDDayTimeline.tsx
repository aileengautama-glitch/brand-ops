import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { useShootStore } from '@/store/useShootStore'
import { useCurrentShootProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import DDayTimelineTable from '@/components/creative/DDayTimelineTable'
import ShootShotListExport from '@/components/creative/ShootShotListExport'
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

  const triggerPrint = usePrint('portrait')

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const readOnly = !canEdit('shoot.timeline', id)

  return (
    <div className="print-page-wrapper p-6 max-w-5xl">
      {/* ── Editable timeline — screen only (the export below is what prints) ──── */}
      <div className="no-print">
        <ProjectHeader
          name={project.name}
          description={project.description}
          onUpdateName={(name) => updateProject(id, { name })}
          onUpdateDescription={(description) => updateProject(id, { description })}
        />

        <PageSection
          label={`Detailed D-Day Timeline — ${project.ddayRows.length} row${project.ddayRows.length !== 1 ? 's' : ''}`}
        >
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
        </PageSection>
      </div>

      {/* ── Shot List export — matches the template; this is what prints ──────── */}
      {project.ddayRows.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3 no-print">
            <div>
              <h2 className="text-sm font-bold text-ink">Shot List — Export Preview</h2>
              <p className="text-xs text-ink-muted mt-0.5">Per-model styling shot list. Export prints in portrait.</p>
            </div>
            <button
              onClick={triggerPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
            >
              <Printer size={13} /> Print / Export PDF
            </button>
          </div>
          <div className="print-area">
            <ShootShotListExport
              rows={project.ddayRows}
              models={project.models}
              stylings={project.stylings ?? []}
              projectName={project.name}
            />
          </div>
        </div>
      )}
    </div>
  )
}
