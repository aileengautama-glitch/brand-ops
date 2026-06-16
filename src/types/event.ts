import type {
  Task,
  TimelineMilestone,
  DayOfSlot,
  BudgetItem,
  Vendor,
  MoodboardItem,
  Tag,
  ColourSwatch,
  Prop,
} from './common'

export type { Task, TimelineMilestone, DayOfSlot, BudgetItem, Vendor, MoodboardItem, Tag, ColourSwatch, Prop }

// ─── Reference blocks ────────────────────────────────────────────────────────

export interface ReferenceImage {
  id: string
  imageId: string
  caption: string
  tags: string[]   // hashtags / keywords
  order: number
}

export interface ReferenceBlock {
  id: string
  title: string
  images: ReferenceImage[]
  order: number
}

// ─── Event-specific entities ──────────────────────────────────────────────────

// Brief deck staff roster — separate from team members so the deck can be
// customised independently (different hours, external contractors, etc.)
export interface BriefRosterEntry {
  id: string
  name: string
  role: string
  hoursStart: string   // e.g. '17:00'
  hoursEnd: string     // e.g. '22:00'
}

export interface TeamMember {
  id: string
  name: string
  role: string
  contact: string
  notes: string
  createdAt: string
}

// ─── Sketches & Renders ───────────────────────────────────────────────────────

export interface SketchBlock {
  id: string
  title: string
  description: string
  vendor: string        // agency, 3D artist, visualiser, etc.
  imageId: string       // IndexedDB key for the sketch / render image
  order: number
  createdAt: string
}

// ─── Collaterals ─────────────────────────────────────────────────────────────

export type CollateralStatus = 'requested' | 'pending-review' | 'approved' | 'pending-revision'
export type CollateralFormat = 'print' | 'digital'

export interface CollateralImage {
  id: string
  imageId: string
  order: number
}

export interface CollateralItem {
  id: string
  title: string
  format: CollateralFormat
  formatDetail: string        // e.g. "A2 poster, double-sided" or "Instagram Story 9:16"
  brief: string               // Creative Director's brief text to the designer
  copy: string                // Copy / content text for the piece
  images: CollateralImage[]   // Up to 4 reference images
  status: CollateralStatus
  order: number
  createdAt: string
}

// ─── Event project ────────────────────────────────────────────────────────────

export interface EventProject {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string

  // Project metadata
  eventDate: string     // ISO date string
  venue: string
  runTime: string       // e.g. '18:30 — 22:00'

  // Data collections
  tasks: Task[]
  milestones: TimelineMilestone[]
  dayOfSlots: DayOfSlot[]
  totalBudget: number
  budgetItems: BudgetItem[]
  vendors: Vendor[]
  teamMembers: TeamMember[]
  moodboardItems: MoodboardItem[]
  tags: Tag[]
  colours: ColourSwatch[]
  staffRoster: BriefRosterEntry[]
  referenceBlocks: ReferenceBlock[]
  sketchBlocks: SketchBlock[]
  collaterals: CollateralItem[]
  props: Prop[]
}
