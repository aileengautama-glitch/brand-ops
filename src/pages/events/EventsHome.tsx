import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Calendar, ChevronRight, Trash2, AlertTriangle, X, WifiOff } from 'lucide-react'
import { useEventStore } from '@/store/useEventStore'
import { useCreateProject } from '@/hooks/useCreateProject'
import { useBackendStatus } from '@/store/useBackendStatus'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { formatDate } from '@/lib/utils'
import PageHeader from '@/components/layout/PageHeader'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { EventProject } from '@/types/event'

export default function EventsHome() {
  const projects    = useEventStore((s) => s.projects)
  const removeProject = useEventStore((s) => s.removeProject)
  const navigate    = useNavigate()
  const { create, creating, error: createError, clearError } = useCreateProject('event')
  const backendIssue = useBackendStatus((s) => s.issue)

  const { isLoggedIn, isAdmin, allowedModules, canView } = useCurrentUser()

  const [showForm, setShowForm]       = useState(false)
  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [deleteId, setDeleteId]       = useState<string | null>(null)

  // Visibility — centralized in useCurrentUser.canView:
  //   admin → all · scoped grants → granted projects only · legacy → membership
  const visibleProjects: typeof projects = (() => {
    if (!isLoggedIn) return projects
    return projects.filter((p) => canView('event', p.id))
  })()

  const handleCreate = async () => {
    if (!name.trim() || creating) return
    const id = await create(name.trim(), description.trim())
    if (!id) return   // failed — error is shown, nothing was added
    setName(''); setDescription(''); setShowForm(false)
    navigate(`/events/${id}/dashboard`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) handleCreate()
    if (e.key === 'Escape') { setShowForm(false); setName(''); setDescription('') }
  }

  const projectToDelete = projects.find((p) => p.id === deleteId)

  // Module-level access gate — admin-configurable in Settings → Team Access
  if (isLoggedIn && !allowedModules.includes('event')) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="text-center py-14">
          <Calendar size={28} className="mx-auto mb-3 text-ink-faint opacity-30" />
          <p className="text-sm font-medium text-ink-muted">No access to Event Projects</p>
          <p className="text-xs text-ink-faint mt-1">
            Contact your admin if you need access to this module.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl">
      <PageHeader
        title="Event Projects"
        subtitle="All internal brand event production projects."
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-sm rounded hover:bg-accent-dark transition-colors"
          >
            <Plus size={13} /> New Event Project
          </button>
        }
      />

      {showForm && (
        <div className="mb-5 p-4 bg-surface-1 border border-surface-3 rounded">
          <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint mb-3">New Event Project</p>
          <div className="space-y-2">
            <input autoFocus type="text" placeholder="Project name" value={name}
              onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyDown}
              className="w-full px-3 py-1.5 text-sm border border-surface-3 rounded bg-white focus:outline-none focus:border-accent placeholder:text-ink-faint" />
            <input type="text" placeholder="Short description (optional)" value={description}
              onChange={(e) => setDescription(e.target.value)} onKeyDown={handleKeyDown}
              className="w-full px-3 py-1.5 text-sm border border-surface-3 rounded bg-white focus:outline-none focus:border-accent placeholder:text-ink-faint" />
            {createError && (
              <div className="flex items-start gap-2 px-2.5 py-2 rounded border border-red-200 bg-red-50 text-xs text-red-700">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold">Project not created</p>
                  <p className="opacity-90">{createError}</p>
                </div>
                <button onClick={clearError} className="ml-auto shrink-0 p-0.5 hover:opacity-70"><X size={12} /></button>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={handleCreate} disabled={!name.trim() || creating}
                className="px-3 py-1.5 bg-accent text-white text-sm rounded disabled:opacity-40 hover:bg-accent-dark transition-colors">
                {creating ? "Creating…" : "Create project"}
              </button>
              <button onClick={() => { setShowForm(false); setName(''); setDescription('') }}
                className="px-3 py-1.5 text-sm text-ink-muted hover:text-ink border border-surface-3 rounded transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Visibility status bar ─────────────────────────────────────── */}
      {isLoggedIn && projects.length > 0 && !isAdmin && (
        <div className="mb-3 min-h-[20px]">
          {visibleProjects.length === 0 ? (
            <p className="text-xs text-ink-faint">No projects assigned to your profile yet.</p>
          ) : visibleProjects.length < projects.length ? (
            <p className="text-xs text-ink-faint">
              Showing {visibleProjects.length} of {projects.length} projects
            </p>
          ) : null}
        </div>
      )}

      {projects.length === 0 ? (
        backendIssue !== 'none' ? (
          <div className="text-center py-14 text-ink-faint">
            <WifiOff size={28} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium text-ink-muted">Can't reach the backend</p>
            <p className="text-xs mt-1">
              This list may be incomplete — projects stored on the server can't be loaded right now.
            </p>
            <button onClick={() => window.location.reload()}
              className="mt-3 px-3 py-1.5 text-xs border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">
              Retry
            </button>
          </div>
        ) : (
          <div className="text-center py-14 text-ink-faint">
            <Calendar size={28} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-ink-muted">No event projects yet.</p>
            <p className="text-xs mt-1">Create your first project to get started.</p>
          </div>
        )
      ) : visibleProjects.length === 0 ? (
        <div className="text-center py-10 text-ink-faint">
          <p className="text-sm text-ink-muted">No projects linked to your profile yet.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleProjects.map((project) => (
            <EventProjectCard
              key={project.id}
              project={project}
              onDelete={() => setDeleteId(project.id)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete project"
        message={`Delete "${projectToDelete?.name}"? All tasks, budget, vendors, and team data will be permanently removed.`}
        confirmLabel="Delete"
        onConfirm={() => { if (deleteId) removeProject(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

function EventProjectCard({ project, onDelete }: { project: EventProject; onDelete: () => void }) {
  const doneTasks = project.tasks.filter((t) => t.status === 'done').length
  const totalTasks = project.tasks.length
  const confirmedVendors = project.vendors.filter((v) => v.status === 'confirmed').length

  return (
    <div className="flex items-stretch group card-soft card-interactive">
      <Link to={`/events/${project.id}/dashboard`} className="flex-1 flex items-center justify-between px-4 py-3.5 min-w-0">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink truncate">{project.name}</p>
          {project.description && (
            <p className="text-xs text-ink-muted mt-0.5 truncate">{project.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {project.eventDate && (
              <span className="text-2xs text-ink-faint">
                Event: {formatDate(project.eventDate, 'dd MMM yyyy')}
              </span>
            )}
            {project.venue && (
              <span className="text-2xs text-ink-faint truncate max-w-[160px]">{project.venue}</span>
            )}
            {totalTasks > 0 && (
              <span className="text-2xs text-ink-faint">
                Tasks: {doneTasks}/{totalTasks} done
              </span>
            )}
            {project.vendors.length > 0 && (
              <span className="text-2xs text-ink-faint">
                Vendors: {confirmedVendors}/{project.vendors.length} confirmed
              </span>
            )}
            <span className="text-2xs text-ink-faint/60">
              Updated {formatDate(project.updatedAt)}
            </span>
          </div>
        </div>
        <ChevronRight size={14} className="text-ink-faint group-hover:text-ink-muted transition-colors ml-3 shrink-0" />
      </Link>
      <button
        onClick={onDelete}
        className="px-3 text-ink-faint hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
        title="Delete project"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}
