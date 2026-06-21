import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, CheckSquare, ChevronDown, ChevronUp, Trash2, PenLine, Image, Layers, BookOpen } from 'lucide-react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { useUserStore } from '@/store/useUserStore'
import { buildDirectory } from '@/auth/members'
import { MagazineTaskRepository } from '@/repositories'
import { useCurrentMagazineProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ProjectHeader from '@/components/layout/ProjectHeader'
import PageSection from '@/components/layout/PageSection'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { FormField, inputCls } from '@/components/ui/FormField'
import { PriorityBadge, TASK_STATUS_LABELS, PRIORITY_LABELS } from '@/components/ui/StatusBadge'
import { cn, now, formatDate } from '@/lib/utils'
import type { MagazineTask, MagazineTaskLinkType } from '@/types/magazine'
import { MAGAZINE_TASK_SECTIONS } from '@/types/magazine'
import type { TaskStatus, Priority } from '@/types/common'

type Member = { id: string; name: string }
type LinkOption = { id: string; label: string }
type LinkOptions = Record<'article' | 'visual' | 'graphic' | 'spread', LinkOption[]>

// Link type → display label + icon + which section/detail page the chip navigates to
const LINK_TYPE_LABEL: Record<MagazineTaskLinkType, string> = {
  none: 'None', article: 'Writing', visual: 'Visual', graphic: 'Graphics', spread: 'Spread',
}
const LINK_ICON = { article: PenLine, visual: Image, graphic: Layers, spread: BookOpen } as const

function linkPath(projectId: string, type: MagazineTaskLinkType, linkId: string): string {
  switch (type) {
    case 'article': return `/magazine/${projectId}/writing/${linkId}`
    case 'visual':  return `/magazine/${projectId}/visual`
    case 'graphic': return `/magazine/${projectId}/graphics`
    case 'spread':  return `/magazine/${projectId}/spread`
    default:        return `/magazine/${projectId}/tasks`
  }
}

const STATUS_DOT: Record<TaskStatus, string> = {
  todo:        'border-surface-3 bg-white',
  in_progress: 'border-amber-400 bg-amber-100',
  done:        'border-green-500 bg-green-500',
}
const STATUS_GROUP_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done']

const ctrlCls = 'text-xs border border-surface-3 rounded px-2 py-1 bg-white text-ink-secondary'

// ─── MagazineTaskRow ─────────────────────────────────────────────────────────

function MagazineTaskRow({
  task, members, projectId, linkOptions, onUpdate, onRemove,
  onMoveUp, onMoveDown, canMoveUp, canMoveDown,
  hideAssignee, hideSection, readOnly,
}: {
  task: MagazineTask
  members: Member[]
  projectId: string
  linkOptions: LinkOptions
  onUpdate: (patch: Partial<MagazineTask>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  hideAssignee: boolean
  hideSection: boolean
  readOnly: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const assignee  = members.find((m) => m.id === task.assignedTo)
  const todayISO  = new Date().toISOString().slice(0, 10)
  const isOverdue = !!task.dueDate && task.status !== 'done' && task.dueDate < todayISO

  const linkList  = task.linkType !== 'none' ? linkOptions[task.linkType] : []
  const linkLabel = task.linkId ? (linkList.find((o) => o.id === task.linkId)?.label ?? '') : ''
  const LinkIcon  = task.linkType !== 'none' ? LINK_ICON[task.linkType] : null

  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (readOnly) return
    const next: Record<TaskStatus, TaskStatus> = { todo: 'in_progress', in_progress: 'done', done: 'todo' }
    onUpdate({ status: next[task.status] })
  }

  return (
    <>
      <div className={cn(
        'border border-surface-3 rounded bg-white transition-shadow',
        expanded && 'shadow-sm',
        task.status === 'done' && 'opacity-65'
      )}>
        {/* Compact row */}
        <div
          className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-surface-1/40 transition-colors select-none"
          onClick={() => setExpanded((e) => !e)}
        >
          <button
            onClick={cycleStatus}
            title={`Status: ${TASK_STATUS_LABELS[task.status]}${readOnly ? '' : ' — click to advance'}`}
            className={cn(
              'w-3.5 h-3.5 rounded-full border-2 shrink-0 transition-transform',
              STATUS_DOT[task.status],
              readOnly ? 'cursor-default' : 'hover:scale-110'
            )}
          />

          <span className={cn('flex-1 text-sm text-ink min-w-0 truncate', task.status === 'done' && 'line-through text-ink-muted')}>
            {task.title || <span className="text-ink-faint italic">Untitled task</span>}
          </span>

          {!hideSection && task.section && (
            <span className="shrink-0 text-2xs px-1.5 py-0.5 rounded bg-surface-2 text-ink-secondary">{task.section}</span>
          )}

          {LinkIcon && linkLabel && (
            <Link
              to={linkPath(projectId, task.linkType, task.linkId)}
              onClick={(e) => e.stopPropagation()}
              title={`${LINK_TYPE_LABEL[task.linkType]}: ${linkLabel}`}
              className="shrink-0 flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors max-w-[130px]"
            >
              <LinkIcon size={10} className="shrink-0" />
              <span className="truncate">{linkLabel}</span>
            </Link>
          )}

          <span className="shrink-0 w-14 flex items-center justify-end">
            <PriorityBadge priority={task.priority} />
          </span>

          {task.dueDate && (
            <span className={cn('text-xs shrink-0 w-[72px] text-right', isOverdue ? 'text-red-500 font-medium' : 'text-ink-faint')}>
              {isOverdue ? '⚠ ' : ''}{formatDate(task.dueDate, 'dd MMM')}
            </span>
          )}

          {!hideAssignee && (
            <span className="text-xs shrink-0 w-[72px] text-right truncate text-ink-muted">
              {assignee ? assignee.name.split(' ')[0] : '—'}
            </span>
          )}

          {/* Reorder */}
          {!readOnly && (
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={onMoveUp} disabled={!canMoveUp}
                className="p-0.5 rounded text-ink-faint hover:text-ink hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-default"
                title="Move up"
              >
                <ChevronUp size={11} />
              </button>
              <button
                onClick={onMoveDown} disabled={!canMoveDown}
                className="p-0.5 rounded text-ink-faint hover:text-ink hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-default"
                title="Move down"
              >
                <ChevronDown size={11} />
              </button>
            </div>
          )}

          <ChevronDown size={12} className={cn('text-ink-faint shrink-0 transition-transform', expanded && 'rotate-180')} />
        </div>

        {/* Expanded edit panel */}
        {expanded && (
          <div className="border-t border-surface-3 px-3 pb-3 pt-2.5 space-y-2.5">
            <input
              type="text" value={task.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              disabled={readOnly} placeholder="Task title"
              className={cn(inputCls, 'font-medium', readOnly && 'opacity-60 cursor-default')}
            />
            <textarea
              value={task.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              disabled={readOnly} rows={2} placeholder="Add a description…"
              className={cn(inputCls, 'resize-none', readOnly && 'opacity-60 cursor-default')}
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Status</label>
                <select value={task.status} onChange={(e) => onUpdate({ status: e.target.value as TaskStatus })} disabled={readOnly} className={cn(inputCls, readOnly && 'opacity-60')}>
                  {(Object.entries(TASK_STATUS_LABELS) as [TaskStatus, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Priority</label>
                <select value={task.priority} onChange={(e) => onUpdate({ priority: e.target.value as Priority })} disabled={readOnly} className={cn(inputCls, readOnly && 'opacity-60')}>
                  {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Due date</label>
                <input type="date" value={task.dueDate} onChange={(e) => onUpdate({ dueDate: e.target.value })} disabled={readOnly} className={cn(inputCls, readOnly && 'opacity-60')} />
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Assign to</label>
                <select value={task.assignedTo} onChange={(e) => onUpdate({ assignedTo: e.target.value })} disabled={readOnly} className={cn(inputCls, readOnly && 'opacity-60')}>
                  <option value="">— Unassigned —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Section</label>
                <select value={task.section} onChange={(e) => onUpdate({ section: e.target.value })} disabled={readOnly} className={cn(inputCls, readOnly && 'opacity-60')}>
                  <option value="">— None —</option>
                  {MAGAZINE_TASK_SECTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Linked content */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Link to</label>
                <select
                  value={task.linkType}
                  onChange={(e) => onUpdate({ linkType: e.target.value as MagazineTaskLinkType, linkId: '' })}
                  disabled={readOnly}
                  className={cn(inputCls, readOnly && 'opacity-60')}
                >
                  {(Object.entries(LINK_TYPE_LABEL) as [MagazineTaskLinkType, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              {task.linkType !== 'none' && (
                <div className="space-y-1">
                  <label className="text-2xs uppercase tracking-wide text-ink-faint block">Item</label>
                  <select
                    value={task.linkId}
                    onChange={(e) => onUpdate({ linkId: e.target.value })}
                    disabled={readOnly}
                    className={cn(inputCls, readOnly && 'opacity-60')}
                  >
                    <option value="">— Select —</option>
                    {linkList.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {!readOnly && (
              <div className="flex justify-end pt-1 border-t border-surface-3">
                <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={11} /> Delete task
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete task"
        message={`Delete "${task.title || 'Untitled task'}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => { onRemove(); setConfirmDelete(false) }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

// ─── Draft ───────────────────────────────────────────────────────────────────

type TaskDraft = Pick<MagazineTask, 'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'assignedTo' | 'section' | 'linkType' | 'linkId'>
const BLANK: TaskDraft = { title: '', description: '', status: 'todo', priority: 'normal', dueDate: '', assignedTo: '', section: '', linkType: 'none', linkId: '' }

type GroupBy = 'person' | 'status' | 'section'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MagazineTasks() {
  const { id }        = useParams<{ id: string }>()
  const project       = useCurrentMagazineProject()
  const updateProject = useMagazineStore((s) => s.updateProject)
  const addTask       = useMagazineStore((s) => s.addTask)
  const updateTask    = useMagazineStore((s) => s.updateTask)
  const removeTask    = useMagazineStore((s) => s.removeTask)
  const swapTaskOrder = useMagazineStore((s) => s.swapTaskOrder)
  const { canEdit }   = useCurrentUser()
  const readOnly      = !canEdit('magazine.tasks', id)

  const [groupBy, setGroupBy] = useState<GroupBy>('person')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [filterStatus, setFilterStatus]     = useState<TaskStatus | 'all'>('all')

  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft]     = useState<TaskDraft>(BLANK)

  // Phase 5I — Supabase-first read of this project's magazine tasks. Fetched once per
  // project; null = no Supabase answer (disabled / non-UUID / error / no rows).
  const [remoteTasks, setRemoteTasks] = useState<MagazineTask[] | null>(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    MagazineTaskRepository.list(id).then((rows) => {
      if (!cancelled) setRemoteTasks(rows)
    })
    return () => { cancelled = true }
  }, [id])

  // Assignable team = this project's collaborators: people granted access to this magazine
  // project, plus admins. (project.teamMembers has no editable UI, so it's empty for new
  // projects.) Unioned with any seeded teamMembers so existing seed projects keep their roster.
  const customMembers = useUserStore((s) => s.customMembers)
  const accessGrants  = useUserStore((s) => s.accessGrants)
  const members: Member[] = useMemo(() => {
    const seed = (project?.teamMembers ?? []).map((m) => ({ id: m.id, name: m.name }))
    const team = !id ? [] : buildDirectory(customMembers)
      .filter((p) => p.isAdmin || (accessGrants[p.id] ?? []).some(
        (g) => g.module === 'magazine' && g.projectId === id))
      .map((p) => ({ id: p.id, name: p.name }))
    const byId = new Map<string, Member>()
    for (const m of [...seed, ...team]) byId.set(m.id, m)
    return [...byId.values()]
  }, [id, project?.teamMembers, customMembers, accessGrants])

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  // Read authority: Supabase rows when present, else the local store copy. Until the
  // table is populated by the dual-write, this falls back to local (no behavior change).
  // teamMembers (lookup) stays on the store — out of scope for this slice.
  const allTasks = remoteTasks ?? project.tasks ?? []

  const memberName = (mid: string) => members.find((m) => m.id === mid)?.name ?? ''

  // Linkable content (Writing / Visual / Graphics / Spread items)
  const linkOptions: LinkOptions = {
    article: (project.articles ?? []).map((a) => ({ id: a.id, label: a.title || 'Untitled article' })),
    visual:  (project.moodTiles ?? []).map((m, i) => ({ id: m.id, label: (m.caption ?? '').trim() || `Mood tile ${i + 1}` })),
    graphic: (project.graphics ?? []).map((g) => ({ id: g.id, label: g.title || 'Untitled graphic' })),
    spread:  (project.spreads ?? []).map((s) => ({ id: s.id, label: s.pages || 'Spread' })),
  }
  const draftLinkList: LinkOption[] = draft.linkType !== 'none' ? linkOptions[draft.linkType] : []

  const d = (k: keyof TaskDraft, v: unknown) => setDraft((p) => ({ ...p, [k]: v }))

  const openAdd = (prefill: Partial<TaskDraft>) => { setDraft({ ...BLANK, ...prefill }); setShowAdd(true) }
  const handleAdd = () => {
    if (!draft.title.trim()) return
    addTask(id, { ...draft, order: Date.now(), updatedAt: now() })
    setDraft(BLANK); setShowAdd(false)
  }

  // Counts (overall, not filtered)
  const counts = {
    todo:        allTasks.filter((t) => t.status === 'todo').length,
    in_progress: allTasks.filter((t) => t.status === 'in_progress').length,
    done:        allTasks.filter((t) => t.status === 'done').length,
    high:        allTasks.filter((t) => t.priority === 'high' && t.status !== 'done').length,
  }

  // Filter
  let visible = [...allTasks]
  if (filterAssignee === 'unassigned') visible = visible.filter((t) => !t.assignedTo)
  else if (filterAssignee !== 'all')   visible = visible.filter((t) => t.assignedTo === filterAssignee)
  if (filterStatus !== 'all')          visible = visible.filter((t) => t.status === filterStatus)

  // Group
  const keyFor = (t: MagazineTask): { key: string; label: string } => {
    if (groupBy === 'person') {
      const key = t.assignedTo || '__unassigned__'
      return { key, label: memberName(t.assignedTo) || 'Unassigned' }
    }
    if (groupBy === 'status') {
      return { key: t.status, label: TASK_STATUS_LABELS[t.status] ?? t.status }
    }
    const s = (t.section ?? '').trim()
    return s ? { key: s, label: s } : { key: '__nosection__', label: 'No section' }
  }

  const groupMap = new Map<string, { label: string; items: MagazineTask[] }>()
  for (const t of visible) {
    const { key, label } = keyFor(t)
    if (!groupMap.has(key)) groupMap.set(key, { label, items: [] })
    groupMap.get(key)!.items.push(t)
  }
  // Order items within each group by manual `order`
  for (const g of groupMap.values()) g.items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  // Order the groups themselves
  const memberIndex = new Map(members.map((m, i) => [m.id, i]))
  const groupRank = (key: string): number => {
    if (groupBy === 'person')  return key === '__unassigned__' ? 9_999 : (memberIndex.get(key) ?? 9_998)
    if (groupBy === 'status')  return STATUS_GROUP_ORDER.indexOf(key as TaskStatus)
    if (key === '__nosection__') return 9_999
    const i = (MAGAZINE_TASK_SECTIONS as readonly string[]).indexOf(key)
    return i === -1 ? 9_000 : i
  }
  const groupsArr = [...groupMap.entries()]
    .map(([key, v]) => ({ key, label: v.label, items: v.items }))
    .sort((a, b) => groupRank(a.key) - groupRank(b.key))

  const prefillForGroup = (key: string): Partial<TaskDraft> => {
    if (groupBy === 'person')  return { assignedTo: key === '__unassigned__' ? '' : key }
    if (groupBy === 'status')  return { status: key as TaskStatus }
    return { section: key === '__nosection__' ? '' : key }
  }

  const filtersActive = filterAssignee !== 'all' || filterStatus !== 'all'

  const addButton = !readOnly ? (
    <button onClick={() => openAdd({})} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
      <Plus size={13} /> Add task
    </button>
  ) : undefined

  return (
    <div className="p-6 max-w-5xl">
      <ProjectHeader
        name={project.name}
        description={project.description}
        onUpdateName={(name) => updateProject(id, { name })}
        onUpdateDescription={(description) => updateProject(id, { description })}
        actions={addButton}
      />

      <PageSection label={`Tasks — ${counts.done} / ${allTasks.length} done`}>
        {allTasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No tasks yet"
            description="Track work by person, status, and section. Link tasks to articles, visuals, graphics, or spreads."
            action={addButton}
          />
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <StatChip label="To do" value={counts.todo} />
              <StatChip label="In progress" value={counts.in_progress} accent="amber" />
              <StatChip label="Done" value={counts.done} accent="green" />
              <StatChip label="High priority" value={counts.high} accent="accent" />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4 pb-3 border-b border-surface-2">
              <div className="flex items-center gap-1.5">
                <span className="text-2xs uppercase tracking-wide text-ink-faint">Group</span>
                <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className={ctrlCls}>
                  <option value="person">Person</option>
                  <option value="status">Status</option>
                  <option value="section">Section</option>
                </select>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-1.5">
                <span className="text-2xs uppercase tracking-wide text-ink-faint">Assignee</span>
                <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className={ctrlCls}>
                  <option value="all">All</option>
                  <option value="unassigned">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-0.5">
                {([['all', 'All'], ['todo', 'To do'], ['in_progress', 'In prog.'], ['done', 'Done']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilterStatus(key)}
                    className={cn('text-2xs px-2 py-1 rounded transition-colors', filterStatus === key ? 'bg-ink text-white' : 'text-ink-muted hover:bg-surface-2')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Groups */}
            {visible.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-ink-muted mb-2">No tasks match these filters.</p>
                <button onClick={() => { setFilterAssignee('all'); setFilterStatus('all') }} className="text-xs text-accent hover:text-accent-dark transition-colors">
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {groupsArr.map((g) => (
                  <div key={g.key}>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-2xs font-bold uppercase tracking-widest text-ink-faint">
                        {g.label} <span className="text-ink-faint/60">· {g.items.length}</span>
                      </h2>
                      {!readOnly && !filtersActive && (
                        <button
                          onClick={() => openAdd(prefillForGroup(g.key))}
                          className="flex items-center gap-1 text-2xs text-ink-muted hover:text-accent transition-colors"
                        >
                          <Plus size={11} /> Add
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {g.items.map((t, idx) => (
                        <MagazineTaskRow
                          key={t.id}
                          task={t}
                          members={members}
                          projectId={id}
                          linkOptions={linkOptions}
                          onUpdate={(patch) => updateTask(id, t.id, patch)}
                          onRemove={() => removeTask(id, t.id)}
                          onMoveUp={() => { const prev = g.items[idx - 1]; if (prev) swapTaskOrder(id, t.id, prev.id) }}
                          onMoveDown={() => { const next = g.items[idx + 1]; if (next) swapTaskOrder(id, t.id, next.id) }}
                          canMoveUp={idx > 0}
                          canMoveDown={idx < g.items.length - 1}
                          hideAssignee={groupBy === 'person'}
                          hideSection={groupBy === 'section'}
                          readOnly={readOnly}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </PageSection>

      {/* Add modal */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setDraft(BLANK) }}
        title="Add Task"
        footer={
          <>
            <button onClick={() => { setShowAdd(false); setDraft(BLANK) }} className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">Cancel</button>
            <button onClick={handleAdd} disabled={!draft.title.trim()} className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40">Add task</button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="Title" required>
            <input
              autoFocus type="text" value={draft.title}
              onChange={(e) => d('title', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="What needs doing?" className={inputCls}
            />
          </FormField>
          <FormField label="Description">
            <textarea value={draft.description} onChange={(e) => d('description', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Assign to">
              <select value={draft.assignedTo} onChange={(e) => d('assignedTo', e.target.value)} className={inputCls}>
                <option value="">— Unassigned —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Section">
              <select value={draft.section} onChange={(e) => d('section', e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {MAGAZINE_TASK_SECTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Status">
              <select value={draft.status} onChange={(e) => d('status', e.target.value as TaskStatus)} className={inputCls}>
                {(Object.entries(TASK_STATUS_LABELS) as [TaskStatus, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Priority">
              <select value={draft.priority} onChange={(e) => d('priority', e.target.value as Priority)} className={inputCls}>
                {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Due date">
              <input type="date" value={draft.dueDate} onChange={(e) => d('dueDate', e.target.value)} className={inputCls} />
            </FormField>
            <FormField label="Link to">
              <select value={draft.linkType} onChange={(e) => setDraft((p) => ({ ...p, linkType: e.target.value as MagazineTaskLinkType, linkId: '' }))} className={inputCls}>
                {(Object.entries(LINK_TYPE_LABEL) as [MagazineTaskLinkType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </FormField>
            {draft.linkType !== 'none' && (
              <FormField label="Item">
                <select value={draft.linkId} onChange={(e) => d('linkId', e.target.value)} className={inputCls}>
                  <option value="">— Select —</option>
                  {draftLinkList.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </FormField>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── StatChip ────────────────────────────────────────────────────────────────

function StatChip({ label, value, accent }: { label: string; value: number; accent?: 'amber' | 'green' | 'accent' }) {
  const color =
    accent === 'amber' ? 'text-amber-700' :
    accent === 'green' ? 'text-green-700' :
    accent === 'accent' ? 'text-accent' : 'text-ink'
  return (
    <div className="border border-surface-3 rounded-lg bg-white px-3 py-2">
      <p className="text-2xs uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={cn('text-lg font-semibold tabular-nums', color)}>{value}</p>
    </div>
  )
}
