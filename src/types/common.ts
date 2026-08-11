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
  /** Waiting on this approval — cleared (released) when it is approved. */
  blockedByApprovalId?: string
}

/**
 * What a milestone's deadline counts back from.
 *   'none'   → manually typed date (legacy behaviour; `date` is authoritative)
 *   'shoot'  → shoot date · 'launch' → launch date · 'event' → event/install date
 * Pre-production counts back from the shoot/event date; post-production and
 * offline work count back from the launch date.
 */
export type MilestoneAnchor = 'none' | 'shoot' | 'launch' | 'event'

export interface TimelineMilestone {
  id: string
  title: string
  date: string          // ISO date string — manual date, or the fallback when no anchor is set
  description: string
  notes: string
  relatedTaskIds: string[]
  order: number
  // ── Scheduling engine (optional → legacy rows keep working unchanged) ──
  anchorType?: MilestoneAnchor  // undefined = 'none'
  offsetDays?: number           // days BEFORE the anchor (28 = "28 days before")
  owner?: string                // named owner — a gate should never be unowned
  completed?: boolean           // a gate is cleared, not just dated
  completedAt?: string          // ISO timestamp — set when completed flips true
}

/**
 * A decision that needs someone's sign-off — the alternative to "approval by
 * message". Each carries its options, a stated recommendation, the cost impact
 * and a needed-by date, so the approver can answer in one pass. Once decided it
 * records who decided and when, making the list double as a decision log.
 */
/**
 * 'decided' is the legacy Phase-1 value and is still accepted on read; new
 * approvals resolve to approved / declined / changed.
 */
export type ApprovalStatus = 'open' | 'approved' | 'declined' | 'changed' | 'decided'

export interface ApprovalOption {
  id: string
  label: string
  /** Cost impact of THIS option, free text (e.g. '+$450', 'no change'). */
  costImpact: string
}

/**
 * A project field this approval writes to when it is approved. `field` is a key
 * into the per-module registry in lib/approvalTargets.ts, which owns the actual
 * read/write so nothing here has to know the project shape.
 */
export interface ApprovalTarget {
  id: string
  field: string       // ApprovalFieldKey — e.g. 'budget.total', 'brief.location'
  value: string       // the value written on approval
}

/** One recorded field change, so every automatic update is auditable. */
export interface ApprovalChange {
  id: string
  at: string          // ISO timestamp
  by: string
  label: string       // human label of what changed
  oldValue: string
  newValue: string
}

export interface Approval {
  id: string
  title: string             // the question being asked
  category: string          // e.g. Budget, Crew, Location, Photographer, Model
  options: ApprovalOption[]
  recommendation: string    // the stated recommendation (id of an option, or free text)
  costImpact: string        // overall cost impact summary
  neededBy: string          // ISO date — when the answer is required
  status: ApprovalStatus
  decidedBy: string
  decidedOn: string         // ISO date — stamped when the approval is resolved
  outcome: string           // what was actually decided
  notes: string
  order: number
  createdAt: string
  // ── Automatic updates (all optional → Phase 1 rows keep working) ──
  /** Project fields written when this is approved. */
  targets?: ApprovalTarget[]
  /** Milestones marked complete when this is approved. */
  linkedGateIds?: string[]
  /** Tasks released (unblocked) when this is approved. */
  linkedTaskIds?: string[]
  /** Audit trail of every field change this approval caused. */
  changeLog?: ApprovalChange[]
}

/** @deprecated Phase 1 name — kept so existing imports keep compiling. */
export type Decision = Approval
export type DecisionOption = ApprovalOption
export type DecisionStatus = ApprovalStatus

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
