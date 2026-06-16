import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ShootProject, CrewMember, Model, Shot, DDayTimelineRow,
  ShootBriefDetails, ShootBriefSection, Product, ProductUSP, Styling, Prop,
} from '@/types/shoot'
import type {
  Task, TimelineMilestone, DayOfSlot, BudgetItem,
  Vendor, MoodboardItem, Tag, ColourSwatch,
} from '@/types/common'
import { generateId, now } from '@/lib/utils'
import { createSeedShootProjects } from '@/lib/seedData'
import { useUserStore } from './useUserStore'

// ─── State interface ──────────────────────────────────────────────────────────

type BriefImageSection = 'wardrobe' | 'hairAndMakeup' | 'locations'
const BRIEF_IMAGE_FIELD: Record<BriefImageSection, 'wardrobeImages' | 'hairAndMakeupImages' | 'locationsImages'> = {
  wardrobe:    'wardrobeImages',
  hairAndMakeup: 'hairAndMakeupImages',
  locations:   'locationsImages',
}

interface ShootStoreState {
  projects: ShootProject[]

  // ── Project ─────────────────────────────────────────────────────────────────
  addProject: (name: string, description?: string) => ShootProject
  updateProject: (projectId: string, patch: Partial<Pick<ShootProject, 'name' | 'description'>>) => void
  removeProject: (projectId: string) => void
  clearAll: () => void
  /**
   * Upsert a project that arrived from Supabase (Realtime or initial fetch).
   * Creates a full skeleton project using the remote id / timestamps so it
   * round-trips cleanly without generating a new local ID.
   * No-ops if the project already exists locally.
   */
  addProjectFromRemote: (data: { id: string; name: string; description: string; createdAt: string; updatedAt: string }) => void
  updateBriefDetails: (projectId: string, patch: Partial<ShootBriefDetails>) => void
  updateShootBrief: (projectId: string, patch: Partial<ShootBriefSection>) => void

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

  // ── Budget ──────────────────────────────────────────────────────────────────
  updateTotalBudget: (projectId: string, total: number) => void
  addBudgetItem: (projectId: string, data: Omit<BudgetItem, 'id' | 'createdAt'>) => void
  updateBudgetItem: (projectId: string, id: string, patch: Partial<BudgetItem>) => void
  removeBudgetItem: (projectId: string, id: string) => void

  // ── Vendors ─────────────────────────────────────────────────────────────────
  addVendor: (projectId: string, data: Omit<Vendor, 'id' | 'createdAt'>) => void
  updateVendor: (projectId: string, id: string, patch: Partial<Vendor>) => void
  removeVendor: (projectId: string, id: string) => void

  // ── Crew members ─────────────────────────────────────────────────────────────
  addCrewMember: (projectId: string, data: Omit<CrewMember, 'id' | 'createdAt'>) => void
  updateCrewMember: (projectId: string, id: string, patch: Partial<CrewMember>) => void
  removeCrewMember: (projectId: string, id: string) => void
  /** Sync-only: upsert a crew member with its existing id (apply remote). Replaces if present, else appends. */
  upsertCrewMember: (projectId: string, member: CrewMember) => void

  // ── Models ──────────────────────────────────────────────────────────────────
  addModel: (projectId: string, data: Omit<Model, 'id' | 'createdAt'>) => void
  updateModel: (projectId: string, id: string, patch: Partial<Model>) => void
  removeModel: (projectId: string, id: string) => void
  /** Sync-only: upsert a model with its existing id (apply remote). Replaces if present, else appends. */
  upsertModel: (projectId: string, model: Model) => void

  // ── Shots ───────────────────────────────────────────────────────────────────
  addShot: (projectId: string, data: Omit<Shot, 'id' | 'order'>) => void
  updateShot: (projectId: string, id: string, patch: Partial<Shot>) => void
  removeShot: (projectId: string, id: string) => void
  moveShot: (projectId: string, id: string, direction: 'up' | 'down') => void

