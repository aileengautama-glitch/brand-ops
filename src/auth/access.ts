import type { SectionKey } from './permissions'

// ─────────────────────────────────────────────────────────────────────────────
// Scoped access model (project + page level, view/edit)
//
// This sits ON TOP of the existing module/role/membership permissions. It is the
// single source of truth for project-scoped and section-scoped access. The
// composition with admin/guest/legacy lives in one place (useCurrentUser); the
// helpers here are pure and store-agnostic so they are easy to test and reuse.
//
// Transition rule (see resolveSectionAccess / resolveProjectView in useCurrentUser):
//   • A user with ANY grant in a module is governed by grants in that module
//     (deny-by-default — only granted projects/sections).
//   • A user with NO grants in a module falls back to the legacy behaviour.
// ─────────────────────────────────────────────────────────────────────────────

export type AccessModule = 'event' | 'shoot' | 'magazine'
export type AccessLevel  = 'none' | 'view' | 'edit'

/** Numeric ranking so levels can be compared (none < view < edit). */
export const ACCESS_RANK: Record<AccessLevel, number> = { none: 0, view: 1, edit: 2 }

/**
 * A per-project access grant for a single user.
 * `sections` maps a SectionKey → level; the special '*' key is the project-wide
 * default applied to any section not listed explicitly.
 *   e.g. { '*': 'view', 'magazine.writing': 'edit' }
 */
export interface ProjectGrant {
  module: AccessModule
  projectId: string
  sections: Record<string, AccessLevel>
}

/** Derive the owning module from a SectionKey ('magazine.writing' → 'magazine'). */
export function sectionModule(section: SectionKey): AccessModule {
  return section.split('.')[0] as AccessModule
}

/** Does this user have at least one grant in the given module? */
export function hasModuleGrants(grants: ProjectGrant[], module: AccessModule): boolean {
  return grants.some((g) => g.module === module)
}

/** The grant for a specific project, if any. */
export function findGrant(
  grants: ProjectGrant[], module: AccessModule, projectId: string
): ProjectGrant | undefined {
  return grants.find((g) => g.module === module && g.projectId === projectId)
}

/** Resolve a section's level within a grant: explicit → project default '*' → none. */
export function grantSectionLevel(grant: ProjectGrant | undefined, section: SectionKey): AccessLevel {
  if (!grant) return 'none'
  return grant.sections[section] ?? grant.sections['*'] ?? 'none'
}

/** The highest level a grant confers anywhere on its project (used for visibility). */
export function grantProjectLevel(grant: ProjectGrant | undefined): AccessLevel {
  if (!grant) return 'none'
  let best: AccessLevel = 'none'
  for (const lvl of Object.values(grant.sections)) {
    if (ACCESS_RANK[lvl] > ACCESS_RANK[best]) best = lvl
  }
  return best
}

// ─── Section catalog (drives the admin UI) ──────────────────────────────────
// Page-level sections per module, reusing the existing SectionKey values.

export const MODULE_SECTIONS: Record<AccessModule, { key: SectionKey; label: string }[]> = {
  magazine: [
    { key: 'magazine.tasks',    label: 'Tasks' },
    { key: 'magazine.writing',  label: 'Writing' },
    { key: 'magazine.visual',   label: 'Visual' },
    { key: 'magazine.graphics', label: 'Graphics' },
    { key: 'magazine.spread',   label: 'Spread' },
    { key: 'magazine.outreach', label: 'Outreach' },
    { key: 'magazine.budget',   label: 'Budget' },
  ],
  event: [
    { key: 'event.tasks',       label: 'Tasks' },
    { key: 'event.timeline',    label: 'Timeline' },
    { key: 'event.budget',      label: 'Budget' },
    { key: 'event.vendors',     label: 'Vendors' },
    { key: 'event.teams',       label: 'Teams' },
    { key: 'event.creative',    label: 'Creative' },
    { key: 'event.collaterals', label: 'Collaterals' },
    { key: 'event.props',       label: 'Props' },
  ],
  shoot: [
    { key: 'shoot.checklist', label: 'Checklist' },
    { key: 'shoot.timeline',  label: 'Timeline' },
    { key: 'shoot.budget',    label: 'Budget' },
    { key: 'shoot.vendors',   label: 'Vendors' },
    { key: 'shoot.crew',      label: 'Crew & Talent' },
    { key: 'shoot.creative',  label: 'Creative' },
    { key: 'shoot.styling',   label: 'Styling' },
    { key: 'shoot.callsheet', label: 'Call Sheet' },
    { key: 'shoot.brief',     label: 'Brief' },
    { key: 'shoot.props',     label: 'Props' },
  ],
}

export const MODULE_LABELS: Record<AccessModule, string> = {
  event: 'Events', shoot: 'Shoots', magazine: 'Magazine',
}
