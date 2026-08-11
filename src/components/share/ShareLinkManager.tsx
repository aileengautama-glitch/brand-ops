/**
 * ShareLinkManager — build a scoped link for one recipient.
 *
 * Pick an audience preset, adjust the sections, copy the URL. The scope lives in the
 * URL, so the same project can go to a supplier, the talent agency and the venue with
 * different visibility and no server state to manage.
 *
 * The URL is also what gets pasted into the Notion season board row (see the field
 * mapping note in the Phase 2 report) — Notion holds the season summary, the app holds
 * the project detail.
 */
import { useState } from 'react'
import { Link2, Check, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SHARE_SECTIONS, SHARE_AUDIENCES, ALL_SECTION_KEYS, buildShareUrl,
  type ShareSectionKey,
} from '@/lib/shareSections'
import { useShareStore } from '@/store/useShareStore'

export default function ShareLinkManager({
  module, projectId,
}: {
  module: 'shoot' | 'event'
  projectId: string
}) {
  const [audience, setAudience] = useState('supplier')
  const [sections, setSections] = useState<ShareSectionKey[]>(
    SHARE_AUDIENCES.find((a) => a.key === 'supplier')?.sections ?? [],
  )
  const [copied, setCopied] = useState<'external' | 'internal' | null>(null)
  const getOrCreateToken = useShareStore((s) => s.getOrCreateToken)

  const pickAudience = (key: string) => {
    setAudience(key)
    const preset = SHARE_AUDIENCES.find((a) => a.key === key)
    if (preset) setSections(preset.sections)
  }

  const toggle = (k: ShareSectionKey) =>
    setSections((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))

  const externalUrl = buildShareUrl(module, projectId, sections)
  const internalUrl = buildShareUrl(module, projectId, ALL_SECTION_KEYS)

  const copy = async (url: string, which: 'external' | 'internal') => {
    // Register the token so the link shows up in the share store like deck links do.
    getOrCreateToken(module, projectId, 'brief-deck')
    await navigator.clipboard.writeText(url)
    setCopied(which)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Internal */}
      <div className="bg-surface-1 border border-surface-3 rounded p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Internal link — everything</p>
            <p className="text-xs text-ink-muted mt-0.5">
              Every section, read-only. For the team and anyone who should see the whole picture.
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

      {/* External */}
      <div className="bg-white border border-surface-3 rounded p-3 space-y-3">
        <div>
          <p className="text-sm font-medium text-ink">External link — scoped</p>
          <p className="text-xs text-ink-muted mt-0.5">
            Pick who it's for, then adjust what they see. The scope travels in the link.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SHARE_AUDIENCES.map((a) => (
            <button key={a.key} onClick={() => pickAudience(a.key)}
              className={cn('text-xs px-2.5 py-1 rounded border transition-colors',
                audience === a.key
                  ? 'bg-accent text-white border-accent'
                  : 'bg-white text-ink-muted border-surface-3 hover:border-accent/40')}>
              {a.label}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
          {SHARE_SECTIONS.map((s) => (
            <label key={s.key} className="flex items-start gap-2 text-xs text-ink cursor-pointer py-0.5">
              <input type="checkbox" checked={sections.includes(s.key)} onChange={() => toggle(s.key)} className="mt-0.5" />
              <span className="min-w-0">
                {s.label}
                {s.hint && <span className="block text-2xs text-ink-faint">{s.hint}</span>}
              </span>
            </label>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            readOnly value={externalUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 min-w-0 text-2xs bg-surface-1 border border-surface-3 rounded px-2 py-1.5 text-ink-muted font-mono"
          />
          <button
            onClick={() => copy(externalUrl, 'external')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded transition-colors shrink-0',
              copied === 'external'
                ? 'border-green-300 bg-green-50 text-green-700'
                : 'border-surface-3 text-ink-secondary hover:bg-surface-1')}
          >
            {copied === 'external' ? <Check size={13} /> : <Link2 size={13} />}
            {copied === 'external' ? 'Copied' : 'Copy'}
          </button>
          <a
            href={externalUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 px-2 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors shrink-0"
            title="Preview in a new tab"
          >
            <ExternalLink size={13} />
          </a>
        </div>

        <p className="text-2xs text-ink-faint">
          {sections.length} of {SHARE_SECTIONS.length} sections included. Anyone with the link can view them.
        </p>
      </div>
    </div>
  )
}
