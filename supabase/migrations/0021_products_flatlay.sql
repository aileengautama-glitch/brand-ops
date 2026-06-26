-- ============================================================================
-- 0021 — products.flatlay_image_id (additive, backward-compatible, guarded)
-- ----------------------------------------------------------------------------
-- Refinement pass: separate a product's FLATLAY image (garment laid flat /
-- packshot) from its existing FITTING image (the legacy `image_id`). Adds one
-- text column holding the media/IndexedDB soft key for the flatlay (same contract
-- as `image_id`; the asset syncs via the media table + Storage — this is the key).
--
-- GUARDED: only alters `products` if that table exists. The normalized products
-- table (supabase/007_products.sql) is optional and may not be applied in every
-- environment — there, Products/Styling are local-only and this is a safe no-op.
-- The column is also baked into 007_products.sql, so a fresh products table
-- already includes it.
--
-- Backward-compatible: existing rows default to ''. The local store is
-- authoritative, so flatlay already works locally before this is applied.
--
-- Idempotent + safe to run anytime. Apply in the Supabase SQL Editor.
-- ============================================================================

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'products'
  ) then
    alter table public.products
      add column if not exists flatlay_image_id text not null default '';
  else
    raise notice 'Skipping: public.products does not exist (products are local-only here). The column is included in 007_products.sql for when the table is created.';
  end if;
end $$;
