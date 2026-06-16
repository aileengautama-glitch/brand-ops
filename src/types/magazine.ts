import type { BudgetItem, Task } from '@/types/common'

// ─── Re-export shared types used by magazine pages ────────────────────────────
export type { BudgetItem, Task }

// ─── Status / enum types ──────────────────────────────────────────────────────

export type MagazineProjectStatus = 'planning' | 'production' | 'review' | 'published'

export type ArticleType   = 'article' | 'interview' | 'column' | 'feature' | 'ad'
export type ArticleStatus = 'idea' | 'drafting' | 'review' | 'final'

export type GraphicStatus = 'brief' | 'design' | 'review' | 'final'

export type SpreadContentType = 'editorial' | 'article' | 'ad' | 'blank'
export type SpreadStatus      = 'empty' | 'planned' | 'laid-out' | 'final'

export type OutreachType   = 'contributor' | 'photographer' | 'advertiser' | 'stylist' | 'other'
export type OutreachStatus = 'prospecting' | 'contacted' | 'confirmed' | 'declined'

// ─── Section entity interfaces ────────────────────────────────────────────────

/**
 * A single piece of written content planned for the issue.
 * Status mirrors a lightweight editorial workflow: idea → drafting → review → final.
 */
export interface Article {
  id: string
  title: string
  type: ArticleType
  author: string            // free-text writer name (fallback / external contributor)
  assignedWriterId: string  // MagazineTeamMember.id — interchangeable, '' = use author
  section: string           // free-text grouping within the issue, '' = unsectioned
  brief: string             // editorial angle / brief to the writer (separate from notes)
  body: string              // long-form draft content (the writing area)
  wordCountTarget: number   // 0 = unset
  wordCountActual: number   // 0 = untracked; auto-derived from body while drafting
  deadline: string          // ISO date string, '' if unset
  status: ArticleStatus
  notes: string             // status updates, revision notes
  // ── Single-approver sign-off model ─────────────────────────────────────────
  approverId: string        // MagazineTeamMember.id designated to sign off, '' = unset
  approvedById: string      // app user id who finalised the article, '' if not approved
  approvedByName: string    // name snapshot at sign-off
  approvedAt: string        // ISO timestamp of sign-off, '' if not approved
  order: number
  createdAt: string
}

// ─── Writing workspace sub-types (V1.5) ───────────────────────────────────────

export type ArticleNoteKind   = 'comment' | 'suggestion'
export type ArticleNoteStatus = 'open' | 'approved' | 'rejected'

/**
 * A single item in an article's discussion thread.
 *   kind === 'comment'    → general editorial discussion
 *   kind === 'suggestion' → a proposed revision to the copy
 * Approval is per-item: status moves open → approved | rejected, and the
 * resolver (who + when) is snapshotted so the decision is auditable.
 * Stored as a flat array on the project, keyed by articleId.
 */
/**
 * Optional document-review anchor tying a comment to a text range in the body.
 * `quote` is the durable anchor (the selected text snapshot); start/end are offset
 * hints into the body at post time. On locate, offsets are verified against `quote`
 * and re-found by substring search if the body has since changed.
 */
export interface ArticleCommentAnchor {
  start: number
  end: number
  quote: string
}

export interface ArticleComment {
  id: string
  articleId: string
  kind: ArticleNoteKind
  authorId: string        // app user id, '' if unknown
  authorName: string      // name snapshot at post time (survives roster edits)
  body: string
  status: ArticleNoteStatus
  resolvedById: string    // who approved/rejected, '' while open
  resolvedByName: string
  resolvedAt: string      // ISO, '' while open
  createdAt: string
  anchor?: ArticleCommentAnchor  // optional — present when attached to selected text
}

/**
 * A readable point-in-time snapshot of an article's body.
 * Backtracking = copy `body` back onto the live article (the page snapshots
 * the current body first, so restores are non-destructive).
 */
export interface ArticleVersion {
  id: string
  articleId: string
  label: string           // e.g. "v3" or "Draft sent to Sarah"
  body: string
  wordCount: number       // computed at snapshot time — readable, no recompute
  authorId: string
  authorName: string
  note: string            // optional "what changed" note
  createdAt: string
}

/**
 * A simple writer time-log entry. Project-scoped; articleId links it to a
 * specific piece ('' = general). billable is optional accounting context.
 */
export interface WriterHoursEntry {
  id: string
  date: string            // ISO date
  hours: number
  note: string
  articleId: string       // '' = unlinked / general
  writerId: string        // MagazineTeamMember.id, '' if unset
  billable: boolean
  createdAt: string
}

