import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useEventStore } from '@/store/useEventStore'
import { useCurrentEventProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useUserStore } from '@/store/useUserStore'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import TaskList from '@/components/tasks/TaskList'
import { PriorityBadge, VendorStatusBadge } from '@/components/ui/StatusBadge'
import { cn, formatDate } from '@/lib/utils'
import BudgetSummaryBar from '@/components/budget/BudgetSummaryBar'
import { findMemberByName } from '@/lib/autoLink'
import type { Task, TimelineMilestone } from '@/types/common'

export default function EventDashboard() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentEventProject()
  const updateProject = useEventStore((s) => s.updateProject)
  const addTask = useEventStore((s) => s.addTask)
  const updateTask = useEventStore((s) => s.updateTask)
  const removeTask = useEventStore((s) => s.removeTask)
  const updateTotalBudget = useEventStore((s) => s.updateTotalBudget)

  // ── Current user context ────────────────────────────────────────────────────
  const { user, getMemberId } = useCurrentUser()
  const addMembership = useUserStore((s) => s.addMembership)

  // Auto-link: if the user's display name matches a team member's name, link them.
  useEffect(() => {
    if (!user || !id || !project) return
    const alreadyLinked = getMemberId('event', id)
    if (alreadyLinked) return
    const matchId = findMemberByName(user.name, project.teamMembers)
    if (matchId) addMembership(user.id, { module: 'event', projectId: id, memberId: matchId })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, id])

  if (!project || !id) {
    return (
      <div className="p-6 text-sm text-ink-muted">Project not found.</div>
    )
  }

  const openTasks = project.tasks.filter((t) => t.status !== 'done').length
  const highPriorityCount = project.tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length
  const totalSpent = project.budgetItems.reduce((s, i) => s + i.actualCost, 0)
  const confirmedVendors = project.vendors.filter((v) => v.status === 'confirmed').length
  const keyMilestones = [...project.milestones].sort((a, b) => a.order - b.order).slice(0, 4)
  const keyVendors = project.vendors.slice(0, 5)

  const myMemberId = user ? getMemberId('event', id) : null
  const myOpenTasks = myMemberId
    ? project.tasks.filter((t) => t.assignedTo === myMemberId && t.status !== 'done')
    : []

  return (
    <div className="p-6 max-w-5xl">
      <ProjectHeader
        name={project.name}
        description={project.description}
        onUpdateName={(name) => updateProject(id, { name })}
        onUpdateDescription={(description) => updateProject(id, { description })}
        meta={[
          { label: 'Date', value: project.eventDate ? formatDate(project.eventDate) : '', editable: true, onEdit: (v) => updateProject(id, { eventDate: v }) },
          { label: 'Venue', value: project.venue, editable: true, onEdit: (v) => updateProject(id, { venue: v }) },
          { label: 'Run time', value: project.runTime, editable: true, onEdit: (v) => updateProject(id, { runTime: v }) },
        ]}
      />

      {/* ── Metric tiles ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricTile
          label="Open Tasks"
          value={openTasks}
          sub={myMemberId !== null ? `${myOpenTasks.length} yours` : undefined}
        />
        <MetricTile label="High Priority" value={highPriorityCount} accent={highPriorityCount > 0} />
        <MetricTile
          label="Actual Spend"
          value={totalSpent > 0 ? `$${totalSpent.toLocaleString()}` : '—'}
          sub={project.totalBudget > 0 ? `of $${project.totalBudget.toLocaleString()}` : undefined}
        />
        <MetricTile
          label="Confirmed Suppliers"
          value={confirmedVendors}
          sub={project.vendors.length > 0 ? `of ${project.vendors.length}` : undefined}
        />
      </div>

      {/* ── Priority tasks ─────────────────────────────────────────────── */}
      <PageSection label="Priority Tasks" card>
        <TaskList
          tasks={project.tasks}
          members={project.teamMembers}
          onAdd={(data) => addTask(id, data)}
          onUpdate={(tid, patch) => updateTask(id, tid, patch)}
          onRemove={(tid) => removeTask(id, tid)}
          projectId={id}
          filterPriority="high"
        />
      </PageSection>

      {/* ── My Tasks (only when a user is logged in) ───────────────────── */}
      {user && (
        <PageSection label={`My Tasks${myOpenTasks.length > 0 ? ` — ${myOpenTasks.length} open` : ''}`} card>
          {!myMemberId ? (
            <p className="text-sm text-ink-faint">
              No team member matches "{user?.name}" in this project.{' '}
              <Link to="/my-tasks" className="text-accent hover:underline">
                Link your profile on My Tasks →
              </Link>
            </p>
          ) : myOpenTasks.length === 0 ? (
            <p className="text-sm text-ink-faint">No open tasks assigned to you in this project.</p>
          ) : (
            <>
              <div className="divide-y divide-surface-2">
                {myOpenTasks.slice(0, 6).map((task) => (
                  <MyTaskRow key={task.id} task={task} />
                ))}
              </div>
              {myOpenTasks.length > 6 && (
                <Link to={`/events/${id}/tasks`} className="mt-2 block text-xs text-accent hover:underline">
                  +{myOpenTasks.length - 6} more — view all tasks →
                </Link>
              )}
            </>
          )}
        </PageSection>
      )}

      {/* ── Two-column row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-5 mb-6">
        {/* Milestones */}
        <div className="col-span-3">
          <PageSection label="Key Milestones" card>
            {keyMilestones.length === 0 ? (
              <p className="text-sm text-ink-faint">No milestones — add them on the Timeline page.</p>
            ) : (
              <div className="space-y-1.5">
                {keyMilestones.map((m) => (
                  <MilestoneSnippet key={m.id} milestone={m} />
                ))}
              </div>
            )}
          </PageSection>
        </div>

        {/* Vendors */}
        <div className="col-span-2">
          <PageSection label="Key Vendors" card>
            {keyVendors.length === 0 ? (
              <p className="text-sm text-ink-faint">No vendors yet.</p>
            ) : (
              <div className="space-y-1.5">
                {keyVendors.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="text-sm text-ink truncate">{v.name}</p>
                      <p className="text-xs text-ink-faint">{v.category}</p>
                    </div>
                    <VendorStatusBadge status={v.status} />
                  </div>
                ))}
              </div>
            )}
          </PageSection>
        </div>
      </div>

      {/* ── Budget snapshot ────────────────────────────────────────────── */}
      <PageSection label="Budget Snapshot" card>
        <BudgetSummaryBar
          totalBudget={project.totalBudget}
          items={project.budgetItems}
          onEditTotal={(total) => updateTotalBudget(id, total)}
        />
      </PageSection>
    </div>
  )
}

