/**
 * Project section registry (Phase E3).
 *
 * Each descriptor describes one shared array slice of a project:
 *   - section : the project_sections.section key
 *   - build   : project → { items: [...] }   (local → remote)
 *   - apply   : (projectId, items) → store    (remote → local)
 *
 * useProjectSectionsSync iterates these registries, so adding a new shared
 * array slice in a future batch/phase is a one-line registry entry plus a
 * store "replace" setter.  No hook changes needed.
 *
 * content shape is always { items: [...] } holding the full array (row ids,
 * order, and links preserved).
 */
import type { ShootProject, Shot, DDayTimelineRow } from '@/types/shoot'
import type { EventProject } from '@/types/event'
import type { TimelineMilestone, DayOfSlot } from '@/types/common'
import { useShootStore } from '@/store/useShootStore'
import { useEventStore } from '@/store/useEventStore'

export interface SectionContent {
  items: unknown[]
}

export interface ShootSectionDescriptor {
  section: string
  build:   (p: ShootProject) => SectionContent
  apply:   (projectId: string, items: unknown[]) => void
}

export interface EventSectionDescriptor {
  section: string
  build:   (p: EventProject) => SectionContent
  apply:   (projectId: string, items: unknown[]) => void
}

// Registries — populated across E3 batches:
//   Batch 3: shoot_shot_list
//   Batch 4: shoot_milestones, shoot_schedule, shoot_dday
//   Batch 5: event_milestones, event_schedule
export const SHOOT_SECTIONS: ShootSectionDescriptor[] = [
  {
    section: 'shoot_shot_list',
    build:   (p) => ({ items: p.shots }),
    apply:   (projectId, items) => useShootStore.getState().setShots(projectId, items as Shot[]),
  },
  {
    section: 'shoot_milestones',
    build:   (p) => ({ items: p.milestones }),
    apply:   (projectId, items) => useShootStore.getState().setMilestones(projectId, items as TimelineMilestone[]),
  },
  {
    section: 'shoot_schedule',
    build:   (p) => ({ items: p.dayOfSlots }),
    apply:   (projectId, items) => useShootStore.getState().setDayOfSlots(projectId, items as DayOfSlot[]),
  },
  {
    section: 'shoot_dday',
    build:   (p) => ({ items: p.ddayRows }),
    apply:   (projectId, items) => useShootStore.getState().setDDayRows(projectId, items as DDayTimelineRow[]),
  },
]
export const EVENT_SECTIONS: EventSectionDescriptor[] = [
  {
    section: 'event_milestones',
    build:   (p) => ({ items: p.milestones }),
    apply:   (projectId, items) => useEventStore.getState().setMilestones(projectId, items as TimelineMilestone[]),
  },
  {
    section: 'event_schedule',
    build:   (p) => ({ items: p.dayOfSlots }),
    apply:   (projectId, items) => useEventStore.getState().setDayOfSlots(projectId, items as DayOfSlot[]),
  },
]