/**
 * A single tile in the Visual mood board.
 * When imageId is non-empty the tile renders as an image thumbnail.
 * When imageId is '' and color is set the tile renders as a solid color swatch.
 * Both fields may co-exist (image with tinted background is a future use case).
 */
export interface MoodTile {
  id: string
  imageId: string   // IndexedDB key — '' for color-swatch-only tiles
  caption: string
  color: string     // hex string e.g. '#C4B5A3' — '' if not set
  order: number
  createdAt: string
}

/**
 * A design deliverable (cover, spread layout, ad, infographic, etc.).
 * Intentionally simpler than CollateralItem: free-text format field,
 * no contract/approval sub-flow in V1.
 * Up to 4 reference images stored as an ordered array of IndexedDB keys.
 * Cross-links (articleId, moodTileId) are plain ID strings — no FK enforcement in V1.
 */
export interface Graphic {
  id: string
  title: string
  formatDetail: string     // free text: "A4 portrait · Print + Digital", "1080×1350 px", etc.
  assignee: string
  status: GraphicStatus
  previewImageId: string   // deliverable preview / latest screenshot (IndexedDB key), '' if none
  imageIds: string[]       // up to 4 reference images (IndexedDB keys), [] if none
  brief: string            // design brief / direction notes (separate from revision notes)
  notes: string            // revision notes / status updates
  order: number
  createdAt: string
  // ── Cross-links ('' = not linked) ──────────────────────────────────────────
  articleId: string        // optional backlink to a Writing Article within this project
  visualProjectId: string  // optional backlink to a Visual production project
  moodTileId: string       // optional link to a Visual MoodTile (inspiration)
  dropboxLink: string      // legacy single asset link — migrated into resultLinks
  resultLinks: VisualResultLink[]  // delivery / final asset links (Dropbox, selects, Figma…)
}

/**
 * A single tile in the Graphics section's inspiration board.
 * Section-level inspiration kept separate from the deliverables grid, but visible
 * in the same section. image + caption + optional source URL.
 */
export interface GraphicsInspoItem {
  id: string
  imageId: string          // IndexedDB key, '' if not yet uploaded
  caption: string
  sourceUrl: string        // optional link to where the inspiration came from
  order: number
  createdAt: string
}

export type SpreadLinkType = 'article' | 'visual' | 'graphic'

/**
 * A relational link from a spread to a content item:
 *   article → Article (Writing) · visual → VisualProject · graphic → Graphic.
 * A spread can carry several links across all three categories.
 */
export interface SpreadLink {
  id: string
  type: SpreadLinkType
  refId: string              // id of the linked Article / VisualProject / Graphic in this project
}

/**
 * A page or spread in the issue's page plan — the issue's expandable table of contents.
 * `links` connect the spread to the Writing / Visual / Graphics items that belong on it.
 * `section` is the editorial TOC category; `ownerId` is the responsible team member.
 */
export interface Spread {
  id: string
  pages: string              // free text: "p.1", "p.2–3", "Inside Cover", etc.
  contentType: SpreadContentType
  section: string            // editorial section / TOC category, '' = uncategorised
  ownerId: string            // MagazineTeamMember.id responsible, '' = none
  links: SpreadLink[]        // related Writing / Visual / Graphics items (multiple allowed)
  status: SpreadStatus
  notes: string
  order: number
  createdAt: string
}

/**
 * A person or organisation being approached for the issue — contributors,
 * photographers, advertisers, stylists, etc.
 * Intentionally separate from Vendor: different status vocabulary, no contractStatus,
 * adds fee field. Future Supabase migration will create a dedicated outreach table.
 */
export interface OutreachContact {
  id: string
  name: string
  type: OutreachType
  status: OutreachStatus
  contactInfo: string
  fee: string        // free text: "€500/day", "£2,000 flat", "TBC", etc.
  articleId: string  // Article.id this person is contributing to, '' if none
  role: string       // free text: "Cover photographer", "Beauty writer", "Full-page ad", etc.
  notes: string
  createdAt: string
}

/**
 * A member of the magazine production team.
 * Intentionally simpler than EventProject's TeamMember — no departments or permissions,
 * just a name, role, and email so tasks can be assigned and outreach linked to a person.
 */
export interface MagazineTeamMember {
  id: string
  name: string
  role: string       // free text: "Creative Director", "Photographer", "Copywriter", etc.
  email: string
  createdAt: string
}

/**
 * A named group of mood tiles (reference images + colour swatches).
 * In Batch 1 this type is defined but NOT yet wired into MagazineProject —
 * the flat `moodTiles` array is retained until Batch 3 completes the migration.
 * Each set gets its own section in MagazineVisual once Batch 3 lands.
 */
