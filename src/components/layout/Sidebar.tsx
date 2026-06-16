import { Link, useLocation, useParams } from 'react-router-dom'
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  Wallet,
  Building2,
  Users,
  Palette,
  FileText,
  Clock,
  Camera,
  FolderOpen,
  Package,
  ClipboardList,
  Layers,
  Box,
  Image,
  PenLine,
  BookOpen,
  Mail,
  FileCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEventStore } from '@/store/useEventStore'
import { useShootStore } from '@/store/useShootStore'
import { useMagazineStore } from '@/store/useMagazineStore'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { SectionKey } from '@/auth/permissions'

type NavItem = {
  label: string
  path: string
  icon: React.ElementType
  /** When set, the tab is hidden from members without view access to this section. */
  sectionKey?: SectionKey
  /** When true, the tab is only shown to workspace admins. */
  adminOnly?: boolean
}

const eventNavItems: NavItem[] = [
  { label: 'Dashboard', path: 'dashboard', icon: LayoutDashboard },
  { label: 'Tasks & Checklist', path: 'tasks', icon: CheckSquare, sectionKey: 'event.tasks' },
  { label: 'Timeline & Schedule', path: 'timeline', icon: CalendarDays, sectionKey: 'event.timeline' },
  { label: 'Budget', path: 'budget', icon: Wallet, sectionKey: 'event.budget' },
  { label: 'Vendors & Suppliers', path: 'vendors', icon: Building2, sectionKey: 'event.vendors' },
  { label: 'Teams & Roles', path: 'teams', icon: Users, sectionKey: 'event.teams' },
  { label: 'Creative', path: 'creative', icon: Palette, sectionKey: 'event.creative' },
  { label: 'Collaterals', path: 'collaterals', icon: Layers, sectionKey: 'event.collaterals' },
  { label: 'Props', path: 'props', icon: Box, sectionKey: 'event.props' },
  { label: 'Brief Deck', path: 'brief-deck', icon: FileText },
]

const magazineNavItems: NavItem[] = [
  { label: 'Board',         path: 'board',         icon: LayoutDashboard },
  { label: 'Tasks',         path: 'tasks',         icon: CheckSquare, sectionKey: 'magazine.tasks' },
  { label: 'Visual',        path: 'visual',        icon: Image,       sectionKey: 'magazine.visual' },
  { label: 'Writing',       path: 'writing',       icon: PenLine,     sectionKey: 'magazine.writing' },
  // Writing Hours is reached from inside the Writing tab (its "Hours" button), not a
  // standalone tab — keeps writer-hours scoped to the Writing section.
  { label: 'Graphics',      path: 'graphics',      icon: Layers,      sectionKey: 'magazine.graphics' },
  { label: 'Spread',        path: 'spread',        icon: BookOpen,    sectionKey: 'magazine.spread' },
  { label: 'Outreach',      path: 'outreach',      icon: Mail,        sectionKey: 'magazine.outreach' },
  { label: 'Budget',        path: 'budget',        icon: Wallet,      sectionKey: 'magazine.budget' },
  { label: 'Final Files',   path: 'print-files',   icon: FileCheck },
  { label: 'Team Access',   path: 'team',          icon: Users,       adminOnly: true },
]

