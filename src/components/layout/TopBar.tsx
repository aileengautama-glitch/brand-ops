import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, Settings, Trash2, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEventStore } from '@/store/useEventStore'
import { useShootStore } from '@/store/useShootStore'
import { useMagazineStore } from '@/store/useMagazineStore'
import { useUserStore } from '@/store/useUserStore'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { UserChip } from '@/components/auth/UserSelector'

export default function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { id } = useParams()
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState<'events' | 'shoots' | 'magazine' | null>(null)
  const projectRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  const isEvents   = location.pathname.startsWith('/events')
  const isShoots   = location.pathname.startsWith('/shoots')
  const isMagazine = location.pathname.startsWith('/magazine')

  const eventProjects    = useEventStore((s) => s.projects)
  const shootProjects    = useShootStore((s) => s.projects)
  const magazineProjects = useMagazineStore((s) => s.projects)
  const clearEventProjects   = useEventStore((s) => s.clearAll)
  const clearShootProjects   = useShootStore((s) => s.clearAll)
  const clearMagazineProjects = useMagazineStore((s) => s.clearAll)

  const { user, isAdmin, allowedModules, canView } = useCurrentUser()
  const memberships = useUserStore((s) => s.memberships)

  const allProjects = isEvents ? eventProjects : isShoots ? shootProjects : isMagazine ? magazineProjects : []
  const modulePath  = isEvents ? 'events' : isShoots ? 'shoots' : 'magazine'
  const module      = isEvents ? 'event'  : isShoots ? 'shoot'  : 'magazine'

  // Picker shows only accessible projects; admin / not-logged-in see all.
  //  • Magazine — scoped access model (canView), consistent with Magazine Home.
  //  • Events / Shoots — explicit project memberships (unchanged).
  const projects = useMemo(() => {
    if (!user || isAdmin) return allProjects
    if (isMagazine) return allProjects.filter((p) => canView('magazine', p.id))
    const linkedIds = new Set(
      (memberships[user.id] ?? [])
        .filter((m) => m.module === module)
        .map((m) => m.projectId)
    )
    return allProjects.filter((p) => linkedIds.has(p.id))
  }, [allProjects, user?.id, memberships, isAdmin, module, isMagazine, canView])

  const currentProject = allProjects.find((p) => p.id === id)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) setOpen(false)
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleExportProject = () => {
    const project = currentProject
    if (!project) return
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setSettingsOpen(false)
  }

  const handleClearConfirm = () => {
    if (confirmClear === 'events') {
      clearEventProjects()
      if (isEvents) navigate('/events')
    } else if (confirmClear === 'shoots') {
      clearShootProjects()
      if (isShoots) navigate('/shoots')
    } else if (confirmClear === 'magazine') {
      clearMagazineProjects()
      if (isMagazine) navigate('/magazine')
    }
    setConfirmClear(null)
    setSettingsOpen(false)
  }

  return (
    <>
      <header className="h-11 bg-surface-1 border-b border-surface-3 flex items-stretch px-4 gap-3 shrink-0 z-50 no-print">
        {/* App name */}
        <Link
          to="/"
          className="flex items-center gap-2 text-xs font-bold tracking-[0.18em] uppercase text-ink hover:text-accent transition-colors shrink-0"
        >
          Brand Workspace
          {import.meta.env.MODE !== 'production' && (
            <span className="text-2xs font-bold tracking-wide uppercase bg-amber-100 text-amber-700 border border-amber-200 rounded px-1 py-px normal-case">
              Dev
            </span>
          )}
        </Link>

        <div className="flex items-center">
          <div className="w-px h-4 bg-surface-3" />
        </div>

        {/* Module tabs — hidden when admin has restricted access for this user */}
        <nav className="flex items-stretch gap-0.5">
          {allowedModules.includes('event') && (
            <ModuleTab to="/events" label="Events" active={isEvents} />
          )}
          {allowedModules.includes('shoot') && (
            <ModuleTab to="/shoots" label="Shoots" active={isShoots} />
          )}
          {allowedModules.includes('magazine') && (
            <ModuleTab to="/magazine" label="Magazine" active={isMagazine} />
          )}
        </nav>

        {/* Project picker — only shown inside a module */}
        {(isEvents || isShoots || isMagazine) && (
          <>
            <div className="flex items-center">
              <div className="w-px h-4 bg-surface-3" />
            </div>

            <div className="flex items-center relative" ref={projectRef}>
              <button
                onClick={() => setOpen((o) => !o)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded text-sm transition-colors',
                  open
                    ? 'bg-surface-3 text-ink'
                    : 'text-ink-secondary hover:bg-surface-3 hover:text-ink'
                )}
              >
                <span className="max-w-[200px] truncate">
                  {currentProject?.name ?? (
                    <span className="text-ink-faint">Select project…</span>
                  )}
                </span>
                <ChevronDown
                  size={11}
                  className={cn('text-ink-faint transition-transform shrink-0', open && 'rotate-180')}
                />
              </button>

              {open && (
                <div className="absolute top-full left-0 mt-1 w-60 bg-white border border-surface-3 rounded shadow-lg z-50 py-1 overflow-hidden">
                  {projects.length === 0 ? (
                    <p className="px-3 py-2.5 text-xs text-ink-faint">No projects yet.</p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            navigate(`/${modulePath}/${p.id}/dashboard`)
                            setOpen(false)
                          }}
                          className={cn(
                            'w-full text-left px-3 py-1.5 text-sm transition-colors',
                            p.id === id
                              ? 'text-accent font-medium bg-surface-1'
                              : 'text-ink hover:bg-surface-1'
                          )}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-surface-3 mt-1 pt-1">
                    <button
                      onClick={() => {
                        navigate(`/${modulePath}`)
                        setOpen(false)
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-1 transition-colors"
                    >
                      All {isEvents ? 'event' : isShoots ? 'shoot' : 'magazine'} projects →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* My Tasks + Help links */}
        <Link
          to="/my-tasks"
          className="flex items-center text-xs text-ink-faint hover:text-ink transition-colors px-2"
        >
          My Tasks
        </Link>
        <Link
          to="/help"
          className="flex items-center text-xs text-ink-faint hover:text-ink transition-colors px-2"
        >
          Help
        </Link>

        <div className="flex items-center">
          <div className="w-px h-4 bg-surface-3" />
        </div>

        {/* Current user chip */}
        <div className="flex items-center">
          <UserChip />
        </div>

        <div className="flex items-center">
          <div className="w-px h-4 bg-surface-3" />
        </div>

        {/* Settings */}
        <div className="flex items-center relative" ref={settingsRef}>
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className={cn(
              'p-1.5 rounded transition-colors',
              settingsOpen
                ? 'text-ink bg-surface-3'
                : 'text-ink-faint hover:text-ink hover:bg-surface-3'
            )}
            title="Settings"
          >
            <Settings size={14} />
          </button>

          {settingsOpen && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-surface-3 rounded shadow-lg z-50 py-2 overflow-hidden">
              {currentProject && (
                <>
                  <p className="px-3 pb-1.5 text-2xs font-bold uppercase tracking-widest text-ink-faint">
                    Current Project
                  </p>
                  <button
                    onClick={handleExportProject}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-surface-1 transition-colors"
                  >
                    <Download size={12} className="text-ink-faint shrink-0" />
                    Export as JSON
                  </button>
                  <div className="border-t border-surface-3 my-1.5" />
                </>
              )}
              <p className="px-3 pb-1.5 text-2xs font-bold uppercase tracking-widest text-ink-faint">
                Data Management
              </p>
              <button
                onClick={() => setConfirmClear('events')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-surface-1 transition-colors"
              >
                <Trash2 size={12} className="text-red-400 shrink-0" />
                Clear event projects
                <span className="ml-auto text-2xs text-ink-faint">{eventProjects.length}</span>
              </button>
              <button
                onClick={() => setConfirmClear('shoots')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-surface-1 transition-colors"
              >
                <Trash2 size={12} className="text-red-400 shrink-0" />
                Clear shoot projects
                <span className="ml-auto text-2xs text-ink-faint">{shootProjects.length}</span>
              </button>
              <button
                onClick={() => setConfirmClear('magazine')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-surface-1 transition-colors"
              >
                <Trash2 size={12} className="text-red-400 shrink-0" />
                Clear magazine projects
                <span className="ml-auto text-2xs text-ink-faint">{magazineProjects.length}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <ConfirmDialog
        open={!!confirmClear}
        title={`Clear all ${confirmClear === 'events' ? 'event' : confirmClear === 'shoots' ? 'shoot' : 'magazine'} projects`}
        message={(() => {
          const count = confirmClear === 'events' ? eventProjects.length : confirmClear === 'shoots' ? shootProjects.length : magazineProjects.length
          const noun  = confirmClear === 'events' ? 'event' : confirmClear === 'shoots' ? 'shoot' : 'magazine'
          return `This will permanently delete all ${count} ${noun} project${count !== 1 ? 's' : ''} and all their data. This cannot be undone.`
        })()}
        confirmLabel="Delete all"
        onConfirm={handleClearConfirm}
        onCancel={() => setConfirmClear(null)}
      />

    </>
  )
}

function ModuleTab({
  to,
  label,
  active,
}: {
  to: string
  label: string
  active: boolean
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center px-3 text-sm border-b-2 transition-colors',
        active
          ? 'text-accent font-medium border-accent'
          : 'text-ink-muted border-transparent hover:text-ink'
      )}
    >
      {label}
    </Link>
  )
}