export interface VisualSet {
  id: string
  name: string        // e.g. "Cover shoot — moody", "Editorial — pastel"
  description: string
  moodTiles: MoodTile[]
  order: number
  createdAt: string
}

// ─── Visual production projects ────────────────────────────────────────────────

export type VisualProjectStatus = 'planning' | 'scheduled' | 'shot' | 'delivered'

/** A single planned image/shot within a visual production project (compact). */
export interface VisualShot {
  id: string
  title: string                 // shot name / short description
  description: string
  status: 'planned' | 'shot'
  order: number
  createdAt: string
}

/** A delivery / results link — Dropbox folder, selects gallery, final retouched set, etc. */
export interface VisualResultLink {
  id: string
  label: string
  url: string
}

/**
 * A compact, shoot-style visual production project nested under a magazine issue.
 * Deliberately lighter than the Shoots module: it tracks the production lifecycle,
 * a simple shot list, and delivery links — without crew/models/call-sheets/budget.
 * Inspiration lives in the issue mood board, which is kept separate.
 */
export interface VisualProject {
  id: string
  name: string
  concept: string               // short brief / concept line
  status: VisualProjectStatus
  shootDate: string             // ISO date, '' if unset
  location: string
  assignedTo: string            // MagazineTeamMember.id (lead / photographer), '' = none
  articleId: string             // linked Writing article, '' = none
  shots: VisualShot[]
  resultLinks: VisualResultLink[]
  notes: string
  order: number
  createdAt: string
  updatedAt: string
}

// ─── Task layer ────────────────────────────────────────────────────────────────

export type MagazineTaskLinkType = 'none' | 'article' | 'visual' | 'graphic' | 'spread'

export const MAGAZINE_TASK_SECTIONS = [
  'Writing', 'Visual', 'Graphics', 'Spread', 'Outreach', 'Production',
] as const

/**
 * A task in the Magazine task board. Extends the shared Task model so it reuses the
 * same todo / in_progress / done workflow, priority, assignee, and due date used
 * across Events and Shoots — no separate task vocabulary is invented. It adds a thin
 * magazine layer: an optional section owner (mirrors the real magazine tabs), a link
 * to a piece of magazine content, and a manual `order` for reorder controls.
 */
export interface MagazineTask extends Task {
  section: string                 // optional workflow owner: '' | one of MAGAZINE_TASK_SECTIONS
  linkType: MagazineTaskLinkType  // which kind of content this task is about
  linkId: string                  // id of the linked entity within this project, '' if none
  order: number                   // manual ordering within its group
}

/**
 * A final / print-ready deliverable file uploaded to the issue (PDF-first).
 * Bytes live in the IndexedDB `files` store keyed by `id`; this is the metadata.
 * `isCurrent` marks the single current print-ready asset. Local-only in V1
 * (no Supabase sync) — a content array on the project, like the others.
 */
export interface PrintFile {
  id: string          // IndexedDB `files` store key (and React key)
  name: string        // original filename
  mimeType: string    // e.g. 'application/pdf'
  sizeBytes: number
  isCurrent: boolean  // the current final / print-ready asset
  createdAt: string
}

// ─── Root project type ────────────────────────────────────────────────────────

export interface MagazineProject {
  id: string
  name: string
  description: string
  editionNumber: string       // free text: "Issue 12", "Vol. 3 No. 2", "Spring 2026"
  publicationDate: string     // ISO date string, '' if unset
  theme: string               // issue theme / concept line
  status: MagazineProjectStatus
  createdAt: string
  updatedAt: string

  // ── Team & tasks ──────────────────────────────────────────────────────────
  teamMembers: MagazineTeamMember[]
  tasks: MagazineTask[]

  // ── Section data ──────────────────────────────────────────────────────────
  articles: Article[]
  moodTiles: MoodTile[]          // Visual — inspiration mood board (kept separate)
  visualProjects: VisualProject[] // Visual — shoot-style production projects
  graphics: Graphic[]
  graphicsInspo: GraphicsInspoItem[] // Graphics — section inspiration board
  spreads: Spread[]
  outreach: OutreachContact[]

  // ── Writing workspace data (flat, keyed by articleId) ──────────────────────
  articleComments: ArticleComment[]
  articleVersions: ArticleVersion[]
  writerHours: WriterHoursEntry[]

  // Budget — reuses BudgetItem from common (same shape as Events + Shoots)
  totalBudget: number
  budgetItems: BudgetItem[]

  // Ready-to-print / final deliverable files (PDF-first). Local-only (V1).
  printFiles: PrintFile[]

  // Board notes — free-text creative brief / overall issue notes
  notes: string
}
