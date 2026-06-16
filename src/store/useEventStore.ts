import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EventProject, TeamMember, BriefRosterEntry, ReferenceBlock, ReferenceImage, SketchBlock, CollateralItem, CollateralImage, Prop } from '@/types/event'
import type {
  Task, TimelineMilestone, DayOfSlot, BudgetItem,
  Vendor, MoodboardItem, Tag, ColourSwatch,
} from '@/types/common'
import { generateId, now } from '@/lib/utils'
import { createSeedEventProjects } from '@/lib/seedData'
import { useUserStore } from './useUserStore'

// ─── State interface ──────────────────────────────────────────────────────────

interface EventStoreState {
  projects: EventProject[]

  // ── Project ─────────────────────────────────────────────────────────────────
  addProject: (name: string, description?: string) => EventProject
  updateProject: (
    projectId: string,
    patch: Partial<Pick<EventProject, 'name' | 'description' | 'eventDate' | 'venue' | 'runTime'>>
  ) => void
  removeProject: (projectId: string) => void
  clearAll: () => void
  /**
   * Upsert a project that arrived from Supabase (Realtime or initial fetch).
   * Creates a full skeleton project using the remote id / timestamps so it
   * round-trips cleanly without generating a new local ID.
   * No-ops if the project already exists locally.
   */
  addProjectFromRemote: (data: { id: string; name: string; description: string; createdAt: string; updatedAt: string }) => void

