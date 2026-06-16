-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase E4C/D: normalized styling + relational join tables
-- Migration: 008_styling
--
-- Paste into Supabase SQL Editor → Run.  (Run 007_products first.)
--
-- Completes the relational Products & Styling model:
--   styling_items          — one row per styling card (scalar fields + image)
--   styling_item_products  — m:n styling↔products, REAL FK to products (cascade)
--   styling_item_models    — m:n styling↔models, SOFT model_id (models not yet
--                            remote-backed; no FK until they migrate)
--
-- The join tables preserve membership order via sort_order.  Deleting a product
-- now cascades to its styling links automatically (the relational payoff).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS styling_items (
  id           uuid        PRIMARY KEY,
  project_id   uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  styling_code text        NOT NULL DEFAULT '',
  name         text        NOT NULL DEFAULT '',     -- "Shot in" (free text)
  image_id     text        NOT NULL DEFAULT '',     -- dedicated styling image (soft ref)
  sort_order   bigint      NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS styling_items_project_idx ON styling_items (project_id);

CREATE TABLE IF NOT EXISTS styling_item_products (
  styling_item_id uuid   NOT NULL REFERENCES styling_items(id) ON DELETE CASCADE,
  product_id      uuid   NOT NULL REFERENCES products(id)      ON DELETE CASCADE,
  sort_order      bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (styling_item_id, product_id)
);
CREATE INDEX IF NOT EXISTS sip_styling_idx ON styling_item_products (styling_item_id);

CREATE TABLE IF NOT EXISTS styling_item_models (
  styling_item_id uuid   NOT NULL REFERENCES styling_items(id) ON DELETE CASCADE,
  model_id        text   NOT NULL,                 -- soft ref (models local-only)
  sort_order      bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (styling_item_id, model_id)
);
CREATE INDEX IF NOT EXISTS sim_styling_idx ON styling_item_models (styling_item_id);

COMMENT ON TABLE styling_items         IS 'Normalized styling cards (Phase E4C). Scalar fields; links live in the join tables.';
COMMENT ON TABLE styling_item_products IS 'm:n styling↔products. product_id has a real FK (cascade) — deleting a product removes its links.';
COMMENT ON TABLE styling_item_models   IS 'm:n styling↔models. model_id is a SOFT ref (no FK) until models are remote-backed.';
