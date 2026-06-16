import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShieldCheck, Plus, Trash2, PenLine, Layers, Camera, UserPlus } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { useCurrentMagazineProject } from '@/hooks/useCurrentProject'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import PageSection from '@/components/layout/PageSection'
import Modal from '@/components/ui/Modal'
import { FormField, inputCls } from '@/components/ui/FormField'
import {
  MEMBER_STATUS_LABEL, findByEmail, softMatches, buildDirectory,
  type DirectoryPerson, type MemberStatus, type SoftMatch,
} from '@/auth/members'
import { PeopleRepository, MagazineProjectRepository } from '@/repositories'
import type { MagazineProjectSummary } from '@/repositories'
import { MODULE_SECTIONS, findGrant, grantSectionLevel, ACCESS_RANK, type AccessLevel } from '@/auth/access'
import { cn } from '@/lib/utils'
import type { SectionKey } from '@/auth/permissions'

const LEVEL_OPTIONS: AccessLevel[] = ['none', 'view', 'edit']
const LEVEL_LABEL: Record<AccessLevel, string> = { none: 'No access', view: 'View only', edit: 'Can edit' }
const LEVEL_CHIP: Record<AccessLevel, string> = {
  none: 'bg-surface-2 text-ink-faint',
  view: 'bg-blue-50 text-blue-600',
  edit: 'bg-green-50 text-green-700',
}

// The pages the brief calls out specifically.
const EMPHASIZED: { key: SectionKey; label: string; icon: typeof PenLine }[] = [
  { key: 'magazine.writing',  label: 'Writing',  icon: PenLine },
  { key: 'magazine.graphics', label: 'Graphics', icon: Layers },
  { key: 'magazine.visual',   label: 'Visual',   icon: Camera },
]
const EMPH_KEYS = new Set<SectionKey>(EMPHASIZED.map((e) => e.key))

const STATUS_OPTIONS: MemberStatus[] = ['external', 'internal', 'manual', 'pending_invite']

type GrantKey = 'whole' | 'writing' | 'graphics' | 'visual'
type Draft = {
  name: string; role: string; email: string; phone: string; notes: string
  status: MemberStatus
  whole: AccessLevel; writing: AccessLevel; graphics: AccessLevel; visual: AccessLevel
}
const BLANK_DRAFT: Draft = {
  name: '', role: '', email: '', phone: '', notes: '', status: 'external',
  whole: 'none', writing: 'none', graphics: 'none', visual: 'none',
}
type Conflict =
  | { kind: 'exact'; person: DirectoryPerson }
  | { kind: 'soft'; matches: SoftMatch[] }

// ─── Avatar + status badge (works for app users and custom members) ──────────

function PersonAvatar({ person, size = 28 }: { person: DirectoryPerson; size?: number }) {
  return (
    <span
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0 select-none"
      style={{ width: size, height: size, backgroundColor: person.avatarColor, fontSize: Math.round(size * 0.36) }}
    >
      {person.initials}
    </span>
  )
}

function MemberBadge({ person }: { person: DirectoryPerson }) {
  if (person.isAppUser) return null
  const pending = person.status === 'pending_invite'
  return (
    <span
      className={cn('text-[9px] font-medium px-1 py-0.5 rounded shrink-0', pending ? 'bg-amber-100 text-amber-700' : 'bg-surface-2 text-ink-faint')}
      title={pending ? 'Manual member — invite pending (not a login account yet)' : 'Manual member — not a login account yet'}
    >
      {person.status ? MEMBER_STATUS_LABEL[person.status] : 'Manual'}
    </span>
  )
}

