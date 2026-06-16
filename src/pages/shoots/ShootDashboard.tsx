import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useShootStore } from '@/store/useShootStore'
import { useCurrentShootProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useUserStore } from '@/store/useUserStore'
import { findMemberByName } from '@/lib/autoLink'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import InlineEdit from '@/components/ui/InlineEdit'
import TaskList from '@/components/tasks/TaskList'
import BudgetSummaryBar from '@/components/budget/BudgetSummaryBar'
import { PriorityBadge } from '@/components/ui/StatusBadge'
import { cn, formatDate } from '@/lib/utils'
import type { Task } from '@/types/common'

export default function ShootDashboard() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentShootProject()
  const updateProject = useShootStore((s) => s.updateProject)
  const updateBriefDetails = useShootStore((s) => s.updateBriefDetails)
  const updateTotalBudget = useShootStore((s) => s.updateTotalBudget)
  const addTask = useShootStore((s) => s.addTask)
  const updateTask = useShootStore((s) => s.updateTask)
  const removeTask = useShootStore((s) => s.removeTask)

  // ── Current user context (must be before any early returns) ─────────────────
  const { user, getMemberId } = useCurrentUser()
  const addMembership = useUserStore((s) => s.addMembership)

  // Auto-link: silently link this user to a crew member whose name matches.
  useEffect(() => {
    if (!user || !id || !project) return
    const alreadyLinked = getMemberId('shoot', id)
    if (alreadyLinked) return
    const matchId = findMemberByName(user.name, project.crewMembers)
    if (matchId) addMembership(user.id, { module: 'shoot', projectId: id, memberId: matchId })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, id])

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  const openTasks = project.tasks.filter((t) => t.status !== 'done').length
  const highPriority = project.tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length
  const allMembers = project.crewMembers.map((m) => ({ id: m.id, name: m.name }))
  const bd = project.briefDetails

  const myMemberId = user ? getMemberId('shoot', id) : null
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
      />

      {/* ── Metric tiles ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricTile label="Open Tasks" value={openTasks} sub={myMemberId !== null ? `${myOpenTasks.length} yours` : undefined} />
        <MetricTile label="High Priority" value={highPriority} accent={highPriority > 0} />
        <MetricTile label="Crew" value={project.crewMembers.length} />
        <MetricTile label="Models" value={project.models.length} />
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Left: brief details + tasks */}
        <div className="col-span-3 space-y-6">
          {/* Brief shoot details */}
          <PageSection label="Brief Shoot Details" card>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {([
                ['Shoot type', 'shootType'],
                ['Concept', 'concept'],
                ['Client', 'client'],
                ['Location', 'location'],
                ['Call time', 'callTime'],
                ['Wrap time', 'wrapTime'],
              ] as [string, keyof typeof bd][]).map(([label, key]) => (
                <div key={key} className="flex gap-2 text-sm border-b border-surface-3 pb-1.5">
                  <span className="text-ink-faint w-24 shrink-0">{label}</span>
                  <InlineEdit
                    value={bd[key]}
                    onSave={(v) => updateBriefDetails(id, { [key]: v })}
                    placeholder="—"
                    textClassName="text-sm text-ink-secondary"
                    inputClassName="text-sm"
                  />
                </div>
              ))}
            </div>
          </PageSection>

          {/* Upcoming tasks */}
          <PageSection label="Upcoming Tasks" card>
            <TaskList
              tasks={project.tasks}
              members={allMembers}
              onAdd={(data) => addTask(id, data)}
              onUpdate={(tid, patch) => updateTask(id, tid, patch)}
              onRemove={(tid) => removeTask(id, tid)}
              projectId={id}
              filterPriority="high"
            />
          </PageSection>
        </div>

        {/* Right: crew & model snapshot */}
        <div className="col-span-2 space-y-6">
          <PageSection label="Crew" card>
            {project.crewMembers.length === 0 ? (
              <p className="text-sm text-ink-faint">No crew added yet.</p>
            ) : (
              <div className="divide-y divide-surface-2">
                {project.crewMembers.map((m) => (
                  <div key={m.id} className="flex items-baseline gap-2 py-1.5 text-sm">
                    <span className="font-medium text-ink flex-1 min-w-0 truncate">{m.name}</span>
                    <span className="text-ink-faint text-xs shrink-0">{m.role}</span>
                  </div>
                ))}
              </div>
            )}
          </PageSection>

          <PageSection label="Models" card>
            {project.models.length === 0 ? (
              <p className="text-sm text-ink-faint">No models added yet.</p>
            ) : (
              <div className="divide-y divide-surface-2">
                {project.models.map((m) => (
                  <div key={m.id} className="flex items-baseline gap-2 py-1.5 text-sm">
                    <span className="font-medium text-ink flex-1 min-w-0 truncate">{m.name}</span>
                    <span className="text-ink-faint text-xs shrink-0">{m.agency}</span>
                  </div>
                ))}
              </div>
            )}
          </PageSection>

          {/* My Tasks panel */}
          {user && (
            <PageSection label={`My Tasks${myOpenTasks.length > 0 ? ` — ${myOpenTasks.length} open` : ''}`} card>
              {!myMemberId ? (
                <p className="text-xs text-ink-faint">
                  No crew member matches "{user?.name}" in this shoot.{' '}
                  <Link to="/my-tasks" className="text-accent hover:underline">
                    Link on My Tasks →
                  </Link>
                </p>
              ) : myOpenTasks.length === 0 ? (
                <p className="text-xs text-ink-faint">No open tasks assigned to you.</p>
              ) : (
                <>
                  <div className="divide-y divide-surface-2">
                    {myOpenTasks.slice(0, 5).map((task) => (
                      <ShootMyTaskRow key={task.id} task={task} />
                    ))}
                  </div>
                  {myOpenTasks.length > 5 && (
                    <Link to={`/shoots/${id}/checklist`} className="mt-2 block text-xs text-accent hover:underline">
                      +{myOpenTasks.length - 5} more →
                    </Link>
                  )}
                </>
              )}
            </PageSection>
          )}
        </div>
      </div>

      {/* ── Budget snapshot (full-width) ───────────────────────────────── */}
      <div className="mt-6">
        <PageSection label="Budget Snapshot" card>
          <BudgetSummaryBar
            totalBudget={project.totalBudget}
            items={project.budgetItems}
            onEditTotal={(n) => updateTotalBudget(id, n)}
          />
        </PageSection>
      </div>
    </div>
  )
}

function MetricTile({ label, value, sub, accent = false }: { label: string; value: number; sub?: string; accent?: boolean }) {
  return (
    <div className="card-soft p-4">
      <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-1.5">{label}</p>
      <p className={`text-3xl font-bold tracking-tight ${accent ? 'text-accent' : 'text-ink'}`}>{value}</p>
      {sub && <p className="text-xs text-ink-faint mt-1">{sub}</p>}
    </div>
  )
}

function ShootMyTaskRow({ task }: { task: Task }) {
  const isOverdue = !!task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date()
  return (
    <div className="flex items-center gap-2 py-1.5 text-xs">
      <div className={cn(
        'w-2 h-2 rounded-full shrink-0',
        task.status === 'in_progress' ? 'bg-amber-400' : 'border-2 border-surface-3 bg-white'
      )} />
      <span className="flex-1 text-ink truncate">{task.title}</span>
      <PriorityBadge priority={task.priority} />
      {task.dueDate && (
        <span className={cn('shrink-0', isOverdue ? 'text-red-500 font-medium' : 'text-ink-faint')}>
          {isOverdue ? '⚠ ' : ''}{formatDate(task.dueDate, 'dd MMM')}
        </span>
      )}
    </div>
  )
}

