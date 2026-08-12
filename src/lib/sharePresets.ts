/**
 * Share presets — pick a recipient, not a set of checkboxes.
 *
 * The safety property that matters: money and usage terms are never in an external
 * preset. That's enforced structurally rather than by remembering to untick things —
 * SENSITIVE_SECTIONS can't appear in any external preset, and buildExternalSections()
 * strips them even if a caller passes them in.
 *
 * Scope still travels in the URL (?s=…) so a link works on a device that has never
 * seen the project. Revocation and expiry are the parts that can't live in the URL:
 * they're checked against the share store at render time.
 */
import type { ShareSectionKey } from '@/lib/shareSections'

/** Never visible on an external link. Money, fees, internal reasoning, rights. */
export const SENSITIVE_SECTIONS: ShareSectionKey[] = ['budget', 'approvals', 'checklist']

export interface SharePreset {
  key: string
  label: string
  /** What this person actually needs to do their job. */
  description: string
  sections: ShareSectionKey[]
}

/**
 * Recipient presets. Each is the minimum that recipient needs — deliberately not
 * "everything except the secret bits".
 */
export const SHARE_PRESETS: SharePreset[] = [
  {
    key: 'photographer',
    label: 'Photographer',
    description: 'Brief, shot list, schedule and where to be.',
    sections: ['brief', 'moodboard', 'shotlist', 'schedule', 'callsheet', 'crew'],
  },
  {
    key: 'stylist',
    label: 'Stylist',
    description: 'Looks and product, plus the day’s shape.',
    sections: ['brief', 'moodboard', 'styling', 'shotlist', 'schedule', 'callsheet', 'logistics'],
  },
  {
    key: 'hmu',
    label: 'Hair & Make-Up',
    description: 'The look direction (including nails) and call times.',
    sections: ['brief', 'moodboard', 'schedule', 'callsheet', 'crew'],
  },
  {
    key: 'talent',
    label: 'Talent agency',
    description: 'Call times, location and logistics — no shot list.',
    sections: ['schedule', 'callsheet'],
  },
  {
    key: 'venue',
    label: 'Venue / location',
    description: 'Timings, who is coming and what is being brought in.',
    sections: ['schedule', 'callsheet', 'logistics', 'crew'],
  },
  {
    key: 'printer',
    label: 'Printer / production',
    description: 'Deliverable-facing only — no people, no schedule.',
    sections: ['brief', 'shotlist'],
  },
]

/** Strip anything sensitive, whatever the caller asked for. */
export function buildExternalSections(sections: ShareSectionKey[]): ShareSectionKey[] {
  const banned = new Set<ShareSectionKey>(SENSITIVE_SECTIONS)
  return sections.filter((s) => !banned.has(s))
}

export function presetByKey(key: string): SharePreset | null {
  return SHARE_PRESETS.find((p) => p.key === key) ?? null
}

/** True when a section list would leak money or internal reasoning. */
export function leaksSensitive(sections: ShareSectionKey[]): boolean {
  const banned = new Set<ShareSectionKey>(SENSITIVE_SECTIONS)
  return sections.some((s) => banned.has(s))
}
