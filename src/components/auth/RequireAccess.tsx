import { Navigate, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { MODULE_SECTIONS, type AccessModule } from '@/auth/access'
import type { SectionKey } from '@/auth/permissions'

// ─────────────────────────────────────────────────────────────────────────────
// Route-level access guards.
//
// Thin wrappers around the centralized resolver in useCurrentUser. They protect
// project and page routes so a member cannot reach a non-granted project/page by
// typing the URL. Admin and not-logged-in/guest pass through (the resolver returns
// true for them), preserving dev/guest behaviour. Editing is gated separately,
// in-page, via canEdit(section, projectId).
// ─────────────────────────────────────────────────────────────────────────────

const MODULE_HOME: Record<AccessModule, string> = {
  magazine: '/magazine',
  event:    '/events',
  shoot:    '/shoots',
}

// Section → route segment within a project. Used to compute the redirect target
// when a user can view a project but not the requested section. Magazine, event,
// and shoot are all mapped (each has page-scoped route guards).
const SECTION_PATH: Partial<Record<SectionKey, string>> = {
  // Magazine
  'magazine.tasks':    'tasks',
  'magazine.writing':  'writing',
  'magazine.visual':   'visual',
  'magazine.graphics': 'graphics',
  'magazine.spread':   'spread',
  'magazine.outreach': 'outreach',
  'magazine.budget':   'budget',
  // Events
  'event.tasks':       'tasks',
  'event.timeline':    'timeline',
  'event.budget':      'budget',
  'event.vendors':     'vendors',
  'event.teams':       'teams',
  'event.creative':    'creative',
  'event.collaterals': 'collaterals',
  'event.props':       'props',
  // Shoots
  'shoot.checklist':   'checklist',
  'shoot.timeline':    'timeline',
  'shoot.budget':      'budget',
  'shoot.vendors':     'vendors',
  'shoot.crew':        'crew-talent',
  'shoot.creative':    'creative',
  'shoot.styling':     'products-styling',
  'shoot.callsheet':   'call-sheet',
  'shoot.brief':       'shot-brief',
  'shoot.props':       'props',
}

/**
 * Project-level guard. Renders children only if the user may VIEW the project.
 * On deny → module home.
 */
export function RequireProjectAccess({
  module, children,
}: {
  module: AccessModule
  children: ReactNode
}) {
  const { id } = useParams()
  const { canView } = useCurrentUser()
  if (!id || !canView(module, id)) return <Navigate to={MODULE_HOME[module]} replace />
  return <>{children}</>
}

/**
 * Page-level guard. Requires project view AND section view.
 *   • cannot view the project      → module home
 *   • can view project, not section → the project's first allowed section
 *     (fallback: the project root, which redirects to its dashboard/board)
 */
export function RequireSectionAccess({
  module, section, children,
}: {
  module: AccessModule
  section: SectionKey
  children: ReactNode
}) {
  const { id } = useParams()
  const { canView, canViewSection } = useCurrentUser()
  if (!id || !canView(module, id)) return <Navigate to={MODULE_HOME[module]} replace />
  if (!canViewSection(section, id)) {
    const first  = MODULE_SECTIONS[module].find((s) => canViewSection(s.key, id))
    const seg    = first ? SECTION_PATH[first.key] : undefined
    const target = seg ? `${MODULE_HOME[module]}/${id}/${seg}` : `${MODULE_HOME[module]}/${id}`
    return <Navigate to={target} replace />
  }
  return <>{children}</>
}
