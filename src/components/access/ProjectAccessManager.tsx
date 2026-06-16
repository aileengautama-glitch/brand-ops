import { useState } from 'react'
import { Plus, Trash2, Lock } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { buildDirectory, MEMBER_STATUS_LABEL } from '@/auth/members'
import { MODULE_SECTIONS, findGrant, type AccessModule, type AccessLevel } from '@/auth/access'
import PageSection from '@/components/layout/PageSection'
import { cn } from '@/lib/utils'

/**
 * ProjectAccessManager — shared per-project page/section ACCESS surface (admin only).
 *
 * Assigns directory members (app users + custom members) scoped view/edit access to THIS
 * project's pages, using the same access_grants model as the cross-project Settings →
 * Project & Page Access manager — just transposed (one project × its assigned members).
 *
 * This is the magazine Team-tab access pattern, generalised and mounted inside the event
 * and shoot team pages so every project type follows the same per-project access model.
 * It does NOT replace the project roster (TeamMember / crew) above it — role assignment
 * stays on the roster; this surface is purely scoped page access. No parallel permission
 * system: it reads/writes useUserStore.accessGrants exactly like the existing surfaces.
 */
const LEVEL_OPTIONS: AccessLevel[] = ['none', 'view', 'edit']
const LEVEL_LABEL: Record<AccessLevel, string> = { none: 'No access', view: 'View only', edit: 'Can edit' }

export default function ProjectAccessManager({
  module,
  projectId,
}: {
  module: AccessModule
  projectId: string
}) {
  const { isAdmin } = useCurrentUser()
  const customMembers           = useUserStore((s) => s.customMembers)
  const accessGrants            = useUserStore((s) => s.accessGrants)
  const userAccessOverrides     = useUserStore((s) => s.userAccessOverrides)
  const setProjectAccessDefault = useUserStore((s) => s.setProjectAccessDefault)
  const setSectionAccess        = useUserStore((s) => s.setSectionAccess)
  const removeProjectGrant      = useUserStore((s) => s.removeProjectGrant)

  const [addUserId, setAddUserId] = useState('')

  // Access management is admin-only — the project roster above stays visible to everyone.
  if (!isAdmin) return null

  const directory = buildDirectory(customMembers) // local-authoritative (APP_USERS + custom members)
  const sections  = MODULE_SECTIONS[module]

  const effAdmin = (uid: string): boolean => {
    const ov = userAccessOverrides[uid]
    const p  = directory.find((x) => x.id === uid)
    return ov?.isAdmin !== undefined ? ov.isAdmin : (p?.isAdmin ?? false)
  }
  const grantFor   = (uid: string) => findGrant(accessGrants[uid] ?? [], module, projectId)
  const assigned   = directory.filter((p) => !effAdmin(p.id) && grantFor(p.id))
  const unassigned = directory.filter((p) => !effAdmin(p.id) && !grantFor(p.id))

  const handleAssign = () => {
    if (!addUserId) return
    setProjectAccessDefault(addUserId, module, projectId, 'view') // sensible project-wide default
    setAddUserId('')
  }

  return (
    <PageSection label={`Page access — ${assigned.length} member${assigned.length !== 1 ? 's' : ''}`}>
      {/* Assign an existing directory member to this project */}
      <div className="flex flex-wrap items-end gap-2 border border-surface-2 rounded-lg p-3 bg-surface-1/50 mb-3">
        <div className="space-y-1 flex-1 min-w-[200px]">
          <label className="text-2xs uppercase tracking-wide text-ink-faint block">Assign member to this project</label>
          <select
            value={addUserId}
            onChange={(e) => setAddUserId(e.target.value)}
            className="w-full text-sm border border-surface-3 rounded px-2 py-1 bg-white"
          >
            <option value="">{unassigned.length ? 'Select a member…' : 'Everyone is assigned'}</option>
            {unassigned.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.isAppUser ? '' : ' (manual)'}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAssign}
          disabled={!addUserId}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40"
        >
          <Plus size={13} /> Assign
        </button>
      </div>

      {assigned.length === 0 ? (
        <p className="text-xs text-ink-faint italic px-1 py-2">
          No one has scoped page access to this project yet. Assign a member above, then set their pages.
          Admins always have full access; members with no grants keep their default module access.
        </p>
      ) : (
        <div className="space-y-3">
          {assigned.map((p) => {
            const grant = grantFor(p.id)!
            const projectDefault = (grant.sections['*'] ?? 'none') as AccessLevel
            return (
              <div key={p.id} className="border border-surface-3 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-1 border-b border-surface-3">
                  <span
                    className="rounded-full flex items-center justify-center text-white text-2xs font-semibold shrink-0"
                    style={{ width: 24, height: 24, backgroundColor: p.avatarColor }}
                  >
                    {p.initials}
                  </span>
                  <span className="text-sm font-medium text-ink truncate">{p.name}</span>
                  {!p.isAppUser && (
                    <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-surface-2 text-ink-faint shrink-0">
                      {p.status ? MEMBER_STATUS_LABEL[p.status] : 'Manual'}
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => setProjectAccessDefault(p.id, module, projectId, 'edit')}
                      disabled={projectDefault === 'edit'}
                      className="text-2xs text-accent hover:text-accent-dark transition-colors disabled:opacity-30 disabled:hover:text-accent"
                      title="Grant full edit access to this whole project (all pages)"
                    >
                      All access
                    </button>
                    <label className="text-2xs text-ink-faint">Whole project</label>
                    <select
                      value={projectDefault}
                      onChange={(e) => setProjectAccessDefault(p.id, module, projectId, e.target.value as AccessLevel)}
                      className="text-xs border border-surface-3 rounded px-1.5 py-0.5 bg-white"
                    >
                      {LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                    </select>
                    <button
                      onClick={() => removeProjectGrant(p.id, module, projectId)}
                      className="p-1 rounded text-ink-faint hover:text-red-500 transition-colors"
                      title="Remove from project"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {sections.map((sec) => {
                    const explicit = grant.sections[sec.key]
                    const value = explicit ?? 'inherit'
                    return (
                      <div key={sec.key} className="flex items-center justify-between gap-2 px-1.5 py-1 rounded hover:bg-surface-1">
                        <span className="text-xs text-ink-secondary">{sec.label}</span>
                        <select
                          value={value}
                          onChange={(e) => setSectionAccess(p.id, module, projectId, sec.key, e.target.value as AccessLevel | 'inherit')}
                          className={cn('text-2xs border rounded px-1.5 py-0.5 bg-white', explicit ? 'border-accent/40 text-ink' : 'border-surface-3 text-ink-faint')}
                        >
                          <option value="inherit">Inherit ({LEVEL_LABEL[projectDefault].toLowerCase()})</option>
                          {LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                        </select>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-2xs text-ink-faint mt-3 leading-relaxed">
        <Lock size={11} className="inline mr-1 -mt-0.5" />
        Assigning a member here scopes their access to granted projects only (deny-by-default).
        Manage roles and the team roster above; the same access is editable across all projects in
        Settings → Project &amp; Page Access.
      </p>
    </PageSection>
  )
}
