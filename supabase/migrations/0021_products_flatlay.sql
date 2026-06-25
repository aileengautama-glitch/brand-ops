-- ============================================================================
-- 0021 — products.flatlay_image_id (additive, backward-compatible)
-- ----------------------------------------------------------------------------
-- Refinement pass: separate a product's FLATLAY image (garment laid flat /
-- packshot) from its existing FITTING image (the legacy `image_id`). Adds one
-- nullable-safe text column holding the media/IndexedDB soft key for the flatlay
-- (same contract as `image_id`; the asset itself syncs via the media table +
-- Storage, this is only the key).
--
-- Backward-compatible: existing rows default to '' (no flatlay). The local store
-- is authoritative, so flatlay already works locally before this is applied —
-- this column only lets the key sync cross-device like every other product field.
--
-- Idempotent. Apply in the Supabase SQL Editor (order: after the products table
-- migration / E4).
-- ============================================================================

alter table public.products
  add column if not exists flatlay_image_id text not null default '';
