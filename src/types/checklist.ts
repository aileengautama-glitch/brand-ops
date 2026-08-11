/**
 * Checklist items — the pre-production list a project actually works from.
 *
 * Derived from a template on project creation, then fully editable per project.
 *
 * Gate vs checkbox (the rule from the production brief): if it has a deadline,
 * someone waits on it, or anyone reports on it → it's a GATE, anchored to the
 * shoot/launch/event date and surfaced on the timeline. Otherwise it's a plain
 * checkbox that lives only in this list.
 */
import type { MilestoneAnchor } from './common'

/** Conditional blocks — an item only applies when its condition is active. */
export type ChecklistCondition = 'no-stylist' | 'with-stylist' | 'ecomm' | 'campaign'

export interface ChecklistItem {
  id: string
  label: string
  description: string
  /** Grouping heading, e.g. '4+ weeks out — lock the shape'. */
  phase: string
  owner: string
  done: boolean
  doneAt: string
  /** True → shows on the timeline as a dated gate. */
  isGate: boolean
  anchorType?: MilestoneAnchor
  offsetDays?: number
  /** Which template line this came from ('' = added by hand on this project). */
  templateKey: string
  /** Conditions this item belongs to; empty = always applies. */
  conditions?: ChecklistCondition[]
  order: number
}

/** A template line before it becomes a per-project item. */
export interface ChecklistTemplateItem {
  key: string
  label: string
  description?: string
  phase: string
  ownerRole?: string
  isGate?: boolean
  anchorType?: MilestoneAnchor
  offsetDays?: number
  conditions?: ChecklistCondition[]
}

export interface ChecklistTemplate {
  key: string
  label: string
  /** Which module the template applies to. */
  module: 'shoot' | 'event'
  description: string
  /** Where the content came from — shown in the picker so provenance is clear. */
  source: string
  items: ChecklistTemplateItem[]
}
