/**
 * Shot status / priority / format vocabulary.
 *
 * Status order is deliberate and maps correctly onto not-started → in-progress →
 * complete, so progress never reads backwards (a real failure found in live
 * databases). 'skipped' and 'reshoot' are terminal-but-not-complete: they count as
 * resolved for "still to do" purposes but are never reported as shot.
 */
import type { ShotStatus, ShotPriority, ShotFormat } from '@/types/shoot'

export const SHOT_STATUSES: ShotStatus[] = ['to_shoot', 'shot', 'skipped', 'reshoot']

export const SHOT_STATUS_META: Record<ShotStatus, { label: string; chip: string; dot: string }> = {
  to_shoot: { label: 'To shoot', chip: 'bg-white text-ink-muted border-surface-3',        dot: 'border-2 border-surface-3 bg-white' },
  shot:     { label: 'Shot',     chip: 'bg-accent/10 text-accent border-accent/30',        dot: 'bg-accent' },
  skipped:  { label: 'Skipped',  chip: 'bg-surface-2 text-ink-faint border-surface-3',     dot: 'bg-ink-faint' },
  reshoot:  { label: 'Re-shoot', chip: 'bg-amber-50 text-amber-700 border-amber-200',      dot: 'bg-amber-400' },
}

export const SHOT_PRIORITIES: ShotPriority[] = ['hero', 'high', 'mid', 'low']

export const SHOT_PRIORITY_META: Record<ShotPriority, { label: string; chip: string }> = {
  hero: { label: 'Hero', chip: 'bg-accent text-white border-accent' },
  high: { label: 'High', chip: 'bg-accent/10 text-accent border-accent/30' },
  mid:  { label: 'Mid',  chip: 'bg-surface-1 text-ink-muted border-surface-3' },
  low:  { label: 'Low',  chip: 'bg-surface-1 text-ink-faint border-surface-3' },
}

export const SHOT_FORMATS: ShotFormat[] = ['stills', 'motion', 'social']

export const SHOT_FORMAT_LABELS: Record<ShotFormat, string> = {
  stills: 'Stills',
  motion: 'Motion',
  social: 'Social',
}

/** Effective status of a shot — legacy rows with no status are still to shoot. */
export const shotStatus = (s: { status?: ShotStatus }): ShotStatus => s.status ?? 'to_shoot'
