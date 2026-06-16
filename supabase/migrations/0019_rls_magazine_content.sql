-- ============================================================================
-- Phase 6C · 0019 — Row-Level Security for the remaining magazine content tables
-- ----------------------------------------------------------------------------
-- Completes the content-table RLS rollout (outreach was 0018). Same proven pattern,
-- applied to the other 11 tables, grouped by access section. All policies target the
-- `authenticated` role only → `anon` matches nothing → denied. Helpers (is_app_admin,
-- can_view_project, my_section_level) are defined in 0003 — apply 0003 (+ 0017 linking,
-- + 0018) BEFORE this.
--
-- Per table:
--   • READ  — admin OR can_view_project('magazine', project_id)   [project-level view]
--   • WRITE — admin OR my_section_level('magazine', project_id, '<dotted key>') = 'edit'
--
-- Table → section_key map (verified against MODULE_SECTIONS + access_grants.section_key;
-- '*' project default is handled inside my_section_level). NOTE the section keys are the
-- FULL dotted keys, and SPREAD is SINGULAR ('magazine.spread') though the table is plural:
--   magazine_spreads             → magazine.spread
--   magazine_graphics            → magazine.graphics
--   magazine_graphics_inspo      → magazine.graphics
--   magazine_tasks               → magazine.tasks
--   magazine_budget_items        → magazine.budget
--   magazine_visual_projects     → magazine.visual
--   magazine_mood_tiles          → magazine.visual
--   magazine_articles            → magazine.writing
--   magazine_article_versions    → magazine.writing
--   magazine_article_comments    → magazine.writing
--   magazine_writer_hours        → magazine.writing
--
-- No client read-authority flip: every page stays `remote ?? local`. This only makes the
-- remote side return AUTHORIZED rows once signed in + linked; anon/unlinked → local fallback.
-- Apply in the Supabase SQL Editor. Idempotent (drop policy if exists guards reruns).
-- ============================================================================

-- ─── Section: magazine.spread ────────────────────────────────────────────────
alter table public.magazine_spreads enable row level security;

drop policy if exists mag_spreads_select on public.magazine_spreads;
create policy mag_spreads_select on public.magazine_spreads
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_spreads_insert on public.magazine_spreads;
create policy mag_spreads_insert on public.magazine_spreads
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.spread') = 'edit' );

drop policy if exists mag_spreads_update on public.magazine_spreads;
create policy mag_spreads_update on public.magazine_spreads
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.spread') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.spread') = 'edit' );

drop policy if exists mag_spreads_delete on public.magazine_spreads;
create policy mag_spreads_delete on public.magazine_spreads
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.spread') = 'edit' );

-- ─── Section: magazine.graphics (graphics + graphics inspiration) ────────────
alter table public.magazine_graphics enable row level security;

drop policy if exists mag_graphics_select on public.magazine_graphics;
create policy mag_graphics_select on public.magazine_graphics
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_graphics_insert on public.magazine_graphics;
create policy mag_graphics_insert on public.magazine_graphics
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.graphics') = 'edit' );

drop policy if exists mag_graphics_update on public.magazine_graphics;
create policy mag_graphics_update on public.magazine_graphics
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.graphics') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.graphics') = 'edit' );

drop policy if exists mag_graphics_delete on public.magazine_graphics;
create policy mag_graphics_delete on public.magazine_graphics
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.graphics') = 'edit' );

alter table public.magazine_graphics_inspo enable row level security;

drop policy if exists mag_gfx_inspo_select on public.magazine_graphics_inspo;
create policy mag_gfx_inspo_select on public.magazine_graphics_inspo
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_gfx_inspo_insert on public.magazine_graphics_inspo;
create policy mag_gfx_inspo_insert on public.magazine_graphics_inspo
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.graphics') = 'edit' );

drop policy if exists mag_gfx_inspo_update on public.magazine_graphics_inspo;
create policy mag_gfx_inspo_update on public.magazine_graphics_inspo
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.graphics') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.graphics') = 'edit' );

drop policy if exists mag_gfx_inspo_delete on public.magazine_graphics_inspo;
create policy mag_gfx_inspo_delete on public.magazine_graphics_inspo
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.graphics') = 'edit' );

-- ─── Section: magazine.tasks ─────────────────────────────────────────────────
alter table public.magazine_tasks enable row level security;

drop policy if exists mag_tasks_select on public.magazine_tasks;
create policy mag_tasks_select on public.magazine_tasks
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_tasks_insert on public.magazine_tasks;
create policy mag_tasks_insert on public.magazine_tasks
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.tasks') = 'edit' );

drop policy if exists mag_tasks_update on public.magazine_tasks;
create policy mag_tasks_update on public.magazine_tasks
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.tasks') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.tasks') = 'edit' );

drop policy if exists mag_tasks_delete on public.magazine_tasks;
create policy mag_tasks_delete on public.magazine_tasks
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.tasks') = 'edit' );

