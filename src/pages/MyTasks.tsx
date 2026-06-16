import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, CheckSquare, List, CalendarDays } from 'lucide-react'
import { useEventStore } from '@/store/useEventStore'
import { useShootStore } from '@/store/useShootStore'
import { useMagazineStore } from '@/store/useMagazineStore'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useUserStore } from '@/store/useUserStore'
import { UserAvatar } from '@/components/auth/UserSelector'
import { ROLE_LABELS } from '@/auth/users'
import { PriorityBadge } from '@/components/ui/StatusBadge'
import MyTasksCalendar, { type CalendarTask } from '@/components/tasks/MyTasksCalendar'
import { cn, formatDate } from '@/lib/utils'
import { findMemberByName } from '@/lib/autoLink'
import type { Task, TaskStatus } from '@/types/common'

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskModule = 'event' | 'shoot' | 'magazine'

interface EnrichedTask {
  task: Task
  projectId: string
  projectName: string
  module: TaskModule
  tasksPath: string
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TaskStatus, { label: string; dotCls: string }> = {
  todo:        { label: 'To Do',       dotCls: 'border-2 border-surface-3 bg-white'  },
  in_progress: { label: 'In Progress', dotCls: 'bg-amber-400'                        },
  done:        { label: 'Done',        dotCls: 'bg-green-500'                        },
}
// ─── Compact task row ─────────────────────────────────────────────────────────

function TaskLine({ et }: { et: EnrichedTask }) {
  const { task } = et
  const isOverdue = !!task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date()
  return (
    <div className="flex items-center gap-2.5 py-1.5 border-b border-surface-2 last:border-0 text-sm">
      <div className={cn('w-2 h-2 rounded-full shrink-0', STATUS_CONFIG[task.status].dotCls)} />
      <span className={cn('flex-1 text-ink truncate', task.status === 'done' && 'line-through text-ink-muted')}>
        {task.title}
      </span>
      <PriorityBadge priority={task.priority} />
      {task.dueDate && (
        <span className={cn('text-xs shrink-0', isOverdue ? 'text-red-500 font-medium' : 'text-ink-faint')}>
          {isOverdue ? '⚠ ' : ''}{formatDate(task.dueDate, 'dd MMM')}
        </span>
      )}
      <Link
        to={et.tasksPath}
        title="Go to project tasks"
        className="text-ink-faint hover:text-accent transition-colors shrink-0"
      >
        <ExternalLink size={11} />
      </Link>
    </div>
  )
}

// ─── Per-project block ────────────────────────────────────────────────────────

function ProjectBlock({
  projectId,
  projectName,
  module,
  members,
  tasks,
  memberId,
  tasksPath,
}: {
  projectId: string
  projectName: string
  module: TaskModule
  members: Array<{ id: string; name: string; role: string }>
  tasks: Task[]
  memberId: string | null
  tasksPath: string
}) {
  const { user } = useCurrentUser()
  const addMembership    = useUserStore((s) => s.addMembership)
  const removeMembership = useUserStore((s) => s.removeMembership)

  // Auto-link: silently match user's display name to a member on first render.
  useEffect(() => {
    if (!user || memberId) return
    const matchId = findMemberByName(user.name, members)
    if (matchId) addMembership(user.id, { module, projectId, memberId: matchId })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, projectId])

  const linkedMember = memberId ? members.find((m) => m.id === memberId) : null
  const myTasks      = memberId ? tasks.filter((t) => t.assignedTo === memberId) : []
  const myOpenTasks  = myTasks.filter((t) => t.status !== 'done')
  const myDoneTasks  = myTasks.filter((t) => t.status === 'done')

  const enriched = (list: Task[]): EnrichedTask[] =>
    list.map((task) => ({ task, projectId, projectName, module, tasksPath }))

  return (
    <div className="bg-white border border-surface-3 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(21,24,17,0.03)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-1 border-b border-surface-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn(
            'text-2xs font-bold uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0',
            module === 'event' ? 'bg-accent/10 text-accent' : module === 'shoot' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
          )}>
            {module === 'event' ? 'Event' : module === 'shoot' ? 'Shoot' : 'Magazine'}
          </span>
          <h3 className="text-sm font-semibold text-ink truncate">{projectName}</h3>
          {myOpenTasks.length > 0 && (
            <span className="text-xs text-ink-faint shrink-0">{myOpenTasks.length} open</span>
          )}
        </div>
        <Link
          to={module === 'event' ? `/events/${projectId}/dashboard` : module === 'shoot' ? `/shoots/${projectId}/dashboard` : `/magazine/${projectId}/board`}
          className="text-xs text-ink-faint hover:text-accent transition-colors shrink-0 ml-2"
        >
          Open project →
        </Link>
      </div>