  // ── Tasks ───────────────────────────────────────────────────────────────────
  addTask: (projectId: string, data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTask: (projectId: string, taskId: string, patch: Partial<Task>) => void
  removeTask: (projectId: string, taskId: string) => void
  /**
   * Upsert a task that arrived from Supabase Realtime or an initial fetch.
   * Replaces the task if it already exists; appends it otherwise.
   * Does NOT regenerate the id — the remote id is preserved as-is.
   */
  upsertTask: (projectId: string, task: Task) => void

  // ── Milestones ──────────────────────────────────────────────────────────────
  addMilestone: (projectId: string, data: Omit<TimelineMilestone, 'id' | 'order'>) => void
  updateMilestone: (projectId: string, id: string, patch: Partial<TimelineMilestone>) => void
  removeMilestone: (projectId: string, id: string) => void
  moveMilestone: (projectId: string, id: string, direction: 'up' | 'down') => void
  reorderMilestones: (projectId: string, orderedIds: string[]) => void

  // ── Day-of schedule ─────────────────────────────────────────────────────────
  addDayOfSlot: (projectId: string, data: Omit<DayOfSlot, 'id' | 'order'>) => void
  updateDayOfSlot: (projectId: string, id: string, patch: Partial<DayOfSlot>) => void
  removeDayOfSlot: (projectId: string, id: string) => void
  moveDayOfSlot: (projectId: string, id: string, direction: 'up' | 'down') => void

  // ── E3 replace-setters (used only by useProjectSectionsSync to apply remote) ──
  setMilestones: (projectId: string, milestones: TimelineMilestone[]) => void
  setDayOfSlots: (projectId: string, dayOfSlots: DayOfSlot[]) => void

  // ── Budget ──────────────────────────────────────────────────────────────────
  updateTotalBudget: (projectId: string, total: number) => void
  addBudgetItem: (projectId: string, data: Omit<BudgetItem, 'id' | 'createdAt'>) => void
  updateBudgetItem: (projectId: string, id: string, patch: Partial<BudgetItem>) => void
  removeBudgetItem: (projectId: string, id: string) => void

  // ── Vendors ─────────────────────────────────────────────────────────────────
  addVendor: (projectId: string, data: Omit<Vendor, 'id' | 'createdAt'>) => void
  updateVendor: (projectId: string, id: string, patch: Partial<Vendor>) => void
  removeVendor: (projectId: string, id: string) => void

  // ── Team members ─────────────────────────────────────────────────────────────
  addTeamMember: (projectId: string, data: Omit<TeamMember, 'id' | 'createdAt'>) => void
  updateTeamMember: (projectId: string, id: string, patch: Partial<TeamMember>) => void
  removeTeamMember: (projectId: string, id: string) => void

  // ── Moodboard ───────────────────────────────────────────────────────────────
  addMoodboardItem: (projectId: string, data: Omit<MoodboardItem, 'id' | 'order'>) => void
  updateMoodboardItem: (projectId: string, id: string, patch: Partial<MoodboardItem>) => void
  removeMoodboardItem: (projectId: string, id: string) => void
  reorderMoodboardItems: (projectId: string, orderedIds: string[]) => void

  // ── Tags ────────────────────────────────────────────────────────────────────
  addTag: (projectId: string, label: string) => void
  removeTag: (projectId: string, id: string) => void

  // ── Colours ─────────────────────────────────────────────────────────────────
  addColour: (projectId: string, hex: string, label?: string) => void
  updateColour: (projectId: string, id: string, patch: Partial<ColourSwatch>) => void
  removeColour: (projectId: string, id: string) => void

  // ── Brief deck roster ────────────────────────────────────────────────────────
  addRosterEntry: (projectId: string) => void
  updateRosterEntry: (projectId: string, id: string, patch: Partial<BriefRosterEntry>) => void
  removeRosterEntry: (projectId: string, id: string) => void

  // ── Reference blocks ─────────────────────────────────────────────────────────
  addReferenceBlock: (projectId: string, title?: string) => void
  updateReferenceBlock: (projectId: string, blockId: string, patch: Partial<ReferenceBlock>) => void
  removeReferenceBlock: (projectId: string, blockId: string) => void
  addReferenceImage: (projectId: string, blockId: string, imageId: string) => void
  updateReferenceImage: (projectId: string, blockId: string, id: string, patch: Partial<ReferenceImage>) => void
  removeReferenceImage: (projectId: string, blockId: string, id: string) => void

  // ── Sketches & Renders ────────────────────────────────────────────────────────
  addSketchBlock: (projectId: string) => void
  updateSketchBlock: (projectId: string, id: string, patch: Partial<SketchBlock>) => void
  removeSketchBlock: (projectId: string, id: string) => void
  moveSketchBlock: (projectId: string, id: string, direction: 'up' | 'down') => void

  // ── Collaterals ───────────────────────────────────────────────────────────────
  addCollateral: (projectId: string) => void
  updateCollateral: (projectId: string, id: string, patch: Partial<CollateralItem>) => void
  removeCollateral: (projectId: string, id: string) => void
  addCollateralImage: (projectId: string, collateralId: string, imageId: string) => void
  removeCollateralImage: (projectId: string, collateralId: string, imgId: string) => void

  // ── Props ─────────────────────────────────────────────────────────────────────
  addProp: (projectId: string) => void
  updateProp: (projectId: string, id: string, patch: Partial<Prop>) => void
  removeProp: (projectId: string, id: string) => void
  moveProp: (projectId: string, id: string, direction: 'up' | 'down') => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createDefaultEventProject(name: string, description = ''): EventProject {
  return {
    id: generateId(), name, description,
    createdAt: now(), updatedAt: now(),
    eventDate: '', venue: '', runTime: '',
    tasks: [], milestones: [], dayOfSlots: [],
    totalBudget: 0, budgetItems: [], vendors: [],
    teamMembers: [], moodboardItems: [], tags: [], colours: [],
    staffRoster: [], referenceBlocks: [], sketchBlocks: [], collaterals: [], props: [],
  }
}

function swapOrder<T extends { id: string; order: number }>(
  items: T[], id: string, direction: 'up' | 'down'
): T[] {
  const sorted = [...items].sort((a, b) => a.order - b.order)
  const idx = sorted.findIndex((x) => x.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return items
  const orderA = sorted[idx].order
  const orderB = sorted[swapIdx].order
  return items.map((x) => {
    if (x.id === sorted[idx].id) return { ...x, order: orderB }
    if (x.id === sorted[swapIdx].id) return { ...x, order: orderA }
    return x
  })
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useEventStore = create<EventStoreState>()(
  persist(
    (set) => {
      const patch = (
        projectId: string,
        updater: (p: EventProject) => Partial<EventProject>
      ) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId ? { ...p, ...updater(p), updatedAt: now() } : p
          ),
        }))

      return {
        projects: createSeedEventProjects(),

        // ── Project ────────────────────────────────────────────────────────────
        addProject: (name, description = '') => {
          const project = createDefaultEventProject(name, description)
          set((s) => ({ projects: [...s.projects, project] }))
          return project
        },
        updateProject: (projectId, p) => patch(projectId, () => p),
        removeProject: (projectId) => {
          set((s) => ({ projects: s.projects.filter((p) => p.id !== projectId) }))
          useUserStore.getState().purgeProjectAccess('event', projectId)
        },
        clearAll: () => {
          set({ projects: [] })
          useUserStore.getState().purgeModuleAccess('event')
        },
        addProjectFromRemote: ({ id, name, description, createdAt, updatedAt }) =>
          set((s) => {
            if (s.projects.some((p) => p.id === id)) return s
            return {
              projects: [
                ...s.projects,
                { ...createDefaultEventProject(name, description), id, createdAt, updatedAt },
              ],
            }
          }),

        // ── Tasks ──────────────────────────────────────────────────────────────
        addTask: (projectId, data) => {
          const task: Task = { ...data, id: generateId(), createdAt: now(), updatedAt: now() }
          patch(projectId, (p) => ({ tasks: [...p.tasks, task] }))
        },
        updateTask: (projectId, taskId, taskPatch) =>
          patch(projectId, (p) => ({
            tasks: p.tasks.map((t) =>
              t.id === taskId ? { ...t, ...taskPatch, updatedAt: now() } : t
            ),
          })),
        removeTask: (projectId, taskId) =>
          patch(projectId, (p) => ({ tasks: p.tasks.filter((t) => t.id !== taskId) })),
        upsertTask: (projectId, task) =>
          patch(projectId, (p) => ({
            tasks: p.tasks.some((t) => t.id === task.id)
              ? p.tasks.map((t) => (t.id === task.id ? task : t))
              : [...p.tasks, task],
          })),

        // ── Milestones ─────────────────────────────────────────────────────────
        addMilestone: (projectId, data) => {
          const item: TimelineMilestone = { ...data, id: generateId(), order: Date.now() }
          patch(projectId, (p) => ({ milestones: [...p.milestones, item] }))
        },
        updateMilestone: (projectId, id, mp) =>
          patch(projectId, (p) => ({
            milestones: p.milestones.map((m) => (m.id === id ? { ...m, ...mp } : m)),
          })),
        removeMilestone: (projectId, id) =>
          patch(projectId, (p) => ({ milestones: p.milestones.filter((m) => m.id !== id) })),
        moveMilestone: (projectId, id, direction) =>
          patch(projectId, (p) => ({ milestones: swapOrder(p.milestones, id, direction) })),
        reorderMilestones: (projectId, orderedIds) =>
          patch(projectId, (p) => ({
            milestones: p.milestones.map((m) => {
              const idx = orderedIds.indexOf(m.id)
              return idx === -1 ? m : { ...m, order: idx * 1000 }
            }),
          })),

        // ── Day-of slots ───────────────────────────────────────────────────────
        addDayOfSlot: (projectId, data) => {
          const item: DayOfSlot = { ...data, id: generateId(), order: Date.now() }
          patch(projectId, (p) => ({ dayOfSlots: [...p.dayOfSlots, item] }))
        },
        updateDayOfSlot: (projectId, id, sp) =>
          patch(projectId, (p) => ({
            dayOfSlots: p.dayOfSlots.map((s) => (s.id === id ? { ...s, ...sp } : s)),
          })),
        removeDayOfSlot: (projectId, id) =>
          patch(projectId, (p) => ({ dayOfSlots: p.dayOfSlots.filter((s) => s.id !== id) })),
        moveDayOfSlot: (projectId, id, direction) =>
          patch(projectId, (p) => ({ dayOfSlots: swapOrder(p.dayOfSlots, id, direction) })),

        // ── E3 replace-setters (apply remote section payloads wholesale) ───────
        setMilestones: (projectId, milestones) => patch(projectId, () => ({ milestones })),
        setDayOfSlots: (projectId, dayOfSlots) => patch(projectId, () => ({ dayOfSlots })),

        // ── Budget ─────────────────────────────────────────────────────────────
        updateTotalBudget: (projectId, total) =>
          patch(projectId, () => ({ totalBudget: total })),
        addBudgetItem: (projectId, data) => {
          const item: BudgetItem = { ...data, id: generateId(), createdAt: now() }
          patch(projectId, (p) => ({ budgetItems: [...p.budgetItems, item] }))
        },
        updateBudgetItem: (projectId, id, bp) =>
          patch(projectId, (p) => ({
            budgetItems: p.budgetItems.map((b) => (b.id === id ? { ...b, ...bp } : b)),
          })),
        removeBudgetItem: (projectId, id) =>
          patch(projectId, (p) => ({ budgetItems: p.budgetItems.filter((b) => b.id !== id) })),

        // ── Vendors ────────────────────────────────────────────────────────────
        addVendor: (projectId, data) => {
          const vendor: Vendor = { ...data, id: generateId(), createdAt: now() }
          patch(projectId, (p) => ({ vendors: [...p.vendors, vendor] }))
        },
        updateVendor: (projectId, id, vp) =>
          patch(projectId, (p) => ({
            vendors: p.vendors.map((v) => (v.id === id ? { ...v, ...vp } : v)),
          })),
        removeVendor: (projectId, id) =>
          patch(projectId, (p) => ({ vendors: p.vendors.filter((v) => v.id !== id) })),

        // ── Team members ───────────────────────────────────────────────────────
        addTeamMember: (projectId, data) => {
          const member: TeamMember = { ...data, id: generateId(), createdAt: now() }
          patch(projectId, (p) => ({ teamMembers: [...p.teamMembers, member] }))
        },
        updateTeamMember: (projectId, id, mp) =>
          patch(projectId, (p) => ({
            teamMembers: p.teamMembers.map((m) => (m.id === id ? { ...m, ...mp } : m)),
          })),
        removeTeamMember: (projectId, id) =>
          patch(projectId, (p) => ({ teamMembers: p.teamMembers.filter((m) => m.id !== id) })),

        // ── Moodboard ──────────────────────────────────────────────────────────
        addMoodboardItem: (projectId, data) => {
          const item: MoodboardItem = { ...data, id: generateId(), order: Date.now() }
          patch(projectId, (p) => ({ moodboardItems: [...p.moodboardItems, item] }))
        },
        updateMoodboardItem: (projectId, id, mp) =>
          patch(projectId, (p) => ({
            moodboardItems: p.moodboardItems.map((m) => (m.id === id ? { ...m, ...mp } : m)),
          })),
        removeMoodboardItem: (projectId, id) =>
          patch(projectId, (p) => ({ moodboardItems: p.moodboardItems.filter((m) => m.id !== id) })),
        reorderMoodboardItems: (projectId, orderedIds) =>
          patch(projectId, (p) => ({
            moodboardItems: p.moodboardItems.map((m) => {
              const idx = orderedIds.indexOf(m.id)
              return idx === -1 ? m : { ...m, order: idx * 1000 }
            }),
          })),

        // ── Tags ───────────────────────────────────────────────────────────────
        addTag: (projectId, label) => {
          const tag: Tag = { id: generateId(), label }
          patch(projectId, (p) => ({ tags: [...p.tags, tag] }))
        },
        removeTag: (projectId, id) =>
          patch(projectId, (p) => ({ tags: p.tags.filter((t) => t.id !== id) })),

        // ── Colours ────────────────────────────────────────────────────────────
        addColour: (projectId, hex, label = '') => {
          const colour: ColourSwatch = { id: generateId(), hex, label }
          patch(projectId, (p) => ({ colours: [...p.colours, colour] }))
        },
        updateColour: (projectId, id, cp) =>
          patch(projectId, (p) => ({
            colours: p.colours.map((c) => (c.id === id ? { ...c, ...cp } : c)),
          })),
        removeColour: (projectId, id) =>
          patch(projectId, (p) => ({ colours: p.colours.filter((c) => c.id !== id) })),

        // ── Brief deck roster ──────────────────────────────────────────────────
        addRosterEntry: (projectId) => {
          const entry: BriefRosterEntry = { id: generateId(), name: '', role: '', hoursStart: '', hoursEnd: '' }
          patch(projectId, (p) => ({ staffRoster: [...(p.staffRoster ?? []), entry] }))
        },
        updateRosterEntry: (projectId, id, rp) =>
          patch(projectId, (p) => ({
            staffRoster: (p.staffRoster ?? []).map((r) => (r.id === id ? { ...r, ...rp } : r)),
          })),
        removeRosterEntry: (projectId, id) =>
          patch(projectId, (p) => ({ staffRoster: (p.staffRoster ?? []).filter((r) => r.id !== id) })),

        // ── Reference blocks ───────────────────────────────────────────────────
        addReferenceBlock: (projectId, title = 'References') => {
          const block: ReferenceBlock = { id: generateId(), title, images: [], order: Date.now() }
          patch(projectId, (p) => ({ referenceBlocks: [...(p.referenceBlocks ?? []), block] }))
        },
        updateReferenceBlock: (projectId, blockId, bp) =>
          patch(projectId, (p) => ({
            referenceBlocks: (p.referenceBlocks ?? []).map((b) =>
              b.id === blockId ? { ...b, ...bp } : b
            ),
          })),
        removeReferenceBlock: (projectId, blockId) =>
          patch(projectId, (p) => ({
            referenceBlocks: (p.referenceBlocks ?? []).filter((b) => b.id !== blockId),
          })),
        addReferenceImage: (projectId, blockId, imageId) => {
          const img: ReferenceImage = { id: generateId(), imageId, caption: '', tags: [], order: Date.now() }
          patch(projectId, (p) => ({
            referenceBlocks: (p.referenceBlocks ?? []).map((b) =>
              b.id === blockId ? { ...b, images: [...b.images, img] } : b
            ),
          }))
        },
        updateReferenceImage: (projectId, blockId, id, ip) =>
          patch(projectId, (p) => ({
            referenceBlocks: (p.referenceBlocks ?? []).map((b) =>
              b.id === blockId
                ? { ...b, images: b.images.map((img) => (img.id === id ? { ...img, ...ip } : img)) }
                : b
            ),
          })),
        removeReferenceImage: (projectId, blockId, id) =>
          patch(projectId, (p) => ({
            referenceBlocks: (p.referenceBlocks ?? []).map((b) =>
              b.id === blockId ? { ...b, images: b.images.filter((img) => img.id !== id) } : b
            ),
          })),

        // ── Sketches & Renders ─────────────────────────────────────────────────
        addSketchBlock: (projectId) => {
          const block: SketchBlock = {
            id: generateId(), title: '', description: '', vendor: '', imageId: '',
            order: Date.now(), createdAt: now(),
          }
          patch(projectId, (p) => ({ sketchBlocks: [...(p.sketchBlocks ?? []), block] }))
        },
        updateSketchBlock: (projectId, id, sp) =>
          patch(projectId, (p) => ({
            sketchBlocks: (p.sketchBlocks ?? []).map((b) => (b.id === id ? { ...b, ...sp } : b)),
          })),
        removeSketchBlock: (projectId, id) =>
          patch(projectId, (p) => ({
            sketchBlocks: (p.sketchBlocks ?? []).filter((b) => b.id !== id),
          })),
        moveSketchBlock: (projectId, id, direction) =>
          patch(projectId, (p) => ({ sketchBlocks: swapOrder(p.sketchBlocks ?? [], id, direction) })),

        // ── Collaterals ────────────────────────────────────────────────────────
        addCollateral: (projectId) => {
          const item: CollateralItem = {
            id: generateId(), title: '', format: 'print', formatDetail: '',
            brief: '', copy: '', images: [], status: 'requested',
            order: Date.now(), createdAt: now(),
          }
          patch(projectId, (p) => ({ collaterals: [...(p.collaterals ?? []), item] }))
        },
        updateCollateral: (projectId, id, cp) =>
          patch(projectId, (p) => ({
            collaterals: (p.collaterals ?? []).map((c) => (c.id === id ? { ...c, ...cp } : c)),
          })),
        removeCollateral: (projectId, id) =>
          patch(projectId, (p) => ({
            collaterals: (p.collaterals ?? []).filter((c) => c.id !== id),
          })),
        addCollateralImage: (projectId, collateralId, imageId) => {
          const img: CollateralImage = { id: generateId(), imageId, order: Date.now() }
          patch(projectId, (p) => ({
            collaterals: (p.collaterals ?? []).map((c) =>
              c.id === collateralId && c.images.length < 4
                ? { ...c, images: [...c.images, img] }
                : c
            ),
          }))
        },
        removeCollateralImage: (projectId, collateralId, imgId) =>
          patch(projectId, (p) => ({
            collaterals: (p.collaterals ?? []).map((c) =>
              c.id === collateralId
                ? { ...c, images: c.images.filter((i) => i.id !== imgId) }
                : c
            ),
          })),

        // ── Props ──────────────────────────────────────────────────────────────
        addProp: (projectId) => {
          const prop: Prop = {
            id: generateId(), name: '', imageId: '', link: '',
            amountNeeded: '', useCase: '', notes: '',
            order: Date.now(), createdAt: now(),
          }
          patch(projectId, (p) => ({ props: [...(p.props ?? []), prop] }))
        },
        updateProp: (projectId, id, pp) =>
          patch(projectId, (p) => ({
            props: (p.props ?? []).map((x) => (x.id === id ? { ...x, ...pp } : x)),
          })),
        removeProp: (projectId, id) =>
          patch(projectId, (p) => ({ props: (p.props ?? []).filter((x) => x.id !== id) })),
        moveProp: (projectId, id, direction) =>
          patch(projectId, (p) => ({ props: swapOrder(p.props ?? [], id, direction) })),
      }
    },
    { name: 'brand-ops-events-v2' }
  )
)