// ─── Dashboard sub-components ─────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="card-soft p-4">
      <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-1.5">{label}</p>
      <p className={`text-3xl font-bold tracking-tight ${accent ? 'text-accent' : 'text-ink'}`}>{value}</p>
      {sub && <p className="text-xs text-ink-faint mt-1">{sub}</p>}
    </div>
  )
}

function MyTaskRow({ task }: { task: Task }) {
  const isOverdue = !!task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date()
  return (
    <div className="flex items-center gap-2.5 py-1.5 text-sm">
      <div className={cn(
        'w-2 h-2 rounded-full shrink-0',
        task.status === 'done' ? 'bg-green-500' :
        task.status === 'in_progress' ? 'bg-amber-400' : 'border-2 border-surface-3 bg-white'
      )} />
      <span className="flex-1 text-ink truncate">{task.title}</span>
      <PriorityBadge priority={task.priority} />
      {task.dueDate && (
        <span className={cn('text-xs shrink-0', isOverdue ? 'text-red-500 font-medium' : 'text-ink-faint')}>
          {isOverdue ? '⚠ ' : ''}{formatDate(task.dueDate, 'dd MMM')}
        </span>
      )}
    </div>
  )
}

function MilestoneSnippet({ milestone }: { milestone: TimelineMilestone }) {
  const isPast = milestone.date ? new Date(milestone.date) < new Date() : false
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <div className={`w-2 h-2 rounded-full border-2 shrink-0 ${isPast ? 'bg-accent border-accent' : 'bg-white border-surface-3'}`} />
      <span className="flex-1 text-ink truncate">{milestone.title}</span>
      {milestone.date && (
        <span className="text-xs text-ink-faint shrink-0">{formatDate(milestone.date, 'dd MMM')}</span>
      )}
    </div>
  )
}