-- ─── Section: magazine.budget ────────────────────────────────────────────────
alter table public.magazine_budget_items enable row level security;

drop policy if exists mag_budget_select on public.magazine_budget_items;
create policy mag_budget_select on public.magazine_budget_items
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_budget_insert on public.magazine_budget_items;
create policy mag_budget_insert on public.magazine_budget_items
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.budget') = 'edit' );

drop policy if exists mag_budget_update on public.magazine_budget_items;
create policy mag_budget_update on public.magazine_budget_items
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.budget') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.budget') = 'edit' );

drop policy if exists mag_budget_delete on public.magazine_budget_items;
create policy mag_budget_delete on public.magazine_budget_items
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.budget') = 'edit' );

-- ─── Section: magazine.visual (visual projects + mood tiles) ─────────────────
alter table public.magazine_visual_projects enable row level security;

drop policy if exists mag_visual_select on public.magazine_visual_projects;
create policy mag_visual_select on public.magazine_visual_projects
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_visual_insert on public.magazine_visual_projects;
create policy mag_visual_insert on public.magazine_visual_projects
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.visual') = 'edit' );

drop policy if exists mag_visual_update on public.magazine_visual_projects;
create policy mag_visual_update on public.magazine_visual_projects
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.visual') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.visual') = 'edit' );

drop policy if exists mag_visual_delete on public.magazine_visual_projects;
create policy mag_visual_delete on public.magazine_visual_projects
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.visual') = 'edit' );

alter table public.magazine_mood_tiles enable row level security;

drop policy if exists mag_mood_select on public.magazine_mood_tiles;
create policy mag_mood_select on public.magazine_mood_tiles
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_mood_insert on public.magazine_mood_tiles;
create policy mag_mood_insert on public.magazine_mood_tiles
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.visual') = 'edit' );

drop policy if exists mag_mood_update on public.magazine_mood_tiles;
create policy mag_mood_update on public.magazine_mood_tiles
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.visual') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.visual') = 'edit' );

drop policy if exists mag_mood_delete on public.magazine_mood_tiles;
create policy mag_mood_delete on public.magazine_mood_tiles
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.visual') = 'edit' );

-- ─── Section: magazine.writing (articles + versions + comments + writer hours) ─
-- The article-workspace children (versions/comments/writer_hours) all gate on the
-- SAME writing section as the article itself (they live under the Writing tab).
alter table public.magazine_articles enable row level security;

drop policy if exists mag_articles_select on public.magazine_articles;
create policy mag_articles_select on public.magazine_articles
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_articles_insert on public.magazine_articles;
create policy mag_articles_insert on public.magazine_articles
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

drop policy if exists mag_articles_update on public.magazine_articles;
create policy mag_articles_update on public.magazine_articles
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

drop policy if exists mag_articles_delete on public.magazine_articles;
create policy mag_articles_delete on public.magazine_articles
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

alter table public.magazine_article_versions enable row level security;

drop policy if exists mag_art_versions_select on public.magazine_article_versions;
create policy mag_art_versions_select on public.magazine_article_versions
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_art_versions_insert on public.magazine_article_versions;
create policy mag_art_versions_insert on public.magazine_article_versions
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

drop policy if exists mag_art_versions_update on public.magazine_article_versions;
create policy mag_art_versions_update on public.magazine_article_versions
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

drop policy if exists mag_art_versions_delete on public.magazine_article_versions;
create policy mag_art_versions_delete on public.magazine_article_versions
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

alter table public.magazine_article_comments enable row level security;

drop policy if exists mag_art_comments_select on public.magazine_article_comments;
create policy mag_art_comments_select on public.magazine_article_comments
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_art_comments_insert on public.magazine_article_comments;
create policy mag_art_comments_insert on public.magazine_article_comments
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

drop policy if exists mag_art_comments_update on public.magazine_article_comments;
create policy mag_art_comments_update on public.magazine_article_comments
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

drop policy if exists mag_art_comments_delete on public.magazine_article_comments;
create policy mag_art_comments_delete on public.magazine_article_comments
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

alter table public.magazine_writer_hours enable row level security;

drop policy if exists mag_writer_hours_select on public.magazine_writer_hours;
create policy mag_writer_hours_select on public.magazine_writer_hours
  for select to authenticated
  using ( public.is_app_admin() or public.can_view_project('magazine', project_id) );

drop policy if exists mag_writer_hours_insert on public.magazine_writer_hours;
create policy mag_writer_hours_insert on public.magazine_writer_hours
  for insert to authenticated
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

drop policy if exists mag_writer_hours_update on public.magazine_writer_hours;
create policy mag_writer_hours_update on public.magazine_writer_hours
  for update to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' )
  with check ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );

drop policy if exists mag_writer_hours_delete on public.magazine_writer_hours;
create policy mag_writer_hours_delete on public.magazine_writer_hours
  for delete to authenticated
  using ( public.is_app_admin() or public.my_section_level('magazine', project_id, 'magazine.writing') = 'edit' );
