-- Phase E5 — normalized models table
--
-- Models are per-project entities with rich structured data (measurements, notes,
-- agency).  They are referenced by ID from two soft-ref locations:
--
--   styling_item_models.model_id TEXT  — soft ref (FK upgrade deferred to E5B)
--   DDayTimelineRow.modelIds TEXT[]    — inside project_sections JSONB (stays soft)
--
-- No RLS, consistent with all other tables in this migration set.
-- Depends on: 001_initial_schema.sql (projects table).

CREATE TABLE IF NOT EXISTS models (
  id                   uuid        PRIMARY KEY,
  project_id           uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name                 text        NOT NULL DEFAULT '',
  agency               text        NOT NULL DEFAULT '',
  image_id             text        NOT NULL DEFAULT '',   -- IndexedDB key (soft ref → media table)
  height               text        NOT NULL DEFAULT '',
  shoe_size            text        NOT NULL DEFAULT '',
  apparel_size         text        NOT NULL DEFAULT '',
  dress_size           text        NOT NULL DEFAULT '',
  general_measurements text        NOT NULL DEFAULT '',
  notes                text        NOT NULL DEFAULT '',
  sort_order           bigint      NOT NULL DEFAULT 0,    -- array-index-based order; no reorder UI yet
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS models_project_idx ON models (project_id);

-- ─── E5B (deferred) ────────────────────────────────────────────────────────────
-- When all styling_item_models rows carry UUID model_ids (seed refs cleaned up),
-- run this to upgrade the soft ref to a real FK with cascade delete:
--
--   DELETE FROM styling_item_models WHERE model_id NOT IN (SELECT id::text FROM models);
--   ALTER TABLE styling_item_models ALTER COLUMN model_id TYPE uuid USING model_id::uuid;
--   ALTER TABLE styling_item_models
--     ADD CONSTRAINT fk_sim_model FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;
