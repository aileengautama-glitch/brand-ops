import { useParams } from 'react-router-dom'
import { useEventStore } from '@/store/useEventStore'
import { useCurrentEventProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import DecisionList from '@/components/decisions/DecisionList'

/**
 * Per-project decision queue for an event — same contract as the shoot version.
 */
export default function EventDecisions() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentEventProject()
  const { user } = useCurrentUser()
  const updateProject = useEventStore((s) => s.updateProject)
  const addDecision = useEventStore((s) => s.addDecision)
  const updateDecision = useEventStore((s) => s.updateDecision)
  const removeDecision = useEventStore((s) => s.removeDecision)

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
