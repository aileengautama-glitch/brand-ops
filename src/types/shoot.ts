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

// ─── Shoot-specific entities ──────────────────────────────────────────────────

export interface CrewMember {
  id: string
  name: string
  role: string
  contact: string
  notes: string
  createdAt: string
}

export interface Model {
  id: string
  name: string
  agency: string
  imageId: string       // IndexedDB key for photo
  // Measurements
  height: string        // e.g. '178 cm'
  shoeSize: string      // e.g. '39'
  apparelSize: string   // e.g. 'XS / S'
  dressSize: string     // e.g. '36'
  generalMeasurements: string  // free-text
  notes: string
  createdAt: string
}

export interface Shot {
  id: string
  shotId: string        // user-defined code, e.g. 'S01'
  name: string
  description: string
  location: string      // location/set, e.g. 'Outdoors / Plains' — deck shot-list groups by this
  notes: string
  imageId: string       // IndexedDB key for reference image
  order: number
}

/** A single model's look within one shot: which styling that model wears. */
export interface ModelStyling {
  modelId: string       // references Model.id
  stylingId: string     // references Styling.id ('' if unset)
}

export interface DDayTimelineRow {
  id: string
  imageCode: string
  imageId: string       // IndexedDB key for the primary reference thumbnail
  referenceImageIds: string[]  // additional reference images for this shot (IndexedDB keys); '?? []' on legacy rows
  location: string
  timeStart: string     // e.g. '09:00'
  timeEnd: string       // e.g. '10:30'
  modelIds: string[]    // references to Model.id — who is in this shot
  stylingId: string     // legacy single styling (kept for back-compat / deck fallback)
  modelStylings: ModelStyling[]  // per-model looks: which styling each model wears in this shot ('?? []' on legacy rows)
  notes: string
  order: number
}

export interface ShootBriefDetails {
  shootType: string
  concept: string
  client: string
  collection: string    // e.g. 'S/S 27', 'A/W 26' — shown on dashboard + deck cover title
  location: string
  shootDate: string      // free-text date, e.g. '12 January 2027' — deck cover meta
  callTime: string
  wrapTime: string
}

export interface ShootBriefSection {
  overview: string
  campaignMessaging: string  // campaign narrative / messaging — deck creative page
  creativeDirection: string
  wardrobe: string
  hairAndMakeup: string
  locations: string
  additionalNotes: string
}

// ─── Products & Styling ───────────────────────────────────────────────────────

export interface ProductUSP {
  id: string
  text: string
}

export interface Product {
  id: string
  name: string
  imageId: string       // FITTING image — garment worn / on model (legacy: the product image)
  flatlayImageId: string // FLATLAY image — garment laid flat (packshot); '?? "" ' on legacy rows
  usps: ProductUSP[]
  ownership: 'own' | 'outsource' | ''
  category: string      // references a label from productCategories[]
  order: number
  createdAt: string
}

export interface Styling {
  id: string
  stylingCode: string   // e.g. 'AW26-IL-01'
  name: string          // "Shot in" — where/how the styling is used
  imageId: string       // IndexedDB key for the styling reference image
  productIds: string[]  // references to Product.id
  modelIds: string[]    // references to Model.id
  order: number
  createdAt: string
}

// ─── Shoot project ────────────────────────────────────────────────────────────

export interface ShootProject {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string

  // Brief details (dashboard editable block)
  briefDetails: ShootBriefDetails

  // Shot brief (full brief page)
  shootBrief: ShootBriefSection

  // Section reference images (wardrobe, HMU, locations)
  wardrobeImages: MoodboardItem[]
  hairAndMakeupImages: MoodboardItem[]
  locationsImages: MoodboardItem[]

  // Products & Styling
  products: Product[]
  stylings: Styling[]
  productCategories: string[]

  // Data collections
  tasks: Task[]
  milestones: TimelineMilestone[]
  dayOfSlots: DayOfSlot[]
  totalBudget: number
  budgetItems: BudgetItem[]
  vendors: Vendor[]
  crewMembers: CrewMember[]
  models: Model[]
  shots: Shot[]
  ddayRows: DDayTimelineRow[]
  moodboardItems: MoodboardItem[]
  briefMoodboardItems: MoodboardItem[]  // separate moodboard for the Shot Brief page
  tags: Tag[]
  colours: ColourSwatch[]
  props: Prop[]
}
