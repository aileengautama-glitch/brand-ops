import { useParams } from 'react-router-dom'
import { useEventStore } from '@/store/useEventStore'
import { useCurrentEventProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import DecisionList from '@/components/decisions/DecisionList'
import { resolveApproval, sendBackApproval } from '@/lib/approvalEngine'
import { approvalAbility } from '@/lib/approvalRoles'

/**
 * Per-project approvals for an event — same contract as the shoot version.
 */
export default function EventDecisions() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentEventProject()
  const { user, isAdmin, isLoggedIn } = useCurrentUser()
  const updateProject = useEventStore((s) => s.updateProject)
  const addDecision = useEventStore((s) => s.addDecision)
  const updateDecision = useEventStore((s) => s.updateDecision)
  const removeDecision = useEventStore((s) => s.removeDecision)

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const ability = approvalAbility(user?.role, isAdmin, isLoggedIn)
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

      <PageSection label={`Approvals${open > 0 ? ` — ${open} open` : ''}`} card>
        <p className="text-xs text-ink-muted mb-3">
          Raise anything that needs sign-off here rather than in a message. Link the fields, gates
          and tasks it unblocks — approving applies them automatically and records who and when.
        </p>
        <DecisionList
          decisions={decisions}
          onAdd={(data) => addDecision(id, data)}
          onUpdate={(did, patch) => updateDecision(id, did, patch)}
          onRemove={(did) => removeDecision(id, did)}
          onResolve={(approval, status) => resolveApproval({
            module: 'event', projectId: id, projectName: project.name,
            approval, status, by: user?.name || 'Unknown',
          })}
          onSendBack={(approval, note) => sendBackApproval({
            module: 'event', projectId: id, projectName: project.name,
            approval, by: user?.name || 'Unknown', note,
          })}
          currentUserName={user?.name}
          projectId={id}
          ability={ability}
          budgetItems={project.budgetItems ?? []}
          module="event"
          gates={project.milestones}
          tasks={project.tasks}
        />
      </PageSection>
    </div>
  )
}