  // ── D-Day timeline ──────────────────────────────────────────────────────────
  addDDayRow: (projectId: string, data: Omit<DDayTimelineRow, 'id' | 'order'>) => void
  updateDDayRow: (projectId: string, id: string, patch: Partial<DDayTimelineRow>) => void
  removeDDayRow: (projectId: string, id: string) => void
  moveDDayRow: (projectId: string, id: string, direction: 'up' | 'down') => void

  // ── E3 replace-setters (used only by useProjectSectionsSync to apply remote) ──
  // These wholesale-replace an array from a remote section payload. The editor
  // keeps using the granular add/update/remove/move actions above.
  setShots: (projectId: string, shots: Shot[]) => void
  setMilestones: (projectId: string, milestones: TimelineMilestone[]) => void
  setDayOfSlots: (projectId: string, dayOfSlots: DayOfSlot[]) => void
  setDDayRows: (projectId: string, ddayRows: DDayTimelineRow[]) => void

  // ── Moodboard ───────────────────────────────────────────────────────────────
  addMoodboardItem: (projectId: string, data: Omit<MoodboardItem, 'id' | 'order'>) => void
  updateMoodboardItem: (projectId: string, id: string, patch: Partial<MoodboardItem>) => void
  removeMoodboardItem: (projectId: string, id: string) => void
  reorderMoodboardItems: (projectId: string, orderedIds: string[]) => void

  // ── Brief moodboard (Shot Brief page) ────────────────────────────────────────
  addBriefMoodboardItem: (projectId: string, data: Omit<MoodboardItem, 'id' | 'order'>) => void
  updateBriefMoodboardItem: (projectId: string, id: string, patch: Partial<MoodboardItem>) => void
  removeBriefMoodboardItem: (projectId: string, id: string) => void
  reorderBriefMoodboardItems: (projectId: string, orderedIds: string[]) => void

  // ── Brief section images (wardrobe / HMU / locations) ────────────────────────
  addBriefSectionImage: (projectId: string, section: BriefImageSection, imageId: string) => void
  removeBriefSectionImage: (projectId: string, section: BriefImageSection, itemId: string) => void

  // ── Tags ────────────────────────────────────────────────────────────────────
  addTag: (projectId: string, label: string) => void
  removeTag: (projectId: string, id: string) => void

  // ── Colours ─────────────────────────────────────────────────────────────────
  addColour: (projectId: string, hex: string, label?: string) => void
  updateColour: (projectId: string, id: string, patch: Partial<ColourSwatch>) => void
  removeColour: (projectId: string, id: string) => void

  // ── Products ────────────────────────────────────────────────────────────────
  addProduct: (projectId: string, data: Omit<Product, 'id' | 'order' | 'createdAt'>) => void
  updateProduct: (projectId: string, id: string, patch: Partial<Product>) => void
  removeProduct: (projectId: string, id: string) => void
  moveProduct: (projectId: string, id: string, direction: 'up' | 'down') => void
  /** Sync-only: upsert a product with its existing id (apply remote). Replaces if present, else appends. */
  upsertProduct: (projectId: string, product: Product) => void
  addProductUSP: (projectId: string, productId: string, text: string) => void
  updateProductUSP: (projectId: string, productId: string, uspId: string, text: string) => void
  removeProductUSP: (projectId: string, productId: string, uspId: string) => void
  addProductCategory: (projectId: string, label: string) => void
  removeProductCategory: (projectId: string, label: string) => void

  // ── Stylings ────────────────────────────────────────────────────────────────
  addStyling: (projectId: string, data: Omit<Styling, 'id' | 'order' | 'createdAt'>) => void
  updateStyling: (projectId: string, id: string, patch: Partial<Styling>) => void
  removeStyling: (projectId: string, id: string) => void
  moveStyling: (projectId: string, id: string, direction: 'up' | 'down') => void
  /** Sync-only: upsert a styling with its existing id (apply remote). Replaces if present, else appends. */
  upsertStyling: (projectId: string, styling: Styling) => void