export default function MagazineTeam() {
  const { id }   = useParams<{ id: string }>()
  const project  = useCurrentMagazineProject()
  const { isAdmin } = useCurrentUser()

  const accessGrants            = useUserStore((s) => s.accessGrants)
  const userAccessOverrides     = useUserStore((s) => s.userAccessOverrides)
  const customMembers           = useUserStore((s) => s.customMembers)
  const setSectionAccess        = useUserStore((s) => s.setSectionAccess)
  const setProjectAccessDefault = useUserStore((s) => s.setProjectAccessDefault)
  const removeProjectGrant      = useUserStore((s) => s.removeProjectGrant)
  const addCustomMember         = useUserStore((s) => s.addCustomMember)

  const [addUserId, setAddUserId] = useState('')
  const [showAdd, setShowAdd]     = useState(false)
  const [draft, setDraft]         = useState<Draft>(BLANK_DRAFT)
  const [conflict, setConflict]   = useState<Conflict | null>(null)

  // People directory — PeopleRepository.list() is local-authoritative + remote-enriched at
  // the repo layer (Option A), so it never hides locally-created members. We still set the
  // local directory immediately so a just-added custom member shows without waiting on the
  // async repo call; the repo result (the union) then replaces it. customMembers dep → reactive.
  const [directory, setDirectory] = useState<DirectoryPerson[]>(() => buildDirectory(customMembers))
  useEffect(() => {
    let cancelled = false
    setDirectory(buildDirectory(customMembers))                              // immediate local
    PeopleRepository.list().then((people) => { if (!cancelled) setDirectory(people) }) // local-auth + remote enrichment
    return () => { cancelled = true }
  }, [customMembers])

  // Repo-backed project name for the subtitle (follows MagazineBoard pattern).
  // project dep keeps the local path reactive on store writes.
  const [summary, setSummary] = useState<MagazineProjectSummary | null>(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    setSummary(null)
    MagazineProjectRepository.getMagazineProject(id).then((data) => {
      if (!cancelled) setSummary(data)
    })
    return () => { cancelled = true }
  }, [id, project])

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  // Admin-only page (the nav tab is also hidden for non-admins).
  if (!isAdmin) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="bg-white border border-surface-3 rounded-lg p-8 text-center">
          <ShieldCheck size={22} className="text-ink-faint mx-auto mb-2" />
          <p className="text-sm font-medium text-ink">Admin only</p>
          <p className="text-xs text-ink-muted mt-1">Team &amp; page access is managed by workspace admins.</p>
        </div>
      </div>
    )
  }

  const displayName = summary?.name ?? project.name
  const sections    = MODULE_SECTIONS.magazine

  const effAdmin = (pid: string): boolean => {
    const ov = userAccessOverrides[pid]
    const p  = directory.find((x) => x.id === pid)
    return ov?.isAdmin !== undefined ? ov.isAdmin : (p?.isAdmin ?? false)
  }
  const grantFor   = (pid: string) => findGrant(accessGrants[pid] ?? [], 'magazine', id)
  const assigned   = directory.filter((p) => !effAdmin(p.id) && grantFor(p.id))
  const unassigned = directory.filter((p) => !effAdmin(p.id) && !grantFor(p.id))

  const handleAdd = () => {
    if (!addUserId) return
    setProjectAccessDefault(addUserId, 'magazine', id, 'view')
    setAddUserId('')
  }

  // ── Custom-member creation + duplicate prevention ──────────────────────────
  const d = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((p) => ({ ...p, [k]: v }))
  const closeAdd = () => { setShowAdd(false); setDraft(BLANK_DRAFT); setConflict(null) }

  // Apply the form's minimal access selections to a person (deny-by-default elsewhere).
  const applyGrants = (personId: string) => {
    setProjectAccessDefault(personId, 'magazine', id, draft.whole)
    setSectionAccess(personId, 'magazine', id, 'magazine.writing', draft.writing)
    setSectionAccess(personId, 'magazine', id, 'magazine.graphics', draft.graphics)
    setSectionAccess(personId, 'magazine', id, 'magazine.visual', draft.visual)
  }
  const doCreate = () => {
    const newId = addCustomMember({
      name: draft.name.trim(), role: draft.role.trim(), email: draft.email.trim(),
      phone: draft.phone.trim(), notes: draft.notes.trim(), status: draft.status,
    })
    applyGrants(newId)
    closeAdd()
  }
  const useExisting = (personId: string) => { applyGrants(personId); closeAdd() }
  const submitNew = () => {
    if (!draft.name.trim()) return
    const exact = findByEmail(directory, draft.email)        // single-person rule: reuse on email match
    if (exact) { setConflict({ kind: 'exact', person: exact }); return }
    const soft = softMatches(directory, { name: draft.name, phone: draft.phone })
    if (soft.length) { setConflict({ kind: 'soft', matches: soft }); return }
    doCreate()
  }

  // Directory people with ≥ view on a given page for this project.
  const membersOn = (key: SectionKey) =>
    assigned
      .map((p) => ({ person: p, level: grantSectionLevel(grantFor(p.id), key) }))
      .filter((x) => ACCESS_RANK[x.level] >= ACCESS_RANK.view)

  return (
    <div className="p-6 max-w-5xl">
      <div className="pb-5 border-b border-surface-3 mb-6">
        <h1 className="text-2xl font-bold text-ink">Team &amp; Page Access</h1>
        <p className="text-sm text-ink-muted">
          {displayName} — assign collaborators to this issue and its pages.
        </p>
        <p className="text-2xs text-ink-faint mt-1">
          This manages the same scoped access as{' '}
          <Link to="/settings" className="text-accent hover:underline">Settings → Project &amp; Page Access</Link>, focused on this issue.
        </p>
      </div>

      {/* ── Who's on the key pages ───────────────────────────────────────────── */}
      <PageSection label="Assigned to key pages">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {EMPHASIZED.map(({ key, label, icon: Icon }) => {
            const members = membersOn(key)
            return (
              <div key={key} className="border border-surface-3 rounded-lg bg-white p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon size={13} className="text-accent" />
                  <span className="text-sm font-semibold text-ink">{label}</span>
                  <span className="ml-auto text-2xs text-ink-faint">{members.length}</span>
                </div>
                {members.length === 0 ? (
                  <p className="text-xs text-ink-faint italic">No one assigned</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {members.map(({ person, level }) => (
                      <span key={person.id} className="flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded bg-surface-1 border border-surface-2 text-ink-secondary">
                        {person.name.split(' ')[0]}
                        <span className={cn('px-1 rounded text-[9px] font-medium', LEVEL_CHIP[level])}>{level === 'edit' ? 'edit' : 'view'}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </PageSection>

      {/* ── Member × page matrix ─────────────────────────────────────────────── */}
      <PageSection label={`Members on this issue — ${assigned.length}`}>
        {/* Assign an existing person from the directory */}
        <div className="flex flex-wrap items-end gap-2 border border-surface-2 rounded-lg p-3 bg-surface-1/50 mb-3">
          <div className="space-y-1 flex-1 min-w-[200px]">
            <label className="text-2xs uppercase tracking-wide text-ink-faint block">Assign existing member</label>
            <select
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              className="w-full text-sm border border-surface-3 rounded px-2 py-1 bg-white"
            >
              <option value="">{unassigned.length ? 'Select a member…' : 'Everyone is already assigned'}</option>
              {unassigned.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {p.roleLabel}{p.isAppUser ? '' : ' (manual)'}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAdd}
            disabled={!addUserId}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40"
          >
            <Plus size={13} /> Assign
          </button>
          <button
            onClick={() => { setDraft(BLANK_DRAFT); setConflict(null); setShowAdd(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
          >
            <UserPlus size={13} /> New member
          </button>
        </div>

        {assigned.length === 0 ? (
          <p className="text-xs text-ink-faint italic px-1 py-3">
            No collaborators assigned to this issue yet. Assign someone above, then set their pages here.
          </p>
        ) : (
          <div className="overflow-x-auto border border-surface-3 rounded-lg">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface-1 border-b border-surface-3">
                  <th className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-3 py-2 sticky left-0 bg-surface-1">Member</th>
                  <th className="text-left text-2xs font-bold uppercase tracking-widest text-ink-faint px-2 py-2 whitespace-nowrap">Whole project</th>
                  {sections.map((s) => (
                    <th
                      key={s.key}
                      className={cn(
                        'text-left text-2xs font-bold uppercase tracking-widest px-2 py-2 whitespace-nowrap',
                        EMPH_KEYS.has(s.key) ? 'text-accent' : 'text-ink-faint'
                      )}
                    >
                      {s.label}
                    </th>
                  ))}
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {assigned.map((p) => {
                  const grant = grantFor(p.id)!
                  const projectDefault = (grant.sections['*'] ?? 'none') as AccessLevel
                  return (
                    <tr key={p.id} className="border-b border-surface-2 last:border-0 hover:bg-surface-1/40">
                      {/* Member */}
                      <td className="px-3 py-2 sticky left-0 bg-white">
                        <div className="flex items-center gap-2 min-w-0">
                          <PersonAvatar person={p} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-ink truncate flex items-center gap-1.5">
                              <span className="truncate">{p.name}</span>
                              <MemberBadge person={p} />
                            </p>
                            <p className="text-2xs text-ink-faint truncate">{p.roleLabel}{p.email ? ` · ${p.email}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      {/* Whole project */}
                      <td className="px-2 py-2">
                        <select
                          value={projectDefault}
                          onChange={(e) => setProjectAccessDefault(p.id, 'magazine', id, e.target.value as AccessLevel)}
                          className="text-2xs border border-surface-3 rounded px-1.5 py-1 bg-white"
                        >
                          {LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                        </select>
                      </td>
                      {/* Per-section */}
                      {sections.map((s) => {
                        const explicit = grant.sections[s.key]
                        const value = explicit ?? 'inherit'
                        return (
                          <td key={s.key} className={cn('px-2 py-2', EMPH_KEYS.has(s.key) && 'bg-accent/[0.03]')}>
                            <select
                              value={value}
                              onChange={(e) => setSectionAccess(p.id, 'magazine', id, s.key, e.target.value as AccessLevel | 'inherit')}
                              className={cn('text-2xs border rounded px-1.5 py-1 bg-white', explicit ? 'border-accent/40 text-ink' : 'border-surface-3 text-ink-faint')}
                            >
                              <option value="inherit">Inherit</option>
                              {LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                            </select>
                          </td>
                        )
                      })}
                      {/* Remove */}
                      <td className="px-2 py-2 text-right">
                        <button
                          onClick={() => removeProjectGrant(p.id, 'magazine', id)}
                          className="p-1 rounded text-ink-faint hover:text-red-500 transition-colors"
                          title="Remove from this issue"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-2xs text-ink-faint leading-relaxed mt-3">
          <span className="font-medium text-ink-muted">Whole project</span> is the baseline applied to every page;
          per-page <span className="font-medium text-ink-muted">Inherit</span> uses that baseline, or override a page to View / Can edit / No access.
          Admins always have full access and aren't listed here.
        </p>
      </PageSection>

      {/* ── New custom member (with duplicate prevention) ─────────────────────── */}
      <Modal
        open={showAdd}
        onClose={closeAdd}
        title="New member"
        footer={!conflict ? (
          <>
            <button onClick={closeAdd} className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">Cancel</button>
            <button onClick={submitNew} disabled={!draft.name.trim()} className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40">Create &amp; assign</button>
          </>
        ) : undefined}
      >
        {!conflict ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Name" required>
                <input autoFocus type="text" value={draft.name} onChange={(e) => d('name', e.target.value)} placeholder="Full name" className={inputCls} />
              </FormField>
              <FormField label="Role / function">
                <input type="text" value={draft.role} onChange={(e) => d('role', e.target.value)} placeholder="e.g. Freelance writer" className={inputCls} />
              </FormField>
              <FormField label="Email">
                <input type="email" value={draft.email} onChange={(e) => d('email', e.target.value)} placeholder="name@example.com" className={inputCls} />
              </FormField>
              <FormField label="Phone">
                <input type="tel" value={draft.phone} onChange={(e) => d('phone', e.target.value)} placeholder="optional" className={inputCls} />
              </FormField>
              <FormField label="Status">
                <select value={draft.status} onChange={(e) => d('status', e.target.value as MemberStatus)} className={inputCls}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{MEMBER_STATUS_LABEL[s]}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Notes">
              <textarea value={draft.notes} onChange={(e) => d('notes', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
            </FormField>

            <div className="border-t border-surface-2 pt-3">
              <p className="text-2xs uppercase tracking-wide text-ink-faint mb-2">Initial access — minimal by default (deny-by-default elsewhere)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([['Whole project', 'whole'], ['Writing', 'writing'], ['Graphics', 'graphics'], ['Visual', 'visual']] as [string, GrantKey][]).map(([label, key]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-2xs text-ink-faint block">{label}</label>
                    <select value={draft[key]} onChange={(e) => d(key, e.target.value as AccessLevel)} className={inputCls}>
                      {LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-2xs text-ink-faint">
              Existing people are checked by email (exact) and by name/phone (likely) before a new record is created.
            </p>
          </div>
        ) : conflict.kind === 'exact' ? (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <p className="text-sm text-ink">
                <strong>{conflict.person.name}</strong> already uses this email{conflict.person.email ? ` (${conflict.person.email})` : ''}
                {conflict.person.isAppUser ? ' — an existing account' : ' — an existing member'}.
              </p>
              <p className="text-xs text-ink-muted mt-1">To keep one record per person, reuse the existing member instead of creating a duplicate.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConflict(null)} className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">Back</button>
              <button onClick={() => useExisting(conflict.person.id)} className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">
                Use {conflict.person.name.split(' ')[0]} &amp; assign
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink">Possible duplicate{conflict.matches.length > 1 ? 's' : ''} — is this the same person?</p>
            <div className="space-y-1.5">
              {conflict.matches.map((m) => (
                <div key={m.person.id} className="flex items-center gap-2 border border-surface-3 rounded px-2 py-1.5">
                  <PersonAvatar person={m.person} size={24} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink truncate">
                      {m.person.name} <span className="text-2xs text-ink-faint">· {m.reason}</span>
                    </p>
                    <p className="text-2xs text-ink-faint truncate">
                      {m.person.roleLabel}{m.person.email ? ` · ${m.person.email}` : ''}{m.person.isAppUser ? '' : ' · manual'}
                    </p>
                  </div>
                  <button onClick={() => useExisting(m.person.id)} className="text-2xs text-accent hover:text-accent-dark transition-colors px-2 py-1 rounded hover:bg-accent/10 shrink-0">
                    Use this
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-between gap-2">
              <button onClick={() => setConflict(null)} className="px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors">Back</button>
              <button onClick={doCreate} className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors">Create new anyway</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
