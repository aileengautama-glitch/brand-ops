/**
 * ShareLinkManager — issue a link by choosing who it's for.
 *
 * Sending a supplier a link is one choice: the recipient. No per-section ticking,
 * because that's where accidents happen. Money, approvals and the internal checklist
 * are structurally excluded from every external preset (see lib/sharePresets.ts), so
 * there is no path where fees or internal reasoning go out by mistake.
 *
 * Issued links are listed with their state so they can be revoked or given an expiry.
 */
import { useState } from 'react'
import { Link2, Check, ExternalLink, ShieldCheck, Ban, RotateCcw, Trash2, Clock } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { ALL_SECTION_KEYS, encodeSections, SHARE_SECTIONS } from '@/lib/shareSections'
import { SHARE_PRESETS, buildExternalSections, SENSITIVE_SECTIONS } from '@/lib/sharePresets'
import { useShareLinkStore, linkState, type IssuedLink } from '@/store/useShareLinkStore'

export default function ShareLinkManager({
  module, projectId,
}: {
  module: 'shoot' | 'event'
  projectId: string
}) {
  const [copied, setCopied] = useState<string | null>(null)
  const [recipient, setRecipient] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const issue = useShareLinkStore((s) => s.issue)
  const revoke = useShareLinkStore((s) => s.revoke)
  const restore = useShareLinkStore((s) => s.restore)
  const remove = useShareLinkStore((s) => s.remove)
  const links = useShareLinkStore((s) => s.links)

  const issued = Object.values(links)
    .filter((l) => l.projectId === projectId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const internalUrl = `${origin}/share/${module}/${projectId}/project?s=${encodeSections(ALL_SECTION_KEYS)}`
  const urlFor = (l: IssuedLink) =>
    `${origin}/share/${module}/${projectId}/project?s=${encodeSections(l.sections)}&t=${l.token}`

  const copy = async (url: string, key: string) => {
    await navigator.clipboard.writeText(url)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const issuePreset = async (presetKey: string, label: string, sections: string[]) => {
    const link = issue({
      module, projectId,
      preset: presetKey,
      label,
      sections: buildExternalSections(sections as never),
      expiresAt,
      recipient: recipient.trim(),
    })
    await copy(urlFor(link), link.token)
    setRecipient('')
  }

  return (
    <div className="space-y-5">
      {/* ── Internal ─────────────────────────────────────────────────── */}
      <div className="bg-surface-1 border border-surface-3 rounded p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Internal link — everything</p>
            <p className="text-xs text-ink-muted mt-0.5">
              All sections including budget and approvals. For the team only.
            </p>
          </div>
          <button
            onClick={() => copy(internalUrl, 'internal')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded transition-colors shrink-0',
              copied === 'internal'
                ? 'border-green-300 bg-green-50 text-green-700'
                : 'border-surface-3 bg-white text-ink-secondary hover:bg-surface-2')}
          >
            {copied === 'internal' ? <Check size={13} /> : <Link2 size={13} />}
            {copied === 'internal' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* ── External presets ─────────────────────────────────────────── */}
      <div className="bg-white border border-surface-3 rounded p-3 space-y-3">
        <div>
          <p className="text-sm font-medium text-ink">External link — choose the recipient</p>
          <p className="text-xs text-ink-muted mt-0.5">
            Each preset shows only what that person needs. One click issues and copies the link.
          </p>
        </div>

        <div className="flex items-start gap-2 px-2.5 py-2 rounded border border-accent/30 bg-accent/5 text-xs text-ink-secondary">
          <ShieldCheck size={13} className="shrink-0 mt-0.5 text-accent" />
          <span>
            Budget, fees, approvals and the internal checklist are never included in an external
            link — they're excluded structurally, not by a toggle you could forget.
          </span>
        </div>

        {/* Optional metadata applied to the next link issued */}
        <div className="grid sm:grid-cols-2 gap-2">
          <input
            type="text" value={recipient} placeholder="Who is it for? (optional note)"
            onChange={(e) => setRecipient(e.target.value)}
            className="text-sm px-2.5 py-1.5 border border-surface-3 rounded bg-white focus:outline-none focus:border-accent placeholder:text-ink-faint"
          />
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-ink-faint shrink-0" />
            <input
              type="date" value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              title="Optional expiry"
              className="flex-1 text-sm px-2.5 py-1.5 border border-surface-3 rounded bg-white focus:outline-none focus:border-accent"
            />
            {expiresAt && (
              <button onClick={() => setExpiresAt('')} className="text-2xs text-ink-faint hover:text-ink">clear</button>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          {SHARE_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => issuePreset(p.key, p.label, p.sections)}
              className="text-left px-3 py-2 rounded border border-surface-3 hover:border-accent/50 hover:bg-surface-1 transition-colors"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <Link2 size={12} className="text-accent" /> {p.label}
              </span>
              <span className="block text-2xs text-ink-muted mt-0.5">{p.description}</span>
              <span className="block text-2xs text-ink-faint mt-0.5">
                {p.sections.map((s) => SHARE_SECTIONS.find((x) => x.key === s)?.label ?? s).join(' · ')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Issued links ─────────────────────────────────────────────── */}
      {issued.length > 0 && (
        <div className="bg-white border border-surface-3 rounded overflow-hidden">
          <div className="px-3 py-2 border-b border-surface-3 bg-surface-1">
            <p className="text-2xs font-bold uppercase tracking-widest text-ink-faint">
              Issued links — {issued.length}
            </p>
          </div>
          <div className="divide-y divide-surface-2">
            {issued.map((l) => {
              const state = linkState(l)
              return (
                <div key={l.token} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className={cn('text-2xs px-1.5 py-0.5 rounded border shrink-0',
                    state === 'active' ? 'bg-accent/10 text-accent border-accent/30'
                      : state === 'revoked' ? 'bg-red-50 text-red-600 border-red-200'
                      : 'bg-surface-2 text-ink-faint border-surface-3')}>
                    {state}
                  </span>
                  <span className="text-sm text-ink">{l.label}</span>
                  {l.recipient && <span className="text-2xs text-ink-muted">· {l.recipient}</span>}
                  <span className="text-2xs text-ink-faint">
                    {formatDate(l.createdAt.slice(0, 10))}
                    {l.expiresAt ? ` · expires ${formatDate(l.expiresAt)}` : ' · no expiry'}
                  </span>

                  <div className="ml-auto flex items-center gap-1 shrink-0">
                    <button onClick={() => copy(urlFor(l), l.token)} title="Copy link"
                      className={cn('p-1 rounded border transition-colors',
                        copied === l.token ? 'border-green-300 bg-green-50 text-green-700'
                                           : 'border-surface-3 text-ink-muted hover:bg-surface-1')}>
                      {copied === l.token ? <Check size={12} /> : <Link2 size={12} />}
                    </button>
                    <a href={urlFor(l)} target="_blank" rel="noreferrer" title="Preview"
                      className="p-1 rounded border border-surface-3 text-ink-muted hover:bg-surface-1 transition-colors">
                      <ExternalLink size={12} />
                    </a>
                    {state === 'revoked' ? (
                      <button onClick={() => restore(l.token)} title="Restore access"
                        className="p-1 rounded border border-surface-3 text-ink-muted hover:bg-surface-1 transition-colors">
                        <RotateCcw size={12} />
                      </button>
                    ) : (
                      <button onClick={() => revoke(l.token)} title="Revoke access"
                        className="p-1 rounded border border-surface-3 text-ink-muted hover:text-red-600 hover:bg-surface-1 transition-colors">
                        <Ban size={12} />
                      </button>
                    )}
                    <button onClick={() => remove(l.token)} title="Delete record"
                      className="p-1 rounded border border-surface-3 text-ink-faint hover:text-red-600 hover:bg-surface-1 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="px-3 py-2 text-2xs text-ink-faint border-t border-surface-3">
            Revoking blocks the link on devices that have this workspace. Someone who already
            loaded the page keeps that copy — treat revocation as a workflow control.
          </p>
        </div>
      )}

      <p className="text-2xs text-ink-faint">
        Excluded from every external preset: {SENSITIVE_SECTIONS.join(', ')}.
      </p>
    </div>
  )
}