  // ── Props ─────────────────────────────────────────────────────────────────────
  addProp: (projectId: string) => void
  updateProp: (projectId: string, id: string, patch: Partial<Prop>) => void
  removeProp: (projectId: string, id: string) => void
  moveProp: (projectId: string, id: string, direction: 'up' | 'down') => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createDefaultShootProject(name: string, description = ''): ShootProject {
  return {
    id: generateId(), name, description,
    createdAt: now(), updatedAt: now(),
    briefDetails: { shootType: '', concept: '', client: '', location: '', callTime: '', wrapTime: '' },
    shootBrief: { overview: '', creativeDirection: '', wardrobe: '', hairAndMakeup: '', locations: '', additionalNotes: '' },
    wardrobeImages: [], hairAndMakeupImages: [], locationsImages: [],
    products: [], stylings: [], productCategories: ['Apparel', 'Accessories', 'Footwear', 'Skincare', 'Fragrance'],
    tasks: [], milestones: [], dayOfSlots: [],
    totalBudget: 0, budgetItems: [], vendors: [],
    crewMembers: [], models: [], shots: [], ddayRows: [],
    moodboardItems: [], briefMoodboardItems: [], tags: [], colours: [], props: [],
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

function reorderByIds<T extends { id: string; order: number }>(items: T[], orderedIds: string[]): T[] {
  return items.map((item) => {
    const idx = orderedIds.indexOf(item.id)
    return idx === -1 ? item : { ...item, order: idx * 1000 }
  })
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useShootStore = create<ShootStoreState>()(
  persist(
    (set) => {
      const patch = (
        projectId: string,
        updater: (p: ShootProject) => Partial<ShootProject>
      ) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId ? { ...p, ...updater(p), updatedAt: now() } : p
          ),
        }))

      return {
        projects: createSeedShootProjects(),

        // ── Project ────────────────────────────────────────────────────────────
        addProject: (name, description = '') => {
          const project = createDefaultShootProject(name, description)
          set((s) => ({ projects: [...s.projects, project] }))
          return project
        },
        updateProject: (projectId, p) => patch(projectId, () => p),
        removeProject: (projectId) => {
          set((s) => ({ projects: s.projects.filter((p) => p.id !== projectId) }))
          useUserStore.getState().purgeProjectAccess('shoot', projectId)
        },
        clearAll: () => {
          set({ projects: [] })
          useUserStore.getState().purgeModuleAccess('shoot')
        },
        addProjectFromRemote: ({ id, name, description, createdAt, updatedAt }) =>
          set((s) => {
            if (s.projects.some((p) => p.id === id)) return s
            return {
              projects: [
                ...s.projects,
                { ...createDefaultShootProject(name, description), id, createdAt, updatedAt },
              ],
            }
          }),
        updateBriefDetails: (projectId, bd) =>
          patch(projectId, (p) => ({ briefDetails: { ...p.briefDetails, ...bd } })),
        updateShootBrief: (projectId, sb) =>
          patch(projectId, (p) => ({ shootBrief: { ...p.shootBrief, ...sb } })),

        // ── Tasks ──────────────────────────────────────────────────────────────
        addTask: (projectId, data) => {
          const task: Task = { ...data, id: generateId(), createdAt: now(), updatedAt: now() }
          patch(projectId, (p) => ({ tasks: [...p.tasks, task] }))
        },
        updateTask: (projectId, taskId, tp) =>
          patch(projectId, (p) => ({
            tasks: p.tasks.map((t) => t.id === taskId ? { ...t, ...tp, updatedAt: now() } : t),
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
          patch(projectId, (p) => ({ milestones: reorderByIds(p.milestones, orderedIds) })),

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

        // ── Crew members ───────────────────────────────────────────────────────
        addCrewMember: (projectId, data) => {
          const member: CrewMember = { ...data, id: generateId(), createdAt: now() }
          patch(projectId, (p) => ({ crewMembers: [...p.crewMembers, member] }))
        },
        updateCrewMember: (projectId, id, mp) =>
          patch(projectId, (p) => ({
            crewMembers: p.crewMembers.map((m) => (m.id === id ? { ...m, ...mp } : m)),
          })),
        removeCrewMember: (projectId, id) =>
          patch(projectId, (p) => ({ crewMembers: p.crewMembers.filter((m) => m.id !== id) })),
        upsertCrewMember: (projectId, member) =>
          patch(projectId, (p) => {
            const list = p.crewMembers ?? []
            return {
              crewMembers: list.some((m) => m.id === member.id)
                ? list.map((m) => (m.id === member.id ? member : m))
                : [...list, member],
            }
          }),

        // ── Models ─────────────────────────────────────────────────────────────
        addModel: (projectId, data) => {
          const model: Model = { ...data, id: generateId(), createdAt: now() }
          patch(projectId, (p) => ({ models: [...p.models, model] }))
        },
        updateModel: (projectId, id, mp) =>
          patch(projectId, (p) => ({
            models: p.models.map((m) => (m.id === id ? { ...m, ...mp } : m)),
          })),
        removeModel: (projectId, id) =>
          patch(projectId, (p) => ({ models: p.models.filter((m) => m.id !== id) })),
        upsertModel: (projectId, model) =>
          patch(projectId, (p) => {
            const list = p.models ?? []
            return {
              models: list.some((m) => m.id === model.id)
                ? list.map((m) => (m.id === model.id ? model : m))
                : [...list, model],
            }
          }),

        // ── Shots ──────────────────────────────────────────────────────────────
        addShot: (projectId, data) => {
          const shot: Shot = { ...data, id: generateId(), order: Date.now() }
          patch(projectId, (p) => ({ shots: [...p.shots, shot] }))
        },
        updateShot: (projectId, id, sp) =>
          patch(projectId, (p) => ({
            shots: p.shots.map((s) => (s.id === id ? { ...s, ...sp } : s)),
          })),
        removeShot: (projectId, id) =>
          patch(projectId, (p) => ({ shots: p.shots.filter((s) => s.id !== id) })),
        moveShot: (projectId, id, direction) =>
          patch(projectId, (p) => ({ shots: swapOrder(p.shots, id, direction) })),

        // ── D-Day rows ─────────────────────────────────────────────────────────
        addDDayRow: (projectId, data) => {
          const row: DDayTimelineRow = { ...data, id: generateId(), order: Date.now() }
          patch(projectId, (p) => ({ ddayRows: [...p.ddayRows, row] }))
        },
        updateDDayRow: (projectId, id, rp) =>
          patch(projectId, (p) => ({
            ddayRows: p.ddayRows.map((r) => (r.id === id ? { ...r, ...rp } : r)),
          })),
        removeDDayRow: (projectId, id) =>
          patch(projectId, (p) => ({ ddayRows: p.ddayRows.filter((r) => r.id !== id) })),
        moveDDayRow: (projectId, id, direction) =>
          patch(projectId, (p) => ({ ddayRows: swapOrder(p.ddayRows, id, direction) })),

        // ── E3 replace-setters (apply remote section payloads wholesale) ───────
        setShots: (projectId, shots) => patch(projectId, () => ({ shots })),
        setMilestones: (projectId, milestones) => patch(projectId, () => ({ milestones })),
        setDayOfSlots: (projectId, dayOfSlots) => patch(projectId, () => ({ dayOfSlots })),
        setDDayRows: (projectId, ddayRows) => patch(projectId, () => ({ ddayRows })),

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
          patch(projectId, (p) => ({ moodboardItems: reorderByIds(p.moodboardItems, orderedIds) })),

        // ── Brief moodboard ────────────────────────────────────────────────────
        addBriefMoodboardItem: (projectId, data) => {
          const item: MoodboardItem = { ...data, id: generateId(), order: Date.now() }
          patch(projectId, (p) => ({ briefMoodboardItems: [...p.briefMoodboardItems, item] }))
        },
        updateBriefMoodboardItem: (projectId, id, mp) =>
          patch(projectId, (p) => ({
            briefMoodboardItems: p.briefMoodboardItems.map((m) => (m.id === id ? { ...m, ...mp } : m)),
          })),
        removeBriefMoodboardItem: (projectId, id) =>
          patch(projectId, (p) => ({ briefMoodboardItems: p.briefMoodboardItems.filter((m) => m.id !== id) })),
        reorderBriefMoodboardItems: (projectId, orderedIds) =>
          patch(projectId, (p) => ({ briefMoodboardItems: reorderByIds(p.briefMoodboardItems, orderedIds) })),

        // ── Brief section images ────────────────────────────────────────────────
        addBriefSectionImage: (projectId, section, imageId) => {
          const field = BRIEF_IMAGE_FIELD[section]
          const item: MoodboardItem = { id: generateId(), imageId, caption: '', order: Date.now() }
          patch(projectId, (p) => ({ [field]: [...(p[field] ?? []), item] }))
        },
        removeBriefSectionImage: (projectId, section, itemId) => {
          const field = BRIEF_IMAGE_FIELD[section]
          patch(projectId, (p) => ({ [field]: (p[field] ?? []).filter((m) => m.id !== itemId) }))
        },

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

        // ── Products ───────────────────────────────────────────────────────────
        addProduct: (projectId, data) => {
          const product: Product = { ...data, id: generateId(), order: Date.now(), createdAt: now() }
          patch(projectId, (p) => ({ products: [...(p.products ?? []), product] }))
        },
        updateProduct: (projectId, id, pp) =>
          patch(projectId, (p) => ({
            products: (p.products ?? []).map((x) => (x.id === id ? { ...x, ...pp } : x)),
          })),
        removeProduct: (projectId, id) =>
          patch(projectId, (p) => ({ products: (p.products ?? []).filter((x) => x.id !== id) })),
        moveProduct: (projectId, id, direction) =>
          patch(projectId, (p) => ({ products: swapOrder(p.products ?? [], id, direction) })),
        upsertProduct: (projectId, product) =>
          patch(projectId, (p) => {
            const list = p.products ?? []
            return {
              products: list.some((x) => x.id === product.id)
                ? list.map((x) => (x.id === product.id ? product : x))
                : [...list, product],
            }
          }),
        addProductUSP: (projectId, productId, text) => {
          const usp: ProductUSP = { id: generateId(), text }
          patch(projectId, (p) => ({
            products: (p.products ?? []).map((x) =>
              x.id === productId ? { ...x, usps: [...x.usps, usp] } : x
            ),
          }))
        },
        updateProductUSP: (projectId, productId, uspId, text) =>
          patch(projectId, (p) => ({
            products: (p.products ?? []).map((x) =>
              x.id === productId
                ? { ...x, usps: x.usps.map((u) => (u.id === uspId ? { ...u, text } : u)) }
                : x
            ),
          })),
        removeProductUSP: (projectId, productId, uspId) =>
          patch(projectId, (p) => ({
            products: (p.products ?? []).map((x) =>
              x.id === productId ? { ...x, usps: x.usps.filter((u) => u.id !== uspId) } : x
            ),
          })),
        addProductCategory: (projectId, label) =>
          patch(projectId, (p) => ({
            productCategories: [...(p.productCategories ?? []).filter((c) => c !== label), label],
          })),
        removeProductCategory: (projectId, label) =>
          patch(projectId, (p) => ({
            productCategories: (p.productCategories ?? []).filter((c) => c !== label),
          })),

        // ── Stylings ───────────────────────────────────────────────────────────
        addStyling: (projectId, data) => {
          const styling: Styling = { ...data, id: generateId(), order: Date.now(), createdAt: now() }
          patch(projectId, (p) => ({ stylings: [...(p.stylings ?? []), styling] }))
        },
        updateStyling: (projectId, id, sp) =>
          patch(projectId, (p) => ({
            stylings: (p.stylings ?? []).map((s) => (s.id === id ? { ...s, ...sp } : s)),
          })),
        removeStyling: (projectId, id) =>
          patch(projectId, (p) => ({ stylings: (p.stylings ?? []).filter((s) => s.id !== id) })),
        moveStyling: (projectId, id, direction) =>
          patch(projectId, (p) => ({ stylings: swapOrder(p.stylings ?? [], id, direction) })),
        upsertStyling: (projectId, styling) =>
          patch(projectId, (p) => {
            const list = p.stylings ?? []
            return {
              stylings: list.some((s) => s.id === styling.id)
                ? list.map((s) => (s.id === styling.id ? styling : s))
                : [...list, styling],
            }
          }),

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
    { name: 'brand-ops-shoots-v3' }
  )
)
