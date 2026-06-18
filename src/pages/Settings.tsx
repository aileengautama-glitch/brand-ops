import { useRef, useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { ShieldCheck, KeyRound, CheckCircle2, AlertCircle, Lock, Plus, Trash2, UserPlus, Send, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useUserStore } from '@/store/useUserStore'
import { useEventStore } from '@/store/useEventStore'
import { useShootStore } from '@/store/useShootStore'
import { useMagazineStore } from '@/store/useMagazineStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import { inviteByEmail } from '@/lib/supabaseAuth'
import { PeopleRepository } from '@/repositories'
import { supabaseDeleteCustomMember } from '@/repositories/people'
import { APP_USERS, ROLE_LABELS } from '@/auth/users'
import {
  MODULE_SECTIONS, MODULE_LABELS,
  type AccessModule, type AccessLevel,
} from '@/auth/access'
import { buildDirectory, MEMBER_STATUS_LABEL, memberCanInvite, type CustomMember } from '@/auth/members'
import { UserAvatar } from '@/components/auth/UserSelector'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PageHeader from '@/components/layout/PageHeader'

// ─── Controlled 4-digit PIN boxes ────────────────────────────────────────────
// Unlike PinEntry (login), these don't auto-submit — the parent form controls when
// to validate. Parent owns the string value; this component just renders the boxes.

function PinBoxes({
  value,
  onChange,
  error = false,
  autoFocus = false,
}: {
  value: string
  onChange: (v: string) => void
  error?: boolean
  autoFocus?: boolean
}) {
  const r0 = useRef<HTMLInputElement>(null)
  const r1 = useRef<HTMLInputElement>(null)
  const r2 = useRef<HTMLInputElement>(null)
  const r3 = useRef<HTMLInputElement>(null)
  const refs = [r0, r1, r2, r3]

  const digits = Array.from({ length: 4 }, (_, i) => value[i] ?? '')

  const handleChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return
    const next = [...digits]
    next[i] = v
    onChange(next.join(''))
    if (v && i < 3) refs[i + 1].current?.focus()
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus()
  }

  return (
    <div className="flex gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={d}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={cn(
            'w-11 h-11 text-center text-lg font-bold border rounded-lg bg-white focus:outline-none transition-colors',
            error
              ? 'border-red-400 bg-red-50'
              : 'border-surface-3 focus:border-accent'
          )}
        />
      ))}
    </div>
  )
}

// ─── PIN field label row ──────────────────────────────────────────────────────

function PinRow({
  label,
  value,
  onChange,
  error,
  autoFocus,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  error?: boolean
  autoFocus?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-ink-muted w-36 shrink-0">{label}</label>
      <PinBoxes value={value} onChange={onChange} error={error} autoFocus={autoFocus} />
    </div>
  )
}

// ─── Change PIN section (all logged-in users) ─────────────────────────────────

type PinStatus = 'idle' | 'success' | 'wrong-current' | 'mismatch' | 'too-short'