      <div className="p-4">
        {/* Profile row ─ shows who you are in this project */}
        <div className="mb-3 pb-3 border-b border-surface-2">
          <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-1.5">
            Your profile in this project
          </p>
          {linkedMember ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-ink">{linkedMember.name}</span>
              <span className="text-ink-faint text-xs">·</span>
              <span className="text-xs text-ink-faint">{linkedMember.role}</span>
              <button
                onClick={() => { if (user) removeMembership(user.id, module, projectId) }}
                className="ml-auto text-xs text-ink-faint hover:text-red-500 transition-colors"
              >
                change
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {members.length === 0 ? (
                <p className="text-xs text-ink-faint italic">
                  No {module === 'shoot' ? 'crew' : 'team members'} added to this project yet.
                </p>
              ) : (
                <>
                  <p className="text-xs text-ink-faint">
                    No {module === 'shoot' ? 'crew member' : 'team member'} matched "{user?.name}" automatically.
                    {' '}Select manually:
                  </p>
                  {user && (
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) addMembership(user.id, { module, projectId, memberId: e.target.value })
                      }}
                      className="w-full text-xs border border-surface-3 rounded px-2 py-1.5 bg-white focus:outline-none focus:border-accent"
                    >
                      <option value="">— select your name —</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} · {m.role}</option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Task list */}
        {!memberId ? (
          <p className="text-xs text-ink-faint">Link yourself above to see your assigned tasks.</p>
        ) : myTasks.length === 0 ? (
          <p className="text-xs text-ink-faint">No tasks assigned to you in this project.</p>
        ) : (
          <>
            {myOpenTasks.length > 0 && (
              <div className="mb-2">
                <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-1.5">Open</p>
                {enriched(myOpenTasks).map((et) => <TaskLine key={et.task.id} et={et} />)}
              </div>
            )}
            {myDoneTasks.length > 0 && (
              <details className="mt-2">
                <summary className="text-2xs font-bold uppercase tracking-widest text-ink-faint cursor-pointer list-none flex items-center gap-1 select-none">
                  <span className="w-3 h-3 inline-flex items-center justify-center text-ink-faint">▸</span>
                  Done ({myDoneTasks.length})
                </summary>
                <div className="mt-1.5">
                  {enriched(myDoneTasks).map((et) => <TaskLine key={et.task.id} et={et} />)}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── View toggle ────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'calendar'

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 bg-surface-1 border border-surface-3 rounded-lg shrink-0">
      {([['list', List, 'List'], ['calendar', CalendarDays, 'Calendar']] as const).map(([key, Icon, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            view === key
              ? 'bg-white text-ink shadow-[0_1px_2px_rgba(21,24,17,0.06)]'
              : 'text-ink-muted hover:text-ink',
          )}
        >
          <Icon size={13} /> {label}
        </button>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MyTasks() {
  const eventProjects = useEventStore((s) => s.projects)
  const shootProjects = useShootStore((s) => s.projects)
  const magazineProjects = useMagazineStore((s) => s.projects)
  const { user, isLoggedIn, isAdmin, getMemberId, canView } = useCurrentUser()
  const memberships = useUserStore((s) => s.memberships)

  const [view, setView] = useState<ViewMode>('list')

  // Only show projects the user is explicitly linked to; admin sees all.
  const visibleEventProjects = useMemo(() => {
    if (!user || isAdmin) return eventProjects
    const ids = new Set(
      (memberships[user.id] ?? []).filter((m) => m.module === 'event').map((m) => m.projectId)
    )
    return eventProjects.filter((p) => ids.has(p.id))
  }, [eventProjects, user?.id, isAdmin, memberships])

  const visibleShootProjects = useMemo(() => {
    if (!user || isAdmin) return shootProjects
    const ids = new Set(
      (memberships[user.id] ?? []).filter((m) => m.module === 'shoot').map((m) => m.projectId)
    )
    return shootProjects.filter((p) => ids.has(p.id))
  }, [shootProjects, user?.id, isAdmin, memberships])

  // Magazine uses the scoped access model (canView), consistent with Magazine Home.
  const visibleMagazineProjects = useMemo(() => {
    if (!user) return []
    return magazineProjects.filter((p) => canView('magazine', p.id))
  }, [magazineProjects, user?.id, canView])

  // Flattened feed of the current user's assigned tasks across all visible
  // projects — used by the calendar view (and to count open tasks).
  const myEnrichedTasks = useMemo<CalendarTask[]>(() => {
    if (!isLoggedIn) return []
    const out: CalendarTask[] = []
    const collect = (
      projects: Array<{ id: string; name: string; tasks: Task[] }>,
      module: TaskModule,
      tasksPath: (id: string) => string,
    ) => {
      for (const p of projects) {
        const mid = getMemberId(module, p.id)
        if (!mid) continue
        for (const task of p.tasks) {
          if (task.assignedTo === mid) {
            out.push({ task, projectId: p.id, projectName: p.name, module, tasksPath: tasksPath(p.id) })
          }
        }
      }
    }
    collect(visibleEventProjects, 'event', (id) => `/events/${id}/tasks`)
    collect(visibleShootProjects, 'shoot', (id) => `/shoots/${id}/checklist`)
    collect(visibleMagazineProjects, 'magazine', (id) => `/magazine/${id}/tasks`)
    return out
  }, [isLoggedIn, visibleEventProjects, visibleShootProjects, visibleMagazineProjects, getMemberId])

  const totalOpen = myEnrichedTasks.filter((t) => t.task.status !== 'done').length

  return (
    <div className={cn('p-8', view === 'calendar' ? 'max-w-6xl' : 'max-w-4xl')}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">My Tasks</h1>
          {isLoggedIn && user ? (
            <div className="flex items-center gap-2 mt-1.5">
              <UserAvatar user={user} size="sm" />
              <span className="text-sm text-ink-muted">
                {user.name} · {ROLE_LABELS[user.role]}
              </span>
              {totalOpen > 0 && (
                <span className="ml-1 text-xs font-medium text-accent">
                  {totalOpen} open task{totalOpen !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-muted mt-1.5">
              Log in (top bar) to see your tasks across all projects.
            </p>
          )}
        </div>
        {isLoggedIn && <ViewToggle view={view} onChange={setView} />}
      </div>

      {!isLoggedIn ? (
        <div className="bg-surface-1 border border-dashed border-surface-3 rounded-xl p-12 text-center">
          <CheckSquare size={28} className="text-ink-faint mx-auto mb-3" />
          <p className="text-sm text-ink-muted mb-1">No one is logged in</p>
          <p className="text-xs text-ink-faint">
            Click "Log in" in the top bar to select your name, then come back here to see your tasks.
          </p>
        </div>
      ) : view === 'calendar' ? (
        <MyTasksCalendar tasks={myEnrichedTasks} />
      ) : (
        <>
          {/* ── Event projects ──────────────────────────────────────────── */}
          {visibleEventProjects.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
                Event Projects
              </h2>
              <div className="space-y-3">
                {visibleEventProjects.map((p) => (
                  <ProjectBlock
                    key={p.id}
                    projectId={p.id}
                    projectName={p.name}
                    module="event"
                    members={p.teamMembers.map((m) => ({ id: m.id, name: m.name, role: m.role }))}
                    tasks={p.tasks}
                    memberId={getMemberId('event', p.id)}
                    tasksPath={`/events/${p.id}/tasks`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Shoot projects ──────────────────────────────────────────── */}
          {visibleShootProjects.length > 0 && (
            <div>
              <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
                Shoot Projects
              </h2>
              <div className="space-y-3">
                {visibleShootProjects.map((p) => (
                  <ProjectBlock
                    key={p.id}
                    projectId={p.id}
                    projectName={p.name}
                    module="shoot"
                    members={p.crewMembers.map((m) => ({ id: m.id, name: m.name, role: m.role }))}
                    tasks={p.tasks}
                    memberId={getMemberId('shoot', p.id)}
                    tasksPath={`/shoots/${p.id}/checklist`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Magazine issues ─────────────────────────────────────────── */}
          {visibleMagazineProjects.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint mb-3">
                Magazine Issues
              </h2>
              <div className="space-y-3">
                {visibleMagazineProjects.map((p) => (
                  <ProjectBlock
                    key={p.id}
                    projectId={p.id}
                    projectName={p.name}
                    module="magazine"
                    members={p.teamMembers.map((m) => ({ id: m.id, name: m.name, role: m.role }))}
                    tasks={p.tasks}
                    memberId={getMemberId('magazine', p.id)}
                    tasksPath={`/magazine/${p.id}/tasks`}
                  />
                ))}
              </div>
            </div>
          )}

          {visibleEventProjects.length === 0 && visibleShootProjects.length === 0 && visibleMagazineProjects.length === 0 && (
            <p className="text-sm text-ink-faint">
              {isAdmin || !user
                ? 'No projects yet.'
                : 'No projects linked to your profile yet.'}
            </p>
          )}
        </>
      )}
    </div>
  )
}