const shootNavItems: NavItem[] = [
  { label: 'Dashboard', path: 'dashboard', icon: LayoutDashboard },
  { label: 'Pre-Production Checklist', path: 'checklist', icon: CheckSquare, sectionKey: 'shoot.checklist' },
  { label: 'Timeline & Schedule', path: 'timeline', icon: CalendarDays, sectionKey: 'shoot.timeline' },
  { label: 'D-Day Timeline', path: 'dday-timeline', icon: Clock, sectionKey: 'shoot.timeline' },
  { label: 'Budget', path: 'budget', icon: Wallet, sectionKey: 'shoot.budget' },
  { label: 'Vendors & Suppliers', path: 'vendors', icon: Building2, sectionKey: 'shoot.vendors' },
  { label: 'Crew & Talent', path: 'crew-talent', icon: Users, sectionKey: 'shoot.crew' },
  { label: 'Products & Styling', path: 'products-styling', icon: Package, sectionKey: 'shoot.styling' },
  { label: 'Props', path: 'props', icon: Box, sectionKey: 'shoot.props' },
  { label: 'Creative & Shot List', path: 'creative', icon: Palette, sectionKey: 'shoot.creative' },
  { label: 'Shot Brief', path: 'shot-brief', icon: Camera, sectionKey: 'shoot.brief' },
  { label: 'Call Sheet', path: 'call-sheet', icon: ClipboardList, sectionKey: 'shoot.callsheet' },
  { label: 'Brief Deck', path: 'brief-deck', icon: FileText },
]

export default function Sidebar() {
  const location = useLocation()
  const { id } = useParams()
  const { canViewSection, isAdmin } = useCurrentUser()

  const isEvents   = location.pathname.startsWith('/events')
  const isShoots   = location.pathname.startsWith('/shoots')
  const isMagazine = location.pathname.startsWith('/magazine')

  const eventProjects   = useEventStore((s) => s.projects)
  const shootProjects   = useShootStore((s) => s.projects)
  const magazineProjects = useMagazineStore((s) => s.projects)

  if (!isEvents && !isShoots && !isMagazine) return null

  const module   = isEvents ? 'events' : isShoots ? 'shoots' : 'magazine'
  const allNavItems = isEvents ? eventNavItems : isShoots ? shootNavItems : magazineNavItems
  // Hide section tabs a scoped member has no view access to (page-level access),
  // and admin-only tabs from non-admins.
  const navItems = allNavItems.filter(
    (item) =>
      (!item.adminOnly || isAdmin) &&
      (!item.sectionKey || !id || canViewSection(item.sectionKey, id))
  )
  const projects = isEvents ? eventProjects : isShoots ? shootProjects : magazineProjects
  const currentProject = projects.find((p) => p.id === id)

  const isActiveRoute = (path: string) =>
    location.pathname === `/${module}/${id}/${path}`

  return (
    <aside className="w-[212px] bg-surface-1 border-r border-surface-3 flex flex-col shrink-0 overflow-y-auto no-print">
      {/* Module label */}
      <div className="px-4 pt-5 pb-2.5">
        <span className="text-2xs font-bold tracking-[0.16em] uppercase text-ink-faint">
          {isEvents ? 'Event Production' : isShoots ? 'Photoshoot Pre-Prod' : 'Magazine'}
        </span>
      </div>

      {/* All projects link */}
      <div className="px-2.5 pb-1">
        <Link
          to={`/${module}`}
          className={cn(
            'flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-colors',
            !id
              ? 'text-accent font-medium bg-accent/10'
              : 'text-ink-muted hover:text-ink hover:bg-surface-3'
          )}
        >
          <FolderOpen size={13} className="shrink-0" />
          All Projects
        </Link>
      </div>

      {/* Project nav — shown only when inside a project */}
      {id && (
        <>
          <div className="mx-4 border-t border-surface-2 my-1.5" />

          {/* Project name */}
          <div className="px-4 py-2.5">
            <p className="text-sm font-semibold text-ink truncate leading-snug">
              {currentProject?.name ?? 'Project'}
            </p>
          </div>

          {/* Nav items */}
          <nav className="flex flex-col px-2.5 pb-4 gap-1">
            {navItems.map((item) => {
              const active = isActiveRoute(item.path)
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={`/${module}/${id}/${item.path}`}
                  className={cn(
                    'flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-colors',
                    active
                      ? 'text-accent font-medium bg-accent/10'
                      : 'text-ink-secondary hover:text-ink hover:bg-surface-3'
                  )}
                >
                  <Icon
                    size={13}
                    className={cn('shrink-0', active ? 'text-accent' : 'text-ink-faint')}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </>
      )}
    </aside>
  )
}
