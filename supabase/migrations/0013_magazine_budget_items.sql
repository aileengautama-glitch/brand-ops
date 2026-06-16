-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase 5L: magazine budget items content table
-- Migration: 0013_magazine_budget_items
--
-- Paste into Supabase SQL Editor → Run.
--
-- Ninth magazine content slice. Budget line items (the shared BudgetItem shape) for a
-- magazine issue. One row per item, project-scoped, cascade-deleted with the project.
--
-- SEPARATE from any event/shoot budget handling. The shared BudgetItem TYPE is reused
-- only for its field shape + enum VALUES (status) in the CHECK below — nothing in the
-- shared/event/shoot budget code is touched. totalBudget is NOT here (it is a project
-- summary field, synced separately in Phase 5B via magazine_project_meta.total_budget).
--
-- BudgetItem has NO order and NO updatedAt fields, so there is intentionally no
-- sort_order and no app_updated_at column here.
--
-- BLOB BOUNDARY: invoice_file_id is a SOFT reference (IndexedDB key for the stored
-- invoice Blob) ONLY. The Blob bytes are never stored here — they live in IndexedDB.
-- invoice_file_name is just the display name.
--
-- Read-first + dual-write (same pattern as 0005–0012). Empty table → reads fall back
-- to the local store.
--
-- Notes:
--   • id reuses the local BudgetItem.id (UUID for app-created; seed/legacy non-UUID
--     ids stay local-only and are skipped by the sync).
--   • project_id FKs projects(id) ON DELETE CASCADE (same as the sibling tables).
--   • status is text + CHECK, pinned to the shared BudgetItemStatus domain.
--   • category is free text (no enum in the shared type) → no CHECK.
--   • estimated_cost / actual_cost are numeric (money).
--   • invoice_file_id is NULLABLE text soft ref (no FK); the app maps '' ↔ NULL.
--   • RLS intentionally deferred (consistent with the other content tables).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS magazine_budget_items (
  id                uuid        PRIMARY KEY,
  project_id        uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description       text        NOT NULL DEFAULT '',
  category          text        NOT NULL DEFAULT '',     -- free text (no enum)
  supplier          text        NOT NULL DEFAULT '',
  estimated_cost    numeric     NOT NULL DEFAULT 0,
  actual_cost       numeric     NOT NULL DEFAULT 0,
  status            text        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'paid')),
  notes             text        NOT NULL DEFAULT '',
  invoice_file_name text        NOT NULL DEFAULT '',     -- display name
  invoice_file_id   text,                                -- soft ref (IndexedDB blob key), nullable; bytes NOT stored
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()   -- DB write marker (no app updatedAt on this entity)
);

CREATE INDEX IF NOT EXISTS magazine_budget_items_project_idx ON magazine_budget_items (project_id);

COMMENT ON TABLE  magazine_budget_items                 IS 'Magazine budget line items (Phase 5L). One row per item; project-scoped, cascade-deleted. totalBudget is separate (magazine_project_meta, Phase 5B).';
COMMENT ON COLUMN magazine_budget_items.invoice_file_id IS 'SOFT reference to an IndexedDB blob key for the invoice (no FK). Blob bytes live in IndexedDB — never here. NULL when no invoice.';
