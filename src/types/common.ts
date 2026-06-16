// ─── Enums ───────────────────────────────────────────────────────────────────

export type ModuleType = 'event' | 'shoot' | 'magazine'

export type Priority = 'low' | 'normal' | 'high'

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export type VendorStatus = 'shortlisted' | 'confirmed' | 'on_hold' | 'declined'

export type ContractStatus = 'not_sent' | 'sent' | 'signed'

export type BudgetItemStatus = 'pending' | 'approved' | 'paid'

// ─── Shared entity types ──────────────────────────────────────────────────────
// Used by both EventProject and ShootProject.

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  dueDate: string       // ISO date string, '' if unset
  assignedTo: string    // team/crew member id, '' if unassigned
  createdAt: string
  updatedAt: string
}

export interface TimelineMilestone {
  id: string
  title: string
  date: string          // ISO date string
  description: string
  notes: string
  relatedTaskIds: string[]
  order: number
}

export interface DayOfSlot {
  id: string
  timeStart: string     // e.g. '09:00'
  timeEnd: string       // e.g. '10:30'
  activity: string
  owner: string
  notes: string
  order: number
}

export interface BudgetItem {
  id: string
  description: string
  category: string
  supplier: string
  estimatedCost: number
  actualCost: number
  status: BudgetItemStatus
  notes: string
  invoiceFileName: string   // original file name for display
  invoiceFileId: string     // IndexedDB key for the stored Blob
  createdAt: string
}

export interface Vendor {
  id: string
  name: string
  category: string
  contactInfo: string
  status: VendorStatus
  contractStatus: ContractStatus
  notes: string
  createdAt: string
}

export interface MoodboardItem {
  id: string
  imageId: string       // IndexedDB key
  caption: string
  order: number
}

export interface Tag {
  id: string
  label: string
}

export interface ColourSwatch {
  id: string
  hex: string
  label: string
}

// ─── Props ────────────────────────────────────────────────────────────────────
// Shared by both EventProject and ShootProject.
// A physical or digital prop used in the event/shoot — set dressing, hero items,
// display pieces, etc.

export interface Prop {
  id: string
  name: string          // prop name / label
  imageId: string       // IndexedDB key for prop photo
  link: string          // external URL (supplier page, product link, mood ref…)
  amountNeeded: string  // free text: "3 units", "1 set", "×2"
  useCase: string       // brief description: where / how it's used
  notes: string
  order: number
  createdAt: string
}

// ─── Comments ─────────────────────────────────────────────────────────────────
// Attached to any entity; stored in a separate comment store keyed by entity.
// `mentions` is reserved for future @mention support.

export type CommentEntityType = 'task' | 'shot' | 'collateral'

export interface Comment {
  id: string
  /**
   * The project that owns the entity this comment is attached to.
   * Required for Supabase sync (comments.project_id FK).
   * Always set on new comments; may be '' on pre-Phase-C local data.
   */
  projectId: string
  entityType: CommentEntityType
  entityId: string
  authorUserId: string
  body: string
  createdAt: string
  mentions?: string[]   // user IDs — not yet wired to UI
}
