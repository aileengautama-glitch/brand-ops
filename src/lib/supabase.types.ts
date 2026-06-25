/**
 * Supabase database types — hand-written from 001_initial_schema.sql.
 *
 * To regenerate after schema changes, run once you have a personal access
 * token (supabase.com/dashboard/account/tokens):
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx npx supabase gen types typescript \
 *     --project-id tzsyzrsecvldjynelqvf \
 *     > src/lib/supabase.types.ts
 *
 * Until then this hand-written version keeps TypeScript happy and reflects
 * the exact tables in 001_initial_schema.sql.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Enums (mirroring DB check constraints) ───────────────────────────────────

// DB-level module taxonomy. Widened to include 'magazine' after the 0004
// reconciliation: the EXISTING projects.module (text + CHECK) now allows
// event|shoot|magazine, and access_grants/magazine_project_meta carry the same
// value via the composite FK → projects(id, module). NOTE: this is the DB row
// taxonomy ONLY; the content-repo ProjectModule in repositories/_types.ts stays
// event|shoot (it routes event/shoot content paths and must not see magazine).
export type ProjectModule = 'event' | 'shoot' | 'magazine'
export type ProjectStatus = 'active' | 'archived'
export type TaskStatus    = 'todo' | 'in_progress' | 'done'
export type TaskPriority  = 'low' | 'normal' | 'high'
export type CommentEntityType = 'task' | 'shot' | 'collateral'

// ─── Table row types ──────────────────────────────────────────────────────────
// NOTE: must be `type` aliases, not `interface` declarations.
// TypeScript does not give interface types an implicit index signature, so
// `interface Foo { id: string }` fails the `Record<string, unknown>` constraint
// inside GenericTable (required by @supabase/postgrest-js). `type` aliases have
// a wider structural compatibility and pass the constraint correctly.

export type ProfileRow = {
  id:           string       // uuid
  name:         string
  email:        string | null
  role:         string
  initials:     string
  avatar_color: string
  created_at:   string       // timestamptz → ISO string
}

export type ProjectRow = {
  id:          string
  module:      ProjectModule
  name:        string
  description: string
  status:      ProjectStatus
  created_by:  string | null // uuid FK → profiles.id
  created_at:  string
  updated_at:  string
}

export type ProjectMembershipRow = {
  id:               string
  project_id:       string
  user_id:          string
  member_record_id: string | null
  created_at:       string
}

export type TaskRow = {
  id:          string
  project_id:  string
  title:       string
  description: string
  status:      TaskStatus
  priority:    TaskPriority
  due_date:    string | null  // date → ISO string
  assigned_to: string         // project member record ID
  sort_order:  number
  created_at:  string
  updated_at:  string
}

export type CommentRow = {
  id:               string
  project_id:       string
  entity_type:      CommentEntityType
  entity_id:        string
  author_id:        string | null     // uuid FK → profiles.id; null until Phase E
  author_local_id:  string            // local APP_USERS id — deprecated after Phase E
  body:             string
  created_at:       string
}

export type MediaRow = {
  id:             string
  local_image_id: string       // IndexedDB UUID key — unique; used as lookup key
  project_id:     string
  entity_type:    string       // 'moodboard_item' | 'reference_image' | 'shot' | etc.
  entity_id:      string       // owning entity's local id; '' until D2+
  storage_path:   string       // path within project-media bucket
  public_url:     string       // stable public URL
  filename:       string
  mime_type:      string
  size_bytes:     number | null
  caption:        string
  sort_order:     number
  created_by:     string | null
  created_at:     string
}

export type DeckSnapshotRow = {
  project_id: string
  module:     ProjectModule        // 'event' | 'shoot'
  name:       string
  payload:    Json                 // EventDeckData | ShootDeckData (see deckSnapshot.ts)
  updated_at: string
}

export type ProjectContentRow = {
  project_id: string
  module:     ProjectModule        // 'event' | 'shoot'
  content:    Json                 // EventContent | ShootContent (see projectContent.ts)
  updated_at: string
}

export type ProjectSectionRow = {
  project_id: string
  section:    string               // 'shoot_shot_list' | 'shoot_schedule' | ...
  module:     ProjectModule
  content:    Json                 // { items: [...] } (see projectSections.ts)
  updated_at: string
}

export type ProductRow = {
  id:         string
  project_id: string
  name:       string
  category:   string
  ownership:  string               // 'own' | 'outsource' | ''
  image_id:   string               // FITTING image — media/IndexedDB key (soft ref)
  flatlay_image_id: string         // FLATLAY image — media/IndexedDB key (soft ref); '' default
  usps:       Json                 // ProductUSP[] ([{id,text}])
  sort_order: number               // bigint in PG; safe-range number in JS
  created_at: string
  updated_at: string
}

// ─── Insert / Update types ────────────────────────────────────────────────────

export type ProfileInsert = Omit<ProfileRow, 'created_at'>
export type ProfileUpdate = Partial<Omit<ProfileRow, 'id' | 'created_at'>>

// id is optional (DB default: gen_random_uuid()) so callers can supply their
// own UUID or let Postgres generate one.  description / status / created_by
// also have DB defaults and are therefore optional.
export type ProjectInsert = {
  id?:          string                 // optional — defaults to gen_random_uuid()
  module:       ProjectModule          // required — no DB default
  name:         string                 // required — no DB default
  description?: string                 // optional — DB default ''
  status?:      ProjectStatus          // optional — DB default 'active'
  created_by?:  string | null          // optional — DB default null
}
export type ProjectUpdate = Partial<Omit<ProjectRow, 'id' | 'created_at' | 'updated_at'>>

export type ProjectMembershipInsert = Omit<ProjectMembershipRow, 'id' | 'created_at'>

// id optional: DB default gen_random_uuid(), but callers supply their own UUID.
export type TaskInsert = Omit<TaskRow, 'id' | 'created_at' | 'updated_at'> & { id?: string }
export type TaskUpdate = Partial<Omit<TaskRow, 'id' | 'project_id' | 'created_at' | 'updated_at'>>

// id optional for same reason; author_local_id has a DB default but we always supply it.
export type CommentInsert = Omit<CommentRow, 'id' | 'created_at'> & { id?: string }

// id optional; all other fields supplied by caller.
export type MediaInsert = Omit<MediaRow, 'id' | 'created_at'> & { id?: string }
export type MediaUpdate  = Partial<Omit<MediaRow, 'id' | 'local_image_id' | 'project_id' | 'created_at'>>

// updated_at has a DB default; callers may omit it (we let the upsert set it).
export type DeckSnapshotInsert = Omit<DeckSnapshotRow, 'updated_at'> & { updated_at?: string }
export type DeckSnapshotUpdate = Partial<Omit<DeckSnapshotRow, 'project_id'>>

export type ProjectContentInsert = Omit<ProjectContentRow, 'updated_at'> & { updated_at?: string }
export type ProjectContentUpdate = Partial<Omit<ProjectContentRow, 'project_id'>>

export type ProjectSectionInsert = Omit<ProjectSectionRow, 'updated_at'> & { updated_at?: string }
export type ProjectSectionUpdate = Partial<Omit<ProjectSectionRow, 'project_id' | 'section'>>

// id + project_id required (we always supply them); the rest have DB defaults.
export type ProductInsert = {
  id:          string
  project_id:  string
  name?:       string
  category?:   string
  ownership?:  string
  image_id?:   string
  flatlay_image_id?: string
  usps?:       Json
  sort_order?: number
  created_at?: string
  updated_at?: string
}
export type ProductUpdate = Partial<Omit<ProductRow, 'id' | 'project_id' | 'created_at'>>

// ─── Crew members (E6) ───────────────────────────────────────────────────────

export type CrewMemberRow = {
  id:         string
  project_id: string
  name:       string
  role:       string
  contact:    string
  notes:      string
  sort_order: number        // bigint in PG; safe-range number in JS
  created_at: string
  updated_at: string
}
// id + project_id required; rest have DB defaults.
export type CrewMemberInsert = {
  id:          string
  project_id:  string
  name?:       string
  role?:       string
  contact?:    string
  notes?:      string
  sort_order?: number
  created_at?: string
  updated_at?: string
}
export type CrewMemberUpdate = Partial<Omit<CrewMemberRow, 'id' | 'project_id' | 'created_at'>>

// ─── Models (E5) ─────────────────────────────────────────────────────────────

export type ModelRow = {
  id:                   string
  project_id:           string
  name:                 string
  agency:               string
  image_id:             string        // IndexedDB key (soft ref → media table)
  height:               string
  shoe_size:            string
  apparel_size:         string
  dress_size:           string
  general_measurements: string
  notes:                string
  sort_order:           number        // bigint in PG; safe-range number in JS
  created_at:           string
  updated_at:           string
}
// id + project_id required (we always supply them); the rest have DB defaults.
export type ModelInsert = {
  id:                    string
  project_id:            string
  name?:                 string
  agency?:               string
  image_id?:             string
  height?:               string
  shoe_size?:            string
  apparel_size?:         string
  dress_size?:           string
  general_measurements?: string
  notes?:                string
  sort_order?:           number
  created_at?:           string
  updated_at?:           string
}
export type ModelUpdate = Partial<Omit<ModelRow, 'id' | 'project_id' | 'created_at'>>

// ─── Styling (E4C/D) ──────────────────────────────────────────────────────────

export type StylingItemRow = {
  id:           string
  project_id:   string
  styling_code: string
  name:         string
  image_id:     string
  sort_order:   number
  created_at:   string
  updated_at:   string
}
export type StylingItemInsert = {
  id:            string
  project_id:    string
  styling_code?: string
  name?:         string
  image_id?:     string
  sort_order?:   number
  created_at?:   string
  updated_at?:   string
}
export type StylingItemUpdate = Partial<Omit<StylingItemRow, 'id' | 'project_id' | 'created_at'>>

export type StylingItemProductRow = {
  styling_item_id: string
  product_id:      string
  sort_order:      number
}
export type StylingItemProductInsert = {
  styling_item_id: string
  product_id:      string
  sort_order?:     number
}

export type StylingItemModelRow = {
  styling_item_id: string
  model_id:        string
  sort_order:      number
}
export type StylingItemModelInsert = {
  styling_item_id: string
  model_id:        string
  sort_order?:     number
}

// ─── Phase 1 identity/access tables (read-only in Phase 2) ────────────────────
// These mirror supabase/migrations/0002_identity_access_tables.sql (+ 0004).
// After reconciliation there is ONE projects table: access_grants.module and
// magazine_project_meta.module share the widened DB `ProjectModule` and are tied
// to projects.module via the composite FK (project_id, module). There is no
// separate `access_module` enum — module is plain text + CHECK everywhere.

export type AccessLevel  = 'none' | 'view' | 'edit'
export type PersonStatus = 'account' | 'internal' | 'external' | 'manual' | 'pending_invite'

export type PersonRow = {
  id:              string          // text PK — preserves existing string ids
  name:            string
  email:           string | null
  phone:           string | null
  status:          PersonStatus
  role:            string | null
  is_admin:        boolean
  allowed_modules: ProjectModule[] | null   // null = all modules
  initials:        string
  avatar_color:    string
  notes:           string
  login_enabled:   boolean
  auth_user_id:    string | null   // → auth.users; set in the auth phase
  created_at:      string
  updated_at:      string
}
export type PersonInsert = Omit<PersonRow, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }
export type PersonUpdate = Partial<Omit<PersonRow, 'id' | 'created_at'>>

export type MagazineProjectMetaRow = {
  project_id:       string
  module:           ProjectModule    // DB column is text+CHECK(='magazine'); Insert pins it to 'magazine'
  edition_number:   string
  publication_date: string | null  // date → ISO string
  theme:            string
  total_budget:     number
  editorial_status: string
  notes:            string
}
export type MagazineProjectMetaInsert = Omit<MagazineProjectMetaRow, 'module'> & { module?: 'magazine' }
export type MagazineProjectMetaUpdate = Partial<Omit<MagazineProjectMetaRow, 'project_id' | 'module'>>

// Magazine outreach content (Phase 5C). type/status are text+CHECK, pinned to the
// OutreachType / OutreachStatus domains. article_id is a soft backlink (no FK).
export type MagazineOutreachRow = {
  id:           string
  project_id:   string
  name:         string
  type:         string   // CHECK: contributor | photographer | advertiser | stylist | other
  status:       string   // CHECK: prospecting | contacted | confirmed | declined
  contact_info: string
  fee:          string
  article_id:   string   // soft backlink to an Article (no FK)
  role:         string
  notes:        string
  created_at:   string
  updated_at:   string
}
export type MagazineOutreachInsert = Omit<MagazineOutreachRow, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }
export type MagazineOutreachUpdate = Partial<Omit<MagazineOutreachRow, 'id' | 'project_id' | 'created_at'>>

// Magazine spreads content (Phase 5E). content_type/status are text+CHECK, pinned to
// the SpreadContentType / SpreadStatus domains. links is JSONB (SpreadLink[]); owner_id
// is a soft ref (no FK); sort_order is bigint (Spread.order is Date.now()-based).
export type MagazineSpreadRow = {
  id:           string
  project_id:   string
  pages:        string
  content_type: string   // CHECK: editorial | article | ad | blank
  section:      string
  owner_id:     string   // soft ref to MagazineTeamMember (no FK)
  links:        Json     // SpreadLink[] ([{id,type,refId}])
  status:       string   // CHECK: empty | planned | laid-out | final
  notes:        string
  sort_order:   number   // bigint in PG; safe-range number in JS
  created_at:   string
  updated_at:   string
}
// id + project_id required (always supplied); the rest have DB defaults.
export type MagazineSpreadInsert = {
  id:            string
  project_id:    string
  pages?:        string
  content_type?: string
  section?:      string
  owner_id?:     string
  links?:        Json
  status?:       string
  notes?:        string
  sort_order?:   number
  created_at?:   string
  updated_at?:   string
}
export type MagazineSpreadUpdate = Partial<Omit<MagazineSpreadRow, 'id' | 'project_id' | 'created_at'>>

// Magazine graphics content (Phase 5F). status is text+CHECK (GraphicStatus domain).
// image_ids / result_links are JSONB; preview_image_id + the cross-ref ids are nullable
// text SOFT refs (app maps '' ↔ null); sort_order is bigint. Image BYTES live in the
// media table / IndexedDB — these columns hold KEYS only.
export type MagazineGraphicRow = {
  id:                string
  project_id:        string
  title:             string
  format_detail:     string
  assignee:          string
  status:            string         // CHECK: brief | design | review | final
  preview_image_id:  string | null  // soft ref (media/IndexedDB key) — nullable
  image_ids:         Json           // string[] of media/IndexedDB keys (soft refs)
  brief:             string
  notes:             string
  article_id:        string | null  // soft backlink to an Article — nullable
  visual_project_id: string | null  // soft backlink to a VisualProject — nullable
  mood_tile_id:      string | null  // soft link to a MoodTile — nullable
  dropbox_link:      string         // legacy single asset link (migrated into result_links)
  result_links:      Json           // VisualResultLink[] ([{id,label,url}])
  sort_order:        number         // bigint in PG; safe-range number in JS
  created_at:        string
  updated_at:        string
}
// id + project_id required (always supplied); the rest have DB defaults / are nullable.
export type MagazineGraphicInsert = {
  id:                 string
  project_id:         string
  title?:             string
  format_detail?:     string
  assignee?:          string
  status?:            string
  preview_image_id?:  string | null
  image_ids?:         Json
  brief?:             string
  notes?:             string
  article_id?:        string | null
  visual_project_id?: string | null
  mood_tile_id?:      string | null
  dropbox_link?:      string
  result_links?:      Json
  sort_order?:        number
  created_at?:        string
  updated_at?:        string
}
export type MagazineGraphicUpdate = Partial<Omit<MagazineGraphicRow, 'id' | 'project_id' | 'created_at'>>

// Magazine articles content (Phase 5G — flat Article fields only; workspace arrays
// deferred). type/status text+CHECK; body text; assigned_writer_id/approver_id/
// approved_by_id nullable text soft refs (app maps '' ↔ null); approved_at + deadline
// text ('' sentinel preserved); sort_order bigint.
export type MagazineArticleRow = {
  id:                 string
  project_id:         string
  title:              string
  type:               string         // CHECK: article | interview | column | feature | ad
  author:             string
  assigned_writer_id: string | null  // soft ref — nullable
  section:            string
  brief:              string
  body:               string
  word_count_target:  number
  word_count_actual:  number
  deadline:           string         // ISO date or '' (text)
  status:             string         // CHECK: idea | drafting | review | final
  notes:              string
  approver_id:        string | null  // soft ref — nullable
  approved_by_id:     string | null  // soft ref — nullable
  approved_by_name:   string
  approved_at:        string         // ISO timestamp or '' (text)
  sort_order:         number         // bigint in PG; safe-range number in JS
  created_at:         string
  updated_at:         string
}
// id + project_id required (always supplied); the rest have DB defaults / are nullable.
export type MagazineArticleInsert = {
  id:                  string
  project_id:          string
  title?:              string
  type?:               string
  author?:             string
  assigned_writer_id?: string | null
  section?:            string
  brief?:              string
  body?:               string
  word_count_target?:  number
  word_count_actual?:  number
  deadline?:           string
  status?:             string
  notes?:              string
  approver_id?:        string | null
  approved_by_id?:     string | null
  approved_by_name?:   string
  approved_at?:        string
  sort_order?:         number
  created_at?:         string
  updated_at?:         string
}
export type MagazineArticleUpdate = Partial<Omit<MagazineArticleRow, 'id' | 'project_id' | 'created_at'>>

// Magazine visual projects content (Phase 5H). status text+CHECK; shots/result_links
// JSONB; assigned_to/article_id nullable text soft refs ('' ↔ null); shoot_date text
// (''-sentinel preserved); sort_order bigint. app_updated_at holds the app entity's
// VisualProject.updatedAt — DISTINCT from updated_at (the DB write marker).
export type MagazineVisualProjectRow = {
  id:             string
  project_id:     string
  name:           string
  concept:        string
  status:         string         // CHECK: planning | scheduled | shot | delivered
  shoot_date:     string         // ISO date or '' (text)
  location:       string
  assigned_to:    string | null  // soft ref — nullable
  article_id:     string | null  // soft backlink — nullable
  shots:          Json           // VisualShot[]
  result_links:   Json           // VisualResultLink[] ([{id,label,url}])
  notes:          string
  sort_order:     number         // bigint in PG; safe-range number in JS
  app_updated_at: string         // app entity's VisualProject.updatedAt
  created_at:     string
  updated_at:     string         // DB write marker
}
// id + project_id required (always supplied); the rest have DB defaults / are nullable.
export type MagazineVisualProjectInsert = {
  id:              string
  project_id:      string
  name?:           string
  concept?:        string
  status?:         string
  shoot_date?:     string
  location?:       string
  assigned_to?:    string | null
  article_id?:     string | null
  shots?:          Json
  result_links?:   Json
  notes?:          string
  sort_order?:     number
  app_updated_at?: string
  created_at?:     string
  updated_at?:     string
}
export type MagazineVisualProjectUpdate = Partial<Omit<MagazineVisualProjectRow, 'id' | 'project_id' | 'created_at'>>

// Magazine tasks content (Phase 5I). status/priority/link_type text+CHECK (shared
// TaskStatus/Priority + MagazineTaskLinkType domains); assigned_to/link_id nullable
// text soft refs ('' ↔ null); due_date text (''-sentinel preserved); sort_order bigint;
// app_updated_at holds MagazineTask.updatedAt (distinct from updated_at write marker).
// SEPARATE from the shared `tasks` table — the shared Task type is not touched.
export type MagazineTaskRow = {
  id:             string
  project_id:     string
  title:          string
  description:    string
  status:         string         // CHECK: todo | in_progress | done
  priority:       string         // CHECK: low | normal | high
  due_date:       string         // ISO date or '' (text)
  assigned_to:    string | null  // soft ref — nullable
  section:        string         // '' | one of MAGAZINE_TASK_SECTIONS (free-ish)
  link_type:      string         // CHECK: none | article | visual | graphic | spread
  link_id:        string | null  // soft ref — nullable
  sort_order:     number         // bigint in PG; safe-range number in JS
  app_updated_at: string         // app entity's MagazineTask.updatedAt
  created_at:     string
  updated_at:     string         // DB write marker
}
// id + project_id required (always supplied); the rest have DB defaults / are nullable.
export type MagazineTaskInsert = {
  id:              string
  project_id:      string
  title?:          string
  description?:    string
  status?:         string
  priority?:       string
  due_date?:       string
  assigned_to?:    string | null
  section?:        string
  link_type?:      string
  link_id?:        string | null
  sort_order?:     number
  app_updated_at?: string
  created_at?:     string
  updated_at?:     string
}
export type MagazineTaskUpdate = Partial<Omit<MagazineTaskRow, 'id' | 'project_id' | 'created_at'>>

// Magazine mood tiles content (Phase 5J — flat). image_id is a soft ref (IndexedDB/media
// key) stored as text, '' preserved exactly (no '' ↔ null); color text; sort_order bigint.
// No app updatedAt on this entity — only created_at and the DB updated_at write marker.
export type MagazineMoodTileRow = {
  id:         string
  project_id: string
  image_id:   string   // soft ref (IndexedDB/media key); '' for color swatches
  caption:    string
  color:      string   // hex string, '' if not set
  sort_order: number   // bigint in PG; safe-range number in JS
  created_at: string
  updated_at: string   // DB write marker
}
// id + project_id required (always supplied); the rest have DB defaults.
export type MagazineMoodTileInsert = {
  id:          string
  project_id:  string
  image_id?:   string
  caption?:    string
  color?:      string
  sort_order?: number
  created_at?: string
  updated_at?: string
}
export type MagazineMoodTileUpdate = Partial<Omit<MagazineMoodTileRow, 'id' | 'project_id' | 'created_at'>>

// Magazine graphics inspiration tiles (Phase 5K — flat). image_id is a soft ref
// (IndexedDB/media key) stored as text, '' preserved; source_url text; sort_order bigint.
// No app updatedAt — only created_at and the DB updated_at write marker.
export type MagazineGraphicsInspoRow = {
  id:         string
  project_id: string
  image_id:   string   // soft ref (IndexedDB/media key); '' if not uploaded
  caption:    string
  source_url: string
  sort_order: number   // bigint in PG; safe-range number in JS
  created_at: string
  updated_at: string   // DB write marker
}
// id + project_id required (always supplied); the rest have DB defaults.
export type MagazineGraphicsInspoInsert = {
  id:          string
  project_id:  string
  image_id?:   string
  caption?:    string
  source_url?: string
  sort_order?: number
  created_at?: string
  updated_at?: string
}
export type MagazineGraphicsInspoUpdate = Partial<Omit<MagazineGraphicsInspoRow, 'id' | 'project_id' | 'created_at'>>

// Magazine budget items (Phase 5L — shared BudgetItem shape). status text+CHECK
// (BudgetItemStatus domain); category free text; estimated/actual_cost numeric;
// invoice_file_id nullable text soft ref (IndexedDB blob key, '' ↔ null — bytes stay
// in IndexedDB). No order / no app_updated_at (those fields don't exist on BudgetItem).
// numeric columns may arrive from PostgREST as strings — the mapper coerces with Number().
export type MagazineBudgetItemRow = {
  id:                string
  project_id:        string
  description:       string
  category:          string
  supplier:          string
  estimated_cost:    number   // numeric in PG (coerced in the mapper)
  actual_cost:       number   // numeric in PG (coerced in the mapper)
  status:            string   // CHECK: pending | approved | paid
  notes:             string
  invoice_file_name: string
  invoice_file_id:   string | null  // soft ref (IndexedDB blob key) — nullable
  created_at:        string
  updated_at:        string   // DB write marker
}
// id + project_id required (always supplied); the rest have DB defaults / are nullable.
export type MagazineBudgetItemInsert = {
  id:                 string
  project_id:         string
  description?:       string
  category?:          string
  supplier?:          string
  estimated_cost?:    number
  actual_cost?:       number
  status?:            string
  notes?:             string
  invoice_file_name?: string
  invoice_file_id?:   string | null
  created_at?:        string
  updated_at?:        string
}
export type MagazineBudgetItemUpdate = Partial<Omit<MagazineBudgetItemRow, 'id' | 'project_id' | 'created_at'>>

// Magazine writer hours (Phase 5M — first writing-workspace array). Flat. date text
// ('' preserved); hours numeric (mapper coerces with Number()); billable boolean;
// article_id / writer_id nullable text SOFT refs ('' ↔ null) — article_id is NOT a hard
// FK (entries may be general). No order / no app_updated_at.
export type MagazineWriterHoursRow = {
  id:         string
  project_id: string
  date:       string
  hours:      number          // numeric in PG (coerced in the mapper)
  note:       string
  article_id: string | null   // soft ref ('' = general/unlinked) — nullable, no FK
  writer_id:  string | null   // soft ref (MagazineTeamMember) — nullable
  billable:   boolean
  created_at: string
  updated_at: string          // DB write marker
}
// id + project_id required (always supplied); the rest have DB defaults / are nullable.
export type MagazineWriterHoursInsert = {
  id:          string
  project_id:  string
  date?:       string
  hours?:      number
  note?:       string
  article_id?: string | null
  writer_id?:  string | null
  billable?:   boolean
  created_at?: string
  updated_at?: string
}
export type MagazineWriterHoursUpdate = Partial<Omit<MagazineWriterHoursRow, 'id' | 'project_id' | 'created_at'>>

// Magazine article versions (Phase 5N — second writing-workspace array, first with a
// hard article FK). Flat snapshots. article_id is a HARD FK to magazine_articles(id);
// project_id FKs projects(id). author_id nullable text soft ref ('' ↔ null). body text
// (may be large); word_count integer. Add/remove only; no order / no app_updated_at.
export type MagazineArticleVersionRow = {
  id:          string
  project_id:  string
  article_id:  string         // hard FK → magazine_articles(id)
  label:       string
  body:        string
  word_count:  number
  author_id:   string | null  // soft ref — nullable
  author_name: string
  note:        string
  created_at:  string
  updated_at:  string         // DB write marker
}
// id + project_id + article_id required (article_id is NOT NULL, no DB default).
export type MagazineArticleVersionInsert = {
  id:           string
  project_id:   string
  article_id:   string
  label?:       string
  body?:        string
  word_count?:  number
  author_id?:   string | null
  author_name?: string
  note?:        string
  created_at?:  string
  updated_at?:  string
}
export type MagazineArticleVersionUpdate = Partial<Omit<MagazineArticleVersionRow, 'id' | 'project_id' | 'created_at'>>

// Magazine article comments (Phase 5O — final content slice, third writing-workspace
// array). Mutable via resolve. article_id HARD FK → magazine_articles(id); project_id FK.
// kind/status text+CHECK; author_id/resolved_by_id nullable text soft refs ('' ↔ null);
// resolved_at text ('' sentinel); anchor nullable jsonb (ArticleCommentAnchor; undefined ↔
// null). No order / no app_updated_at.
export type MagazineArticleCommentRow = {
  id:               string
  project_id:       string
  article_id:       string         // hard FK → magazine_articles(id)
  kind:             string         // CHECK: comment | suggestion
  author_id:        string | null  // soft ref — nullable
  author_name:      string
  body:             string
  status:           string         // CHECK: open | approved | rejected
  resolved_by_id:   string | null  // soft ref — nullable
  resolved_by_name: string
  resolved_at:      string
  anchor:           Json | null    // ArticleCommentAnchor {start,end,quote} or null
  created_at:       string
  updated_at:       string         // DB write marker
}
// id + project_id + article_id required (article_id is NOT NULL, no DB default).
export type MagazineArticleCommentInsert = {
  id:                string
  project_id:        string
  article_id:        string
  kind?:             string
  author_id?:        string | null
  author_name?:      string
  body?:             string
  status?:           string
  resolved_by_id?:   string | null
  resolved_by_name?: string
  resolved_at?:      string
  anchor?:           Json | null
  created_at?:       string
  updated_at?:       string
}
export type MagazineArticleCommentUpdate = Partial<Omit<MagazineArticleCommentRow, 'id' | 'project_id' | 'created_at'>>

export type ProjectMemberRow = {
  id:           string
  project_id:   string
  person_id:    string
  project_role: string
  created_at:   string
}
export type ProjectMemberInsert = Omit<ProjectMemberRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
export type ProjectMemberUpdate = Partial<Omit<ProjectMemberRow, 'id' | 'project_id' | 'created_at'>>

export type AccessGrantRow = {
  id:          string
  person_id:   string
  module:      ProjectModule
  project_id:  string
  section_key: string            // '*' = project default
  level:       AccessLevel
  created_at:  string
}
export type AccessGrantInsert = Omit<AccessGrantRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
export type AccessGrantUpdate = Partial<Omit<AccessGrantRow, 'id' | 'person_id' | 'project_id' | 'module' | 'section_key' | 'created_at'>>

// ─── Database type (used by SupabaseClient<Database>) ─────────────────────────
// Each table entry must include `Relationships` to satisfy the
// GenericTable constraint inside @supabase/postgrest-js.  Without it the
// Relation generic degrades and Insert/Update types resolve to `never`.

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row:           ProfileRow
        Insert:        ProfileInsert
        Update:        ProfileUpdate
        Relationships: []
      }
      projects: {
        Row:           ProjectRow
        Insert:        ProjectInsert
        Update:        ProjectUpdate
        Relationships: []
      }
      project_memberships: {
        Row:           ProjectMembershipRow
        Insert:        ProjectMembershipInsert
        Update:        Partial<ProjectMembershipInsert>
        Relationships: []
      }
      tasks: {
        Row:           TaskRow
        Insert:        TaskInsert
        Update:        TaskUpdate
        Relationships: []
      }
      comments: {
        Row:           CommentRow
        Insert:        CommentInsert
        Update:        Partial<Omit<CommentRow, 'id' | 'created_at'>>
        Relationships: []
      }
      media: {
        Row:           MediaRow
        Insert:        MediaInsert
        Update:        MediaUpdate
        Relationships: []
      }
      deck_snapshots: {
        Row:           DeckSnapshotRow
        Insert:        DeckSnapshotInsert
        Update:        DeckSnapshotUpdate
        Relationships: []
      }
      project_content: {
        Row:           ProjectContentRow
        Insert:        ProjectContentInsert
        Update:        ProjectContentUpdate
        Relationships: []
      }
      project_sections: {
        Row:           ProjectSectionRow
        Insert:        ProjectSectionInsert
        Update:        ProjectSectionUpdate
        Relationships: []
      }
      products: {
        Row:           ProductRow
        Insert:        ProductInsert
        Update:        ProductUpdate
        Relationships: []
      }
      crew_members: {
        Row:           CrewMemberRow
        Insert:        CrewMemberInsert
        Update:        CrewMemberUpdate
        Relationships: []
      }
      models: {
        Row:           ModelRow
        Insert:        ModelInsert
        Update:        ModelUpdate
        Relationships: []
      }
      styling_items: {
        Row:           StylingItemRow
        Insert:        StylingItemInsert
        Update:        StylingItemUpdate
        Relationships: []
      }
      styling_item_products: {
        Row:           StylingItemProductRow
        Insert:        StylingItemProductInsert
        Update:        Partial<StylingItemProductRow>
        Relationships: []
      }
      styling_item_models: {
        Row:           StylingItemModelRow
        Insert:        StylingItemModelInsert
        Update:        Partial<StylingItemModelRow>
        Relationships: []
      }
      // ── Phase 1 identity/access tables ──────────────────────────────────────
      people: {
        Row:           PersonRow
        Insert:        PersonInsert
        Update:        PersonUpdate
        Relationships: []
      }
      magazine_project_meta: {
        Row:           MagazineProjectMetaRow
        Insert:        MagazineProjectMetaInsert
        Update:        MagazineProjectMetaUpdate
        Relationships: []
      }
      magazine_outreach: {
        Row:           MagazineOutreachRow
        Insert:        MagazineOutreachInsert
        Update:        MagazineOutreachUpdate
        Relationships: []
      }
      magazine_spreads: {
        Row:           MagazineSpreadRow
        Insert:        MagazineSpreadInsert
        Update:        MagazineSpreadUpdate
        Relationships: []
      }
      magazine_graphics: {
        Row:           MagazineGraphicRow
        Insert:        MagazineGraphicInsert
        Update:        MagazineGraphicUpdate
        Relationships: []
      }
      magazine_articles: {
        Row:           MagazineArticleRow
        Insert:        MagazineArticleInsert
        Update:        MagazineArticleUpdate
        Relationships: []
      }
      magazine_visual_projects: {
        Row:           MagazineVisualProjectRow
        Insert:        MagazineVisualProjectInsert
        Update:        MagazineVisualProjectUpdate
        Relationships: []
      }
      magazine_tasks: {
        Row:           MagazineTaskRow
        Insert:        MagazineTaskInsert
        Update:        MagazineTaskUpdate
        Relationships: []
      }
      magazine_mood_tiles: {
        Row:           MagazineMoodTileRow
        Insert:        MagazineMoodTileInsert
        Update:        MagazineMoodTileUpdate
        Relationships: []
      }
      magazine_graphics_inspo: {
        Row:           MagazineGraphicsInspoRow
        Insert:        MagazineGraphicsInspoInsert
        Update:        MagazineGraphicsInspoUpdate
        Relationships: []
      }
      magazine_budget_items: {
        Row:           MagazineBudgetItemRow
        Insert:        MagazineBudgetItemInsert
        Update:        MagazineBudgetItemUpdate
        Relationships: []
      }
      magazine_writer_hours: {
        Row:           MagazineWriterHoursRow
        Insert:        MagazineWriterHoursInsert
        Update:        MagazineWriterHoursUpdate
        Relationships: []
      }
      magazine_article_versions: {
        Row:           MagazineArticleVersionRow
        Insert:        MagazineArticleVersionInsert
        Update:        MagazineArticleVersionUpdate
        Relationships: []
      }
      magazine_article_comments: {
        Row:           MagazineArticleCommentRow
        Insert:        MagazineArticleCommentInsert
        Update:        MagazineArticleCommentUpdate
        Relationships: []
      }
      project_members: {
        Row:           ProjectMemberRow
        Insert:        ProjectMemberInsert
        Update:        ProjectMemberUpdate
        Relationships: []
      }
      access_grants: {
        Row:           AccessGrantRow
        Insert:        AccessGrantInsert
        Update:        AccessGrantUpdate
        Relationships: []
      }
    }
    Views:     Record<string, never>
    Functions: Record<string, never>
    Enums: {
      project_module:      ProjectModule
      project_status:      ProjectStatus
      task_status:         TaskStatus
      task_priority:       TaskPriority
      comment_entity_type: CommentEntityType
      access_level:        AccessLevel
      person_status:       PersonStatus
    }
  }
}
