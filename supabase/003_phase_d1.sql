-- ─────────────────────────────────────────────────────────────────────────────
-- Brand Ops — Phase D1: media/files foundations
-- Migration: 003_phase_d1
--
-- Paste into Supabase SQL Editor → Run.
--
-- What this adds:
--   1. project-media Storage bucket (public, 20 MB file limit)
--   2. Storage RLS policies (anon upload allowed until Phase E auth)
--   3. media metadata table — one row per uploaded file, keyed by
--      local_image_id so the client can resolve a Supabase public URL
--      for any legacy IndexedDB imageId string
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Storage bucket ─────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-media',
  'project-media',
  true,                          -- public: any URL is readable without auth
  20971520,                      -- 20 MB per file
  ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;


-- ── 2. Storage RLS policies ───────────────────────────────────────────────────
-- Pre-Phase-E: allow anon + authenticated for all operations.
-- Phase E will replace these with user-scoped policies.

CREATE POLICY "project-media: public read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'project-media');

CREATE POLICY "project-media: anon upload"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'project-media');

CREATE POLICY "project-media: anon update"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'project-media');

CREATE POLICY "project-media: anon delete"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'project-media');


-- ── 3. Media metadata table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS media (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Bridge to the legacy IndexedDB key stored in Zustand.
  -- UNIQUE so the client can resolve a public URL from any imageId string.
  local_image_id text        NOT NULL UNIQUE,

  project_id     uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- What kind of entity owns this image.
  -- Examples: 'moodboard_item', 'reference_image', 'shot', 'product', etc.
  entity_type    text        NOT NULL DEFAULT '',

  -- The local ID of the owning entity (MoodboardItem.id, Shot.id, etc.).
  -- Empty string for Phase D1; populated in D2-D4 as surfaces are migrated.
  entity_id      text        NOT NULL DEFAULT '',

  -- Storage path within the project-media bucket: {projectId}/{localImageId}
  storage_path   text        NOT NULL,

  -- Cached public URL — stable for public buckets; no signed-URL expiry needed.
  public_url     text        NOT NULL,

  filename       text        NOT NULL DEFAULT '',
  mime_type      text        NOT NULL DEFAULT '',
  size_bytes     integer,

  -- Caption used by moodboard / reference entity types.
  -- Empty for entity types that carry their caption at the entity level.
  caption        text        NOT NULL DEFAULT '',

  -- Client-side sort order (mirrors the entity's order field).
  sort_order     integer     NOT NULL DEFAULT 0,

  -- Nullable until Phase E introduces Supabase Auth.
  created_by     uuid        REFERENCES profiles(id) ON DELETE SET NULL,

  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Fast project-level lookups (list all media for a project)
CREATE INDEX IF NOT EXISTS media_project_id_idx     ON media (project_id);

-- Fast entity-level lookups (list all images for a shot, product, etc.)
CREATE INDEX IF NOT EXISTS media_entity_idx         ON media (project_id, entity_type, entity_id);

COMMENT ON TABLE  media                    IS 'One row per uploaded file; bridges IndexedDB local_image_id to Supabase Storage public_url.';
COMMENT ON COLUMN media.local_image_id     IS 'The UUID that was generated locally and stored in Zustand as the imageId. Used to look up the public URL on the client.';
COMMENT ON COLUMN media.storage_path       IS 'Path within the project-media bucket: {projectId}/{localImageId}';
COMMENT ON COLUMN media.entity_type        IS 'e.g. moodboard_item | reference_image | shot | product | styling | model | sketch | collateral_image';
COMMENT ON COLUMN media.entity_id          IS 'Local ID of the owning entity. Empty string for Phase D1; populated in D2+.';
