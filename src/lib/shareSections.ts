/**
 * Share sections — what a shared project link shows.
 *
 * The enabled set is encoded in the URL (?s=brief,schedule,…) rather than stored
 * against the token. The share store is local to one device, so anything kept there
 * would not travel with the link; the URL always does. It also means a link can be
 * scoped per recipient without creating server state.
 *
 * Internal links use ?s=all.
 */
export type ShareSectionKey =
  | 'brief' | 'moodboard' | 'crew' | 'schedule' | 'shotlist'
  | 'styling' | 'callsheet' | 'logistics' | 'budget' | 'approvals' | 'checklist'

export interface ShareSectionDef {
  key: ShareSectionKey
  label: string
  /** Why you might withhold it — shown in the link builder. */
  hint?: string
  /** Not offered on external links by default. */
  internalOnly?: boolean
}

export const SHARE_SECTIONS: ShareSectionDef[] = [
  { key: 'brief',     label: 'Brief & creative direction' },
  { key: 'moodboard', label: 'Moodboard' },
  { key: 'crew',      label: 'Crew & talent' },
  { key: 'schedule',  label: 'Run-of-day schedule' },
  { key: 'shotlist',  label: 'Shot list', hint: 'Often withheld from suppliers' },
  { key: 'styling',   label: 'Styling & looks' },
  { key: 'callsheet', label: 'Call sheet logistics' },
  { key: 'logistics', label: 'What to bring / who brings it' },
  { key: 'budget',    label: 'Budget', hint: 'Internal only by default', internalOnly: true },
  { key: 'approvals', label: 'Approvals', hint: 'Internal only by default', internalOnly: true },
  { key: 'checklist', label: 'Pre-production checklist', internalOnly: true },
]

export const ALL_SECTION_KEYS = SHARE_SECTIONS.map((s) => s.key)
export const EXTERNAL_DEFAULT_KEYS = SHARE_SECTIONS.filter((s) => !s.internalOnly).map((s) => s.key)

/** Preset audiences — a starting point, every one still editable. */
export const SHARE_AUDIENCES: { key: string; label: string; sections: ShareSectionKey[] }[] = [
  { key: 'supplier', label: 'Supplier / crew', sections: ['brief', 'crew', 'schedule', 'callsheet', 'logistics'] },
  { key: 'talent',   label: 'Talent / agency', sections: ['brief', 'schedule', 'callsheet'] },
  { key: 'venue',    label: 'Venue / location', sections: ['schedule', 'callsheet', 'logistics'] },
  { key: 'agency',   label: 'Agency / partner', sections: ['brief', 'moodboard', 'shotlist', 'styling'] },
  { key: 'full',     label: 'Everything (external)', sections: EXTERNAL_DEFAULT_KEYS },
]

/** Encode for the URL. 'all' is a shorthand so internal links stay readable. */
export function encodeSections(keys: ShareSectionKey[]): string {
  if (keys.length >= ALL_SECTION_KEYS.length) return 'all'
  return keys.join(',')
}

/** Decode ?s= — unknown or missing falls back to the external default set. */
export function decodeSections(raw: string | null): ShareSectionKey[] {
  if (!raw) return EXTERNAL_DEFAULT_KEYS
  if (raw === 'all') return ALL_SECTION_KEYS
  const wanted = new Set(raw.split(',').map((x) => x.trim()))
  const picked = ALL_SECTION_KEYS.filter((k) => wanted.has(k))
  return picked.length > 0 ? picked : EXTERNAL_DEFAULT_KEYS
}

export function buildShareUrl(module: 'shoot' | 'event', projectId: string, keys: ShareSectionKey[]): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/share/${module}/${projectId}/project?s=${encodeSections(keys)}`
}
