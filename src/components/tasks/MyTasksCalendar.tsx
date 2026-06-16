import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ExternalLink, CalendarDays } from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, addMonths, subMonths, format, parseISO, isValid,
} from 'date-fns'
import { cn } from '@/lib/utils'
import { PriorityBadge } from '@/components/ui/StatusBadge'
import type { Task, TaskStatus } from '@/types/common'

// ─────────────────────────────────────────────────────────────────────────────
// My Tasks — month calendar view.
//
// Pure presentation over the existing task model: each task already carries a
// `dueDate` (ISO string, '' if unset). Tasks with a due date are bucketed by day
// and rendered on the grid; clicking a task focuses the existing project tasks
// path (there is no per-task detail route today). No data-model change.
// ─────────────────────────────────────────────────────────────────────────────

export type CalendarTaskModule = 'event' | 'shoot' | 'magazine'

export interface CalendarTask {
  task: Task
  projectId: string
  projectName: string
  module: CalendarTaskModule
  tasksPath: string
}

const MODULE_DOT: Record<CalendarTaskModule, string> = {
  event:    'bg-accent',
  shoot:    'bg-blue-500',
  magazine: 'bg-purple-500',
}

const STATUS_DOT: Record<TaskStatus, string> = {
  todo:        'border-2 border-surface-3 bg-white',
  in_progress: 'bg-amber-400',
  done:        'bg-green-500',
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const isOverdue = (t: Task) =>
  !!t.dueDate && t.status !== 'done' && new Date(t.dueDate) < new Date(new Date().toDateString())

export default function MyTasksCalendar({ tasks }: { tasks: CalendarTask[] }) {
  const [cursor, setCursor] = useState<Date>(() => new Date())
  const [selected, setSelected] = useState<Date>(() => new Date())

  // Bucket tasks by yyyy-MM-dd (only those with a valid due date).
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarTask[]>()
    for (const ct of tasks) {
      if (!ct.task.dueDate) continue
      const d = parseISO(ct.task.dueDate)
      if (!isValid(d)) continue
      const key = format(d, 'yyyy-MM-dd')
      const arr = m.get(key)
      if (arr) arr.push(ct)
      else m.set(key, [ct])
    }
    // Sort each day: open before done, then by priority weight.
    const weight: Record<string, number> = { high: 0, normal: 1, low: 2 }
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        const ad = a.task.status === 'done' ? 1 : 0
        const bd = b.task.status === 'done' ? 1 : 0
        if (ad !== bd) return ad - bd
        return (weight[a.task.priority] ?? 1) - (weight[b.task.priority] ?? 1)
      })
    }
    return m
  }, [tasks])

  const unscheduledOpen = useMemo(
    () => tasks.filter((t) => !t.task.dueDate && t.task.status !== 'done').length,
    [tasks],
  )

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 })
    const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [cursor])

  const selectedKey = format(selected, 'yyyy-MM-dd')
  const selectedTasks = byDay.get(selectedKey) ?? []

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
      {/* ── Month grid ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-surface-3 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(21,24,17,0.03)]">
        {/* Month header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-2">
          <h2 className="text-xl font-bold text-ink tracking-tight">
            {format(cursor, 'MMMM')}{' '}
            <span className="text-ink-faint font-normal">{format(cursor, 'yyyy')}</span>
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCursor((c) => subMonths(c, 1))}
              className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-1 transition-colors"
              title="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => { setCursor(new Date()); setSelected(new Date()) }}
              className="px-2.5 py-1 text-xs font-medium rounded-md text-ink-secondary hover:text-ink hover:bg-surface-1 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setCursor((c) => addMonths(c, 1))}
              className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-1 transition-colors"
              title="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Weekday row */}
        <div className="grid grid-cols-7 px-3 pt-3">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-2xs font-bold uppercase tracking-widest text-ink-faint pb-2">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1 px-3 pb-3">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayTasks = byDay.get(key) ?? []
            const inMonth = isSameMonth(day, cursor)
            const today = isToday(day)
            const isSelected = isSameDay(day, selected)
            const openCount = dayTasks.filter((t) => t.task.status !== 'done').length
            const hasOverdue = dayTasks.some((ct) => isOverdue(ct.task))

            return (
              <button
                key={key}
                onClick={() => setSelected(day)}
                className={cn(
                  'min-h-[92px] rounded-lg border p-1.5 text-left flex flex-col gap-1 transition-colors',
                  isSelected
                    ? 'border-accent/50 bg-accent/[0.06]'
                    : 'border-transparent hover:bg-surface-1/60',
                  !inMonth && 'opacity-40',
                )}
              >
                {/* Day number */}
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center text-xs tabular-nums h-5 min-w-5 px-1 rounded-full',
                      today
                        ? 'bg-accent text-white font-bold'
                        : cn('font-medium', inMonth ? 'text-ink' : 'text-ink-faint'),
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {hasOverdue && <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Overdue" />}
                </div>

                {/* Task chips */}
                <div className="flex flex-col gap-0.5">
                  {dayTasks.slice(0, 2).map((ct) => (
                    <span
                      key={ct.task.id}
                      className={cn(
                        'flex items-center gap-1 px-1 py-0.5 rounded text-2xs truncate',
                        ct.task.status === 'done'
                          ? 'bg-surface-1 text-ink-faint line-through'
                          : isOverdue(ct.task)
                          ? 'bg-red-50 text-red-600'
                          : 'bg-surface-1 text-ink-secondary',
                      )}
                      title={`${ct.task.title} · ${ct.projectName}`}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', MODULE_DOT[ct.module])} />
                      <span className="truncate">{ct.task.title}</span>
                    </span>
                  ))}
                  {dayTasks.length > 2 && (
                    <span className="text-2xs text-ink-faint px-1">
                      +{dayTasks.length - 2} more
                    </span>
                  )}
                </div>

                {/* Spacer pushes nothing; count shown only when chips hidden by overflow */}
                {openCount === 0 && dayTasks.length > 0 && (
                  <span className="mt-auto text-2xs text-ink-faint px-1">all done</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Selected-day panel ─────────────────────────────────────────────── */}
      <div className="bg-white border border-surface-3 rounded-xl shadow-[0_1px_2px_rgba(21,24,17,0.03)] lg:sticky lg:top-4">
        <div className="px-4 py-4 border-b border-surface-2">
          <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-0.5">
            {isToday(selected) ? 'Today' : format(selected, 'EEEE')}
          </p>
          <h3 className="text-lg font-bold text-ink tracking-tight">
            {format(selected, 'd MMMM yyyy')}
          </h3>
        </div>

        <div className="p-3">
          {selectedTasks.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <CalendarDays size={22} className="text-ink-faint mx-auto mb-2" />
              <p className="text-xs text-ink-faint">Nothing due this day.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {selectedTasks.map((ct) => {
                const overdue = isOverdue(ct.task)
                return (
                  <Link
                    key={ct.task.id}
                    to={ct.tasksPath}
                    className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-surface-1 transition-colors group"
                    title="Open project tasks"
                  >
                    <span className={cn('w-2 h-2 rounded-full shrink-0 mt-1.5', STATUS_DOT[ct.task.status])} />
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm text-ink leading-snug', ct.task.status === 'done' && 'line-through text-ink-muted')}>
                        {ct.task.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', MODULE_DOT[ct.module])} />
                        <span className="text-2xs text-ink-faint truncate">{ct.projectName}</span>
                        {overdue && <span className="text-2xs text-red-500 font-medium shrink-0">· overdue</span>}
                      </div>
                    </div>
                    <PriorityBadge priority={ct.task.priority} />
                    <ExternalLink size={11} className="text-ink-faint group-hover:text-accent transition-colors shrink-0 mt-1" />
                  </Link>
                )
              })}
            </div>
          )}

          {unscheduledOpen > 0 && (
            <p className="mt-2 pt-2.5 border-t border-surface-2 px-2 text-2xs text-ink-faint">
              {unscheduledOpen} open task{unscheduledOpen !== 1 ? 's' : ''} with no due date — set a due date on the project tasks page to schedule.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
