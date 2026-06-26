-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase E4A: normalized products
-- Migration: 007_products
--
-- Paste into Supabase SQL Editor → Run.
--
-- First normalized (relational) slice of Products & Styling.  Unlike the JSON
-- section blobs (project_sections), products get one ROW each so future styling
-- links (styling_item_products) can use real foreign keys with cascade deletes.
--
-- This migration creates ONLY the products table.  styling_items and the join
-- tables come in later batches (E4C/E4D) once the product foundation is proven.
--
-- Notes:
--   • id reuses the local Product.id (a UUID for products created post-Phase-B;
--     seed/legacy non-UUID products stay local-only and are skipped by the sync).
--   • image_id is a SOFT reference to the media/IndexedDB key (no FK) — same as
--     shots/etc. Media assets already sync via the media table (D1–D4).
--   • usps stays JSONB: an owned 1:1 ordered list, never queried relationally.
--   • sort_order is BIGINT: Product.order is Date.now() (~1.7e12) > int4 max.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id          uuid        PRIMARY KEY,
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        text        NOT NULL DEFAULT '',
  category    text        NOT NULL DEFAULT '',
  ownership   text        NOT NULL DEFAULT '' CHECK (ownership IN ('own', 'outsource', '')),
  image_id    text        NOT NULL DEFAULT '',     -- FITTING image — media/IndexedDB key (soft ref)
  flatlay_image_id text   NOT NULL DEFAULT '',     -- FLATLAY image — media/IndexedDB key (soft ref)
  usps        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  sort_order  bigint      NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_project_idx ON products (project_id);

COMMENT ON TABLE  products           IS 'Normalized product records (Phase E4). One row per product; future styling links reference these via FK.';
COMMENT ON COLUMN products.image_id  IS 'Soft reference to the media/IndexedDB image key (no FK). Asset itself syncs via the media table.';
COMMENT ON COLUMN products.usps      IS 'Owned 1:1 ordered list [{id,text}] — JSONB, not normalized (never queried relationally).';
COMMENT ON COLUMN products.sort_order IS 'Mirrors local Product.order (Date.now()-based) — BIGINT to fit.';