function ChangePinSection() {
  const { user } = useCurrentUser()
  const getEffectivePin = useUserStore((s) => s.getEffectivePin)
  const setPinOverride  = useUserStore((s) => s.setPinOverride)

  const [current, setCurrent]     = useState('')
  const [newPin, setNewPin]       = useState('')
  const [confirm, setConfirm]     = useState('')
  const [status, setStatus]       = useState<PinStatus>('idle')

  if (!user) return null

  const allFilled = current.length === 4 && newPin.length === 4 && confirm.length === 4

  const handleSubmit = () => {
    if (!allFilled) { setStatus('too-short'); return }
    if (!/^\d{4}$/.test(current) || !/^\d{4}$/.test(newPin) || !/^\d{4}$/.test(confirm)) {
      setStatus('too-short'); return
    }
    if (current !== getEffectivePin(user.id)) {
      setStatus('wrong-current')
      setCurrent('')
      return
    }
    if (newPin !== confirm) {
      setStatus('mismatch')
      setNewPin('')
      setConfirm('')
      return
    }
    setPinOverride(user.id, newPin)
    setStatus('success')
    setCurrent('')
    setNewPin('')
    setConfirm('')
  }

  const reset = () => {
    setStatus('idle')
    setCurrent('')
    setNewPin('')
    setConfirm('')
  }

  return (
    <div className="bg-white border border-surface-3 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-3 bg-surface-1">
        <KeyRound size={13} className="text-ink-faint" />
        <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">My Account</h2>
      </div>

      <div className="p-5 space-y-5">
        {/* User identity row */}
        <div className="flex items-center gap-3 pb-4 border-b border-surface-2">
          <UserAvatar user={user} size="lg" />
          <div>
            <p className="text-sm font-semibold text-ink">{user.name}</p>
            <p className="text-xs text-ink-faint">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>

        {/* Change PIN form */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-ink mb-3">Change PIN</p>

          <div className="space-y-3">
            <PinRow
              label="Current PIN"
              value={current}
              onChange={(v) => { setCurrent(v); if (status !== 'idle') setStatus('idle') }}
              error={status === 'wrong-current'}
              autoFocus
            />
            {status === 'wrong-current' && (
              <p className="text-xs text-red-500 ml-40 flex items-center gap-1">
                <AlertCircle size={11} /> Incorrect PIN — try again
              </p>
            )}

            <PinRow
              label="New PIN"
              value={newPin}
              onChange={(v) => { setNewPin(v); if (status !== 'idle') setStatus('idle') }}
              error={status === 'mismatch'}
            />

            <PinRow
              label="Confirm new PIN"
              value={confirm}
              onChange={(v) => { setConfirm(v); if (status !== 'idle') setStatus('idle') }}
              error={status === 'mismatch'}
            />
            {status === 'mismatch' && (
              <p className="text-xs text-red-500 ml-40 flex items-center gap-1">
                <AlertCircle size={11} /> PINs don't match
              </p>
            )}
            {status === 'too-short' && (
              <p className="text-xs text-red-500 ml-40 flex items-center gap-1">
                <AlertCircle size={11} /> All PINs must be exactly 4 digits
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          {status === 'success' ? (
            <p className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle2 size={14} /> PIN updated successfully
            </p>
          ) : (
            <>
              <button
                onClick={handleSubmit}
                disabled={!allFilled}
                className="px-4 py-1.5 bg-accent text-white text-sm rounded hover:bg-accent-dark disabled:opacity-40 transition-colors"
              >
                Change PIN
              </button>
              {(current || newPin || confirm) && (
                <button
                  onClick={reset}
                  className="text-sm text-ink-faint hover:text-ink transition-colors"
                >
                  Clear
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Team Access section (admin only) ────────────────────────────────────────

function TeamAccessSection() {
  const currentUserId         = useUserStore((s) => s.currentUserId)
  const userAccessOverrides   = useUserStore((s) => s.userAccessOverrides)
  const setUserAccessOverride = useUserStore((s) => s.setUserAccessOverride)
  const resetUserAccessOverride = useUserStore((s) => s.resetUserAccessOverride)

  const getOverride = (userId: string) => userAccessOverrides[userId] ?? {}

  const effectiveAdmin = (userId: string): boolean => {
    const u = APP_USERS.find((x) => x.id === userId)!
    const ov = getOverride(userId)
    return ov.isAdmin !== undefined ? ov.isAdmin : (u.isAdmin ?? false)
  }

  const effectiveModules = (userId: string): ('event' | 'shoot' | 'magazine')[] =>
    getOverride(userId).allowedModules ?? ['event', 'shoot', 'magazine']

  const hasOverride = (userId: string) => Object.keys(getOverride(userId)).length > 0

  const toggleModule = (userId: string, mod: 'event' | 'shoot' | 'magazine', checked: boolean) => {
    const current = effectiveModules(userId)
    const next = checked
      ? ([...new Set([...current, mod])] as ('event' | 'shoot' | 'magazine')[])
      : current.filter((m) => m !== mod)
    setUserAccessOverride(userId, { allowedModules: next })
  }

  return (
    <div className="bg-white border border-surface-3 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-3 bg-surface-1">
        <ShieldCheck size={13} className="text-ink-faint" />
        <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">
          Admins &amp; Module Access
        </h2>
        <span className="ml-auto text-2xs text-ink-faint">{APP_USERS.length} members</span>
      </div>

      <div className="p-1">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_80px_200px_68px] gap-2 items-center px-3 py-2 border-b border-surface-2">
          <span className="text-2xs font-bold uppercase tracking-widest text-ink-faint">Member</span>
          <span className="text-2xs font-bold uppercase tracking-widest text-ink-faint text-center">Admin</span>
          <span className="text-2xs font-bold uppercase tracking-widest text-ink-faint">Module access</span>
          <span />
        </div>

        {APP_USERS.map((u) => {
          const isSelf = u.id === currentUserId
          const isAdm  = effectiveAdmin(u.id)
          const mods   = effectiveModules(u.id)
          const modified = hasOverride(u.id)

          return (
            <div
              key={u.id}
              className={cn(
                'grid grid-cols-[1fr_80px_200px_68px] gap-2 items-center px-3 py-2.5 rounded',
                isSelf ? 'bg-accent/5' : 'hover:bg-surface-1'
              )}
            >
              {/* Member identity */}
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar user={u} size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-ink truncate">{u.name}</span>
                    {isSelf && (
                      <span className="text-2xs font-bold uppercase tracking-widest text-accent shrink-0">you</span>
                    )}
                    {modified && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                        title="Has custom overrides"
                      />
                    )}
                  </div>
                  <p className="text-2xs text-ink-faint">{ROLE_LABELS[u.role]}</p>
                </div>
              </div>

              {/* Admin toggle */}
              <div className="flex justify-center">
                <label className={cn('relative inline-flex items-center gap-1.5 cursor-pointer', isSelf && 'cursor-not-allowed')}>
                  <input
                    type="checkbox"
                    checked={isAdm}
                    disabled={isSelf}
                    onChange={(e) => setUserAccessOverride(u.id, { isAdmin: e.target.checked })}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      'w-8 h-4 rounded-full transition-colors relative',
                      isAdm ? 'bg-accent' : 'bg-surface-3',
                      isSelf && 'opacity-40'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform',
                        isAdm ? 'left-4' : 'left-0.5'
                      )}
                    />
                  </div>
                </label>
              </div>

              {/* Module access */}
              <div className="flex items-center gap-3">
                {(['event', 'shoot', 'magazine'] as const).map((mod) => (
                  <label
                    key={mod}
                    className={cn(
                      'flex items-center gap-1.5 text-xs cursor-pointer select-none',
                      isAdm && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isAdm || mods.includes(mod)}
                      disabled={isAdm}
                      onChange={(e) => toggleModule(u.id, mod, e.target.checked)}
                      className="w-3.5 h-3.5 accent-accent rounded"
                    />
                    <span className="text-ink-muted capitalize">
                      {mod === 'event' ? 'Events' : mod === 'shoot' ? 'Shoots' : 'Magazine'}
                    </span>
                  </label>
                ))}
              </div>

              {/* Reset */}
              <div className="flex justify-end">
                {modified ? (
                  <button
                    onClick={() => resetUserAccessOverride(u.id)}
                    className="text-2xs text-ink-faint hover:text-red-500 transition-colors px-1.5 py-0.5 rounded hover:bg-red-50"
                    title="Reset to code defaults"
                  >
                    Reset
                  </button>
                ) : (
                  <span className="text-2xs text-ink-faint/40">default</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="px-4 py-3 bg-surface-1 border-t border-surface-2">
        <p className="text-2xs text-ink-faint leading-relaxed">
          <span className="font-medium text-ink-muted">Admin</span> gives full access to every project and page. &nbsp;
          <span className="font-medium text-ink-muted">Module access</span> controls which module tabs are visible to that member. &nbsp;
          <span className="inline-flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /></span> = custom overrides active.
          <br />
          Role and per-project access are no longer set here — assign people and their page access inside each project
          (e.g. a Magazine project's <span className="font-medium text-ink-muted">Team</span> tab), or scope any member across projects in <span className="font-medium text-ink-muted">Project &amp; Page Access</span> below.
        </p>
      </div>
    </div>
  )
}

// ─── Project & Page Access section (admin only) ───────────────────────────────

const LEVEL_OPTIONS: AccessLevel[] = ['none', 'view', 'edit']
const LEVEL_LABEL: Record<AccessLevel, string> = { none: 'No access', view: 'View only', edit: 'Can edit' }

function ProjectAccessSection() {
  const userAccessOverrides      = useUserStore((s) => s.userAccessOverrides)
  const accessGrants             = useUserStore((s) => s.accessGrants)
  const setSectionAccess         = useUserStore((s) => s.setSectionAccess)
  const setProjectAccessDefault  = useUserStore((s) => s.setProjectAccessDefault)
  const removeProjectGrant       = useUserStore((s) => s.removeProjectGrant)
  const customMembers            = useUserStore((s) => s.customMembers)

  const eventProjects    = useEventStore((s) => s.projects)
  const shootProjects    = useShootStore((s) => s.projects)
  const magazineProjects = useMagazineStore((s) => s.projects)
  const projectsFor = (m: AccessModule): { id: string; name: string }[] =>
    m === 'event' ? eventProjects : m === 'shoot' ? shootProjects : magazineProjects

  // Unified people directory: real login accounts + admin-created custom members.
  const directory = buildDirectory(customMembers)
  const effAdmin = (uid: string): boolean => {
    const p  = directory.find((x) => x.id === uid)
    const ov = userAccessOverrides[uid]
    return ov?.isAdmin !== undefined ? ov.isAdmin : (p?.isAdmin ?? false)
  }

  const [selectedUserId, setSelectedUserId] = useState<string>(
    directory.find((p) => !effAdmin(p.id))?.id ?? directory[0]?.id ?? ''
  )
  const selectedPerson = directory.find((p) => p.id === selectedUserId)
  const [addModule, setAddModule]       = useState<AccessModule>('magazine')
  const [addProjectId, setAddProjectId] = useState<string>('')

  const grants = accessGrants[selectedUserId] ?? []
  const isAdm  = effAdmin(selectedUserId)

  const projectName = (m: AccessModule, pid: string) =>
    projectsFor(m).find((p) => p.id === pid)?.name ?? '(deleted project)'

  const handleAdd = () => {
    if (!addProjectId) return
    if (grants.some((g) => g.module === addModule && g.projectId === addProjectId)) return
    // Create the grant with a sensible 'view' project-wide default
    setProjectAccessDefault(selectedUserId, addModule, addProjectId, 'view')
    setAddProjectId('')
  }

  const sortedGrants = [...grants].sort((a, b) =>
    a.module === b.module ? projectName(a.module, a.projectId).localeCompare(projectName(b.module, b.projectId)) : a.module.localeCompare(b.module)
  )
  const availableToAdd = projectsFor(addModule).filter(
    (p) => !grants.some((g) => g.module === addModule && g.projectId === p.id)
  )

  return (
    <div className="bg-white border border-surface-3 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-3 bg-surface-1">
        <Lock size={13} className="text-ink-faint" />
        <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">Project &amp; Page Access</h2>
        <span className="ml-auto text-2xs text-ink-faint">scoped grants</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Member directory — Name view: name · role · projects assigned in. Click to edit access. */}
        <div>
          <span className="text-2xs font-bold uppercase tracking-widest text-ink-faint">Member</span>
          <div className="mt-1.5 border border-surface-2 rounded-lg divide-y divide-surface-2 max-h-72 overflow-y-auto">
            {directory.map((p) => {
              const adm   = effAdmin(p.id)
              const projs = (accessGrants[p.id] ?? []).map((g) => projectName(g.module, g.projectId))
              const sel   = p.id === selectedUserId
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedUserId(p.id)}
                  className={cn(
                    'w-full text-left flex items-center gap-2.5 px-2.5 py-2 transition-colors',
                    sel ? 'bg-accent/10' : 'hover:bg-surface-1'
                  )}
                >
                  <span
                    className="rounded-full flex items-center justify-center text-white text-2xs font-semibold shrink-0"
                    style={{ width: 26, height: 26, backgroundColor: p.avatarColor }}
                  >
                    {p.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-ink truncate">{p.name}</span>
                      {adm && <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-accent/15 text-accent shrink-0">Admin</span>}
                      {!p.isAppUser && <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-surface-2 text-ink-faint shrink-0">{p.status ? MEMBER_STATUS_LABEL[p.status] : 'Manual'}</span>}
                    </div>
                    <p className="text-2xs text-ink-faint truncate">{p.roleLabel || '—'}</p>
                  </div>
                  <div className="shrink-0 max-w-[42%] text-right">
                    {adm ? (
                      <span className="text-2xs text-accent">All access</span>
                    ) : projs.length === 0 ? (
                      <span className="text-2xs text-ink-faint/60">No projects</span>
                    ) : (
                      <span className="text-2xs text-ink-muted" title={projs.join(', ')}>
                        {projs.length} project{projs.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected-person identity line */}
        {selectedPerson && (
          <div className="flex items-center gap-2.5 bg-surface-1 border border-surface-2 rounded p-2.5">
            <span
              className="rounded-full flex items-center justify-center text-white text-2xs font-semibold shrink-0"
              style={{ width: 26, height: 26, backgroundColor: selectedPerson.avatarColor }}
            >
              {selectedPerson.initials}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink truncate flex items-center gap-1.5">
                <span className="truncate">{selectedPerson.name}</span>
                {selectedPerson.isAppUser ? (
                  <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-surface-2 text-ink-faint shrink-0">Account</span>
                ) : (
                  <span
                    className={cn(
                      'text-[9px] font-medium px-1 py-0.5 rounded shrink-0',
                      selectedPerson.status === 'pending_invite' ? 'bg-amber-100 text-amber-700' : 'bg-surface-2 text-ink-faint'
                    )}
                  >
                    {selectedPerson.status ? MEMBER_STATUS_LABEL[selectedPerson.status] : 'Manual'}
                  </span>
                )}
              </p>
              <p className="text-2xs text-ink-faint truncate">
                {selectedPerson.roleLabel}
                {selectedPerson.email ? ` · ${selectedPerson.email}` : ''}
                {!selectedPerson.isAppUser ? ' · identity managed in Magazine Team' : ''}
              </p>
            </div>
          </div>
        )}

        {isAdm ? (
          <p className="text-xs text-ink-muted bg-surface-1 border border-surface-2 rounded p-3">
            <ShieldCheck size={13} className="inline mr-1 text-accent" />
            This member is an <strong>admin</strong> — full access to every project and page. Remove admin in Admins &amp; Module Access to scope their access.
          </p>
        ) : (
          <>
            {/* Add a project grant */}
            <div className="flex flex-wrap items-end gap-2 border border-surface-2 rounded-lg p-3 bg-surface-1/50">
              <div className="space-y-1">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Module</label>
                <select
                  value={addModule}
                  onChange={(e) => { setAddModule(e.target.value as AccessModule); setAddProjectId('') }}
                  className="text-sm border border-surface-3 rounded px-2 py-1 bg-white"
                >
                  {(['magazine', 'event', 'shoot'] as AccessModule[]).map((m) => (
                    <option key={m} value={m}>{MODULE_LABELS[m]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 flex-1 min-w-[180px]">
                <label className="text-2xs uppercase tracking-wide text-ink-faint block">Project</label>
                <select
                  value={addProjectId}
                  onChange={(e) => setAddProjectId(e.target.value)}
                  className="w-full text-sm border border-surface-3 rounded px-2 py-1 bg-white"
                >
                  <option value="">{availableToAdd.length ? 'Select a project…' : 'All projects already added'}</option>
                  {availableToAdd.map((p) => (
                    <option key={p.id} value={p.id}>{p.name || 'Untitled project'}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAdd}
                disabled={!addProjectId}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40"
              >
                <Plus size={13} /> Grant access
              </button>
            </div>

            {/* Existing grants */}
            {sortedGrants.length === 0 ? (
              <p className="text-xs text-ink-faint italic">
                {selectedPerson && !selectedPerson.isAppUser
                  ? 'No grants yet. This manual member has no access until a project is granted here.'
                  : 'No scoped grants. This member uses default (module + role) access until a project is granted here.'}
              </p>
            ) : (
              <div className="space-y-3">
                {sortedGrants.map((g) => {
                  const sections = MODULE_SECTIONS[g.module]
                  const projectDefault = (g.sections['*'] ?? 'none') as AccessLevel
                  return (
                    <div key={`${g.module}:${g.projectId}`} className="border border-surface-3 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 bg-surface-1 border-b border-surface-3">
                        <span className="text-2xs font-bold uppercase tracking-widest text-ink-faint">{MODULE_LABELS[g.module]}</span>
                        <span className="text-sm font-medium text-ink truncate">{projectName(g.module, g.projectId)}</span>
                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={() => setProjectAccessDefault(selectedUserId, g.module, g.projectId, 'edit')}
                            disabled={projectDefault === 'edit'}
                            className="text-2xs text-accent hover:text-accent-dark transition-colors disabled:opacity-30 disabled:hover:text-accent"
                            title="Grant full edit access to this whole project (all pages)"
                          >
                            All access
                          </button>
                          <label className="text-2xs text-ink-faint">Whole project</label>
                          <select
                            value={projectDefault}
                            onChange={(e) => setProjectAccessDefault(selectedUserId, g.module, g.projectId, e.target.value as AccessLevel)}
                            className="text-xs border border-surface-3 rounded px-1.5 py-0.5 bg-white"
                          >
                            {LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                          </select>
                          <button
                            onClick={() => removeProjectGrant(selectedUserId, g.module, g.projectId)}
                            className="p-1 rounded text-ink-faint hover:text-red-500 transition-colors"
                            title="Remove grant"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                        {sections.map((sec) => {
                          const explicit = g.sections[sec.key]
                          const value = explicit ?? 'inherit'
                          return (
                            <div key={sec.key} className="flex items-center justify-between gap-2 px-1.5 py-1 rounded hover:bg-surface-1">
                              <span className="text-xs text-ink-secondary">{sec.label}</span>
                              <select
                                value={value}
                                onChange={(e) => setSectionAccess(selectedUserId, g.module, g.projectId, sec.key, e.target.value as AccessLevel | 'inherit')}
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
          </>
        )}
      </div>

      <div className="px-4 py-3 bg-surface-1 border-t border-surface-2">
        <p className="text-2xs text-ink-faint leading-relaxed">
          Granting any project in a module switches this member to <span className="font-medium text-ink-muted">scoped access</span> for that module
          (deny-by-default — they see only granted projects and pages). Members with no grants keep their default module + role access.
          <span className="font-medium text-ink-muted"> Inherit</span> uses the whole-project level.
          <br />
          <span className="font-medium text-ink-muted">Manual members</span> appear here for access management; their identity (name, email) is created and edited from a Magazine project's Team Access. Grants stay on the same person record when they're later invited.
        </p>
      </div>
    </div>
  )
}

// ─── People & Invites section (admin only) ───────────────────────────────────
// Central, admin-only profile management: create members, send email invites that
// turn them into real login accounts (linked to the same person record), and see
// each member's lifecycle (Manual → Ready → Pending invite → Active).

function memberLifecycle(m: CustomMember): { label: string; cls: string } {
  if (!m.email.trim())             return { label: 'Manual · no email', cls: 'bg-surface-2 text-ink-faint' }
  if (m.status === 'active')       return { label: 'Active',            cls: 'bg-green-100 text-green-700' }
  if (m.status === 'pending_invite') return { label: 'Pending invite',  cls: 'bg-amber-100 text-amber-700' }
  return { label: 'Ready to invite', cls: 'bg-blue-50 text-blue-700' }
}

function PeopleInvitesSection() {
  const customMembers      = useUserStore((s) => s.customMembers)
  const addCustomMember    = useUserStore((s) => s.addCustomMember)
  const updateCustomMember = useUserStore((s) => s.updateCustomMember)
  const removeCustomMember = useUserStore((s) => s.removeCustomMember)

  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole]   = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, { ok: boolean; msg: string }>>({})
  const [confirmRemove, setConfirmRemove] = useState<CustomMember | null>(null)
  const [removing, setRemoving] = useState(false)

  // Step 6 — "Active" derives from canonical remote truth: people.auth_user_id
  // (set server-side by the 0017 trigger when an invite is accepted). Empty in
  // local-only mode, so nothing falsely shows Active; refetched when members change.
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    let cancelled = false
    PeopleRepository.list().then((dir) => {
      if (!cancelled) setLinkedIds(new Set(dir.filter((p) => p.linked).map((p) => p.id)))
    })
    return () => { cancelled = true }
  }, [customMembers])

  const accounts = APP_USERS
  const members  = [...customMembers].sort((a, b) => a.name.localeCompare(b.name))

  const handleCreate = () => {
    const n = name.trim()
    if (!n) return
    addCustomMember({
      name: n,
      email: email.trim(),
      role: role.trim(),
      phone: '',
      notes: '',
      status: email.trim() ? 'internal' : 'manual',
    })
    setName(''); setEmail(''); setRole('')
  }

  const handleInvite = async (m: CustomMember) => {
    setBusyId(m.id)
    const res = await inviteByEmail(m.email)
    setBusyId(null)
    if (res.ok) {
      updateCustomMember(m.id, { status: 'pending_invite' })
      setFeedback((f) => ({ ...f, [m.id]: { ok: true, msg: 'Invite email sent' } }))
    } else {
      setFeedback((f) => ({ ...f, [m.id]: { ok: false, msg: res.error ?? 'Invite failed' } }))
    }
  }

  // Admin "remove user": delete the Supabase people row first (FK cascade revokes their
  // grants/memberships → access gone), then remove locally. On a remote failure, keep the
  // member and surface the error rather than silently leaving them able to sign in.
  const handleRemove = async (m: CustomMember) => {
    if (removing) return
    setRemoving(true)
    const res = await supabaseDeleteCustomMember(m.id)
    setRemoving(false)
    if (!res.ok) {
      setFeedback((f) => ({ ...f, [m.id]: { ok: false, msg: res.error ?? 'Could not remove from server' } }))
      setConfirmRemove(null)
      return
    }
    removeCustomMember(m.id) // local removal (member + their local grants)
    setConfirmRemove(null)
  }

  return (
    <div className="bg-white border border-surface-3 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-3 bg-surface-1">
        <UserPlus size={13} className="text-ink-faint" />
        <h2 className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">People &amp; Invites</h2>
        <span className="ml-auto text-2xs text-ink-faint">{accounts.length + members.length} people</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Create a member */}
        <div className="border border-surface-2 rounded-lg p-3 bg-surface-1/50 space-y-2">
          <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">Add a member</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Full name *"
              className="text-sm border border-surface-3 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:border-accent placeholder:text-ink-faint"
            />
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (for invite)" autoComplete="off"
              className="text-sm border border-surface-3 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:border-accent placeholder:text-ink-faint"
            />
            <input
              type="text" value={role} onChange={(e) => setRole(e.target.value)}
              placeholder="Role / title"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="text-sm border border-surface-3 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:border-accent placeholder:text-ink-faint"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40"
            >
              <Plus size={13} /> Add member
            </button>
            <span className="text-2xs text-ink-faint">
              With an email you can send an invite to turn them into a real login.
            </span>
          </div>
        </div>

        {/* Members (admin-created) */}
        <div>
          <span className="text-2xs font-bold uppercase tracking-widest text-ink-faint">Members</span>
          {members.length === 0 ? (
            <p className="text-xs text-ink-faint italic mt-1.5">No members added yet. Create one above, or add them from a project's Team tab.</p>
          ) : (
            <div className="mt-1.5 border border-surface-2 rounded-lg divide-y divide-surface-2">
              {members.map((m) => {
                const linked = linkedIds.has(m.id)
                const life = linked
                  ? { label: 'Active', cls: 'bg-green-100 text-green-700' }
                  : memberLifecycle(m)
                const fb = feedback[m.id]
                return (
                  <div key={m.id} className="flex items-center gap-2.5 px-2.5 py-2">
                    <span
                      className="rounded-full flex items-center justify-center text-white text-2xs font-semibold shrink-0"
                      style={{ width: 28, height: 28, backgroundColor: '#7A5C52' }}
                    >
                      {m.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-ink truncate">{m.name}</span>
                        <span className={cn('text-[9px] font-medium px-1 py-0.5 rounded shrink-0', life.cls)}>{life.label}</span>
                      </div>
                      <p className="text-2xs text-ink-faint truncate">
                        {m.role || 'Collaborator'}{m.email ? ` · ${m.email}` : ''}
                      </p>
                      {fb && (
                        <p className={cn('text-2xs mt-0.5 flex items-center gap-1', fb.ok ? 'text-green-600' : 'text-red-500')}>
                          {fb.ok ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />} {fb.msg}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {memberCanInvite(m) && !linked && isSupabaseEnabled && (
                        <button
                          onClick={() => handleInvite(m)}
                          disabled={busyId === m.id}
                          className="flex items-center gap-1 px-2 py-1 text-2xs bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40"
                          title="Send a magic-link invite email"
                        >
                          <Send size={10} /> {busyId === m.id ? 'Sending…' : m.status === 'pending_invite' ? 'Resend' : 'Invite'}
                        </button>
                      )}
                      {memberCanInvite(m) && !linked && !isSupabaseEnabled && (
                        <span className="text-2xs text-ink-faint flex items-center gap-1" title="Sign in to Supabase to send invites">
                          <Mail size={10} /> Sync off
                        </span>
                      )}
                      <button
                        onClick={() => setConfirmRemove(m)}
                        className="p-1 rounded text-ink-faint hover:text-red-500 transition-colors"
                        title="Remove member"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Accounts (seed login users — read-only here) */}
        <div>
          <span className="text-2xs font-bold uppercase tracking-widest text-ink-faint">Accounts</span>
          <div className="mt-1.5 border border-surface-2 rounded-lg divide-y divide-surface-2 max-h-44 overflow-y-auto">
            {accounts.map((u) => (
              <div key={u.id} className="flex items-center gap-2.5 px-2.5 py-1.5">
                <UserAvatar user={u} size="sm" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-ink truncate">{u.name}</span>
                  <p className="text-2xs text-ink-faint truncate">{ROLE_LABELS[u.role]}{u.isAdmin ? ' · Admin' : ''}</p>
                </div>
                <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-surface-2 text-ink-faint shrink-0">Account</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-surface-1 border-t border-surface-2">
        <p className="text-2xs text-ink-faint leading-relaxed">
          <span className="font-medium text-ink-muted">Invite</span> sends an email magic-link that activates a real login and links it
          to this exact person record (their grants carry over). Requires the member to have an email and an admin signed in to sync.
          Members without an email stay <span className="font-medium text-ink-muted">manual</span> (assignment-only) until you add one.
          Profile names are admin-controlled here.
        </p>
      </div>

      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove member"
        message={`Remove "${confirmRemove?.name}"? This deletes their workspace profile and all access grants${isSupabaseEnabled ? ' (Supabase + local)' : ''} and revokes their access immediately. If they had an email login, the auth record is left orphaned — harmless, since it can no longer reach any project. This cannot be undone.`}
        confirmLabel={removing ? 'Removing…' : 'Remove'}
        onConfirm={() => { if (confirmRemove) void handleRemove(confirmRemove) }}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  )
}

// ─── Settings page ────────────────────────────────────────────────────────────

export default function Settings() {
  const { user, isLoggedIn, isAdmin } = useCurrentUser()

  if (!isLoggedIn || !user) return <Navigate to="/" replace />

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Manage your personal account and, if you're admin, team access."
      />

      {/* Part 1 — Personal PIN (all users) */}
      <ChangePinSection />

      {/* Part 2 — Admins & Module Access (admin only) */}
      {isAdmin && <TeamAccessSection />}

      {/* Part 3 — People & Invites (admin only) */}
      {isAdmin && <PeopleInvitesSection />}

      {/* Part 4 — Project & Page Access (admin only) */}
      {isAdmin && <ProjectAccessSection />}
    </div>
  )
}
