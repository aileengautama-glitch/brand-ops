/**
 * Deck snapshot builders + view-model types.
 *
 * EventDeckData / ShootDeckData are the exact slices of the project that the
 * read-only Brief Deck share routes render.  They are typed as `Pick<…>` of the
 * full project so the builders are trivial and the share pages can render from
 * either a local project or a remote snapshot interchangeably (`local ?? remote`).
 *
 * These same builders are used by:
 *   - useDeckSnapshotSync  → serialise local project → publish to deck_snapshots
 *   - the share pages       → produce the view-model from a local project
 *
 * One source of truth for "what's in the deck".
 */
import type { EventProject } from '@/types/event'
import type { ShootProject } from '@/types/shoot'

// ─── View-model types (deck-visible slice of each project) ────────────────────

export type EventDeckData = Pick<
  EventProject,
  | 'name'
  | 'description'
  | 'eventDate'
  | 'venue'
  | 'runTime'
  | 'moodboardItems'
  | 'milestones'
  | 'dayOfSlots'
  | 'teamMembers'
  | 'staffRoster'
>

export type ShootDeckData = Pick<
  ShootProject,
  | 'name'
  | 'description'
  | 'briefDetails'
  | 'shootBrief'
  | 'moodboardItems'
  | 'briefMoodboardItems'
  | 'wardrobeImages'
  | 'hairAndMakeupImages'
  | 'dayOfSlots'
  | 'shots'
  | 'ddayRows'
  | 'stylings'
  | 'crewMembers'
  | 'models'
>

// ─── Builders (project → deck view-model) ─────────────────────────────────────

export function buildEventDeckData(p: EventProject): EventDeckData {
  return {
    name:           p.name,
    description:    p.description,
    eventDate:      p.eventDate,
    venue:          p.venue,
    runTime:        p.runTime,
    moodboardItems: p.moodboardItems,
    milestones:     p.milestones,
    dayOfSlots:     p.dayOfSlots,
    teamMembers:    p.teamMembers,
    staffRoster:    p.staffRoster ?? [],
  }
}

export function buildShootDeckData(p: ShootProject): ShootDeckData {
  return {
    name:                p.name,
    description:         p.description,
    briefDetails:        p.briefDetails,
    shootBrief:          p.shootBrief,
    moodboardItems:      p.moodboardItems,
    briefMoodboardItems: p.briefMoodboardItems,
    wardrobeImages:      p.wardrobeImages ?? [],
    hairAndMakeupImages: p.hairAndMakeupImages ?? [],
    dayOfSlots:          p.dayOfSlots,
    shots:               p.shots,
    ddayRows:            p.ddayRows ?? [],
    stylings:            p.stylings ?? [],
    crewMembers:         p.crewMembers,
    models:              p.models,
  }
}
