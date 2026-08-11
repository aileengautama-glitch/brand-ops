import { useParams } from 'react-router-dom'
import { useShootStore } from '@/store/useShootStore'
import { useCurrentShootProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import DecisionList from '@/components/decisions/DecisionList'

/**
 * Per-project decision queue — everything awaiting sign-off on this shoot, with
 * options, recommendation, cost impact and needed-by. Decided rows stay as the log.
 */
export default function ShootDecisions() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentShootProject()
  const { user } = useCurrentUser()
  const updateProject = useShootStore((s) => s.updateProject)
  const addDecision = useShootStore((s) => s.addDecision)
  const updateDecision = useShootStore((s) => s.updateDecision)
  const removeDecision = useShootStore((s) => s.removeDecision)

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const decisions = project.decisions ?? []
  const open = decisions.filter((d) => d.status === 'open').length

  return (
    <div className="p-6 max-w-4xl">
      <ProjectHeader
        name={project.name}
        description={project.description}
        onUpdateName={(name) => updateProject(id, { name })}
        onUpdateDescription={(description) => updateProject(id, { description })}
      />

      <PageSection label={`Decisions${open > 0 ? ` — ${open} open` : ''}`} card>
        <p className="text-xs text-ink-muted mb-3">
          Raise anything that needs sign-off here rather than in a message — the answer is recorded
          against the decision, with who decided and when.
        </p>
        <DecisionList
          decisions={decisions}
          onAdd={(data) => addDecision(id, data)}
          onUpdate={(did, patch) => updateDecision(id, did, patch)}
          onRemove={(did) => removeDecision(id, did)}
          currentUserName={user?.name}
        />
      </PageSection>
    </div>
  )
}
