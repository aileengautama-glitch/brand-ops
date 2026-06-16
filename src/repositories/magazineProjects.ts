/**
 * Magazine project repository — project-level summaries (read-only, Phase 3).
 *
 * Dual-path, read-only:
 *   • Local    — useMagazineStore.projects, mapped to MagazineProjectSummary.
 *                The authoritative path while Supabase is off; UI keeps reading
 *                the store directly (this repo is not yet mounted).
 *   • Supabase — the reconciled schema: base projects row (module='magazine')
 *                JOINed with its magazine_project_meta detail. Implemented as two
 *                typed SELECTs joined in JS by project_id — the composite FK
 *                (project_id, module) → projects(id, module) is not modeled in the
 *                hand-written Relationships, so PostgREST embedding would be
 *                untyped; two reads keep the mapping fully typed.
 *
 * Active impl chosen by isSupabaseEnabled (mirrors the Phase 2 people/access repos).
 * Writes (create/update magazine project + meta) are NOT here — deferred to the
 * write phase, which must upsert the projects row BEFORE magazine_project_meta /
 * access_grants (the composite FKs require the parent to exist first).
 */
import { useMagazineStore } from '@/store/useMagazineStore'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { ProjectRow, MagazineProjectMetaRow, MagazineProjectMetaUpdate } from '@/lib/supabase.types'
import type { MagazineProject, MagazineProjectStatus } from '@/types/magazine'
import type { IMagazineProjectRepository, MagazineProjectSummary } from './_types'

// ─── Mappers ──────────────────────────────────────────────────────────────────

// local MagazineProject → app-facing summary (project-level fields only)
function projectToSummary(p: MagazineProject): MagazineProjectSummary {
  return {
    id:              p.id,
    name:            p.name,
    description:     p.description,
    editionNumber:   p.editionNumber,
    publicationDate: p.publicationDate,
    theme:           p.theme,
    status:          p.status,
    totalBudget:     p.totalBudget,
    notes:           p.notes,
    createdAt:       p.createdAt,
    updatedAt:       p.updatedAt,
  }
}

// base projects row + its magazine_project_meta → summary. meta is normally
// present for every magazine project (schema + import guarantee it); defaults
// are defensive so a missing detail row degrades gracefully instead of throwing.
// editorial_status is text in the DB but pinned to the MagazineProjectStatus
// domain by a CHECK, so the cast is safe.
function rowsToSummary(project: ProjectRow, meta: MagazineProjectMetaRow | undefined): MagazineProjectSummary {
  return {
    id:              project.id,
    name:            project.name,
    description:     project.description,
    editionNumber:   meta?.edition_number ?? '',
    publicationDate: meta?.publication_date ?? '',
    theme:           meta?.theme ?? '',
    status:          (meta?.editorial_status ?? 'planning') as MagazineProjectStatus,
    totalBudget:     meta?.total_budget ?? 0,
    notes:           meta?.notes ?? '',
    createdAt:       project.created_at,
    updatedAt:       project.updated_at,
  }
}

// ─── Local (Zustand-backed, authoritative today) ─────────────────────────────

const LocalMagazineProjects: IMagazineProjectRepository = {
  async listMagazineProjects() {
    return useMagazineStore.getState().projects.map(projectToSummary)
  },
  async getMagazineProject(id) {
    const p = useMagazineStore.getState().projects.find((x) => x.id === id)
    return p ? projectToSummary(p) : null
  },
}

// ─── Supabase (read-through; RLS-filtered when authenticated) ────────────────

const SupabaseMagazineProjects: IMagazineProjectRepository = {
  async listMagazineProjects() {
    if (!supabase) return []
    const { data: projects, error: pErr } = await supabase
      .from('projects')
      .select('*')
      .eq('module', 'magazine')
      .order('created_at', { ascending: true })
    if (pErr) { console.warn('[MagazineProjectRepo] list projects failed:', pErr.message); return [] }
    if (!projects || projects.length === 0) return []

    const { data: metas, error: mErr } = await supabase
      .from('magazine_project_meta')
      .select('*')
    if (mErr) { console.warn('[MagazineProjectRepo] list meta failed:', mErr.message); return [] }

    const metaById = new Map((metas ?? []).map((m) => [m.project_id, m]))
    return projects.map((p) => rowsToSummary(p, metaById.get(p.id)))
  },

  async getMagazineProject(id) {
    if (!supabase) return null
    if (!isValidUUID(id)) return null

    const { data: project, error: pErr } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('module', 'magazine')
      .maybeSingle()
    if (pErr) { console.warn('[MagazineProjectRepo] get project failed:', pErr.message); return null }
    if (!project) return null

    const { data: meta, error: mErr } = await supabase
      .from('magazine_project_meta')
      .select('*')
      .eq('project_id', id)
      .maybeSingle()
    if (mErr) { console.warn('[MagazineProjectRepo] get meta failed:', mErr.message); return null }

    return rowsToSummary(project, meta ?? undefined)
  },
}

// READ-PATH STANDARD (Option A): the Supabase path here is intentionally REMOTE-ONLY.
// listMagazineProjects() must return the raw remote set so useMagazineProjectBootstrap
// (Phase 5A) can detect drift against the local store — do NOT add a local fallback here.
// Instead, every UI surface that reads this repo MUST resolve `remote ?? local` (or a
// local-authoritative union) so seed / unsynced / unauthorized projects never vanish:
//   • MagazineHome                          → local-store union (existence is store-driven)
//   • MagazineBoard / MagazineTeam subtitle → `summary?.x ?? project.x`
// (PeopleRepository is hardened at the repo layer instead — it has no remote-diff consumer.)
export const MagazineProjectRepository: IMagazineProjectRepository =
  isSupabaseEnabled ? SupabaseMagazineProjects : LocalMagazineProjects

// ─── Supabase sync helpers (called by useMagazineProjectSync only) ────────────
// Pattern mirrors src/repositories/projects.ts supabase* helpers.
// These are NOT on the IMagazineProjectRepository interface — they are fire-and-
// forget write helpers consumed by the sync hook, not by UI components.

/**
 * Insert a new magazine project into Supabase (projects + magazine_project_meta).
 * Write ordering: projects first (composite FK requires parent to exist before meta).
 * Uses upsert(ignoreDuplicates) so re-running on an already-synced project is a no-op.
 * Silently skips non-UUID ids (seed-mag-001 etc.) and a missing Supabase client.
 */
export async function supabasePushMagazineProject(project: MagazineProject): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(project.id)) return

  // 1. projects row — must exist before meta (composite FK enforced at DB level)
  const { error: pErr } = await supabase
    .from('projects')
    .upsert(
      {
        id:          project.id,
        module:      'magazine' as const,
        name:        project.name,
        description: project.description,
        status:      'active' as const,
        created_by:  null,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )
  if (pErr) {
    console.warn('[MagazineProjectSync] push projects failed:', project.id, pErr.message)
    return  // do not attempt meta insert — avoid orphaned child row
  }

  // 2. magazine_project_meta row (1:1 detail)
  // publication_date: '' → null (DB column is date; empty string is invalid)
  const { error: mErr } = await supabase
    .from('magazine_project_meta')
    .upsert(
      {
        project_id:       project.id,
        module:           'magazine' as const,
        edition_number:   project.editionNumber,
        publication_date: project.publicationDate || null,
        theme:            project.theme,
        total_budget:     project.totalBudget,
        editorial_status: project.status,
        notes:            project.notes,
      },
      { onConflict: 'project_id', ignoreDuplicates: true }
    )
  if (mErr) {
    console.warn('[MagazineProjectSync] push meta failed:', project.id, mErr.message)
  }
}

/**
 * Update summary-level fields of a magazine project in Supabase.
 * Fields are split between the projects and magazine_project_meta tables.
 * Either table's update runs independently — a failure in one does not block the other.
 * publication_date: '' → null (DB column is date type, rejects empty string).
 * Silently skips non-UUID ids and a missing Supabase client.
 */
export async function supabaseUpdateMagazineProject(
  id: string,
  patch: Partial<Pick<MagazineProject,
    'name' | 'description' | 'editionNumber' | 'publicationDate' | 'theme' | 'status' | 'notes' | 'totalBudget'
  >>
): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(id)) return

  // ── projects table (name, description) ─────────────────────────────────
  const projectsPatch: { name?: string; description?: string } = {}
  if (patch.name        !== undefined) projectsPatch.name        = patch.name
  if (patch.description !== undefined) projectsPatch.description = patch.description

  if (Object.keys(projectsPatch).length > 0) {
    const { error } = await supabase
      .from('projects')
      .update(projectsPatch)
      .eq('id', id)
      .eq('module', 'magazine')
    if (error) console.warn('[MagazineProjectSync] update projects failed:', id, error.message)
  }

  // ── magazine_project_meta table (all other summary fields) ─────────────
  const metaPatch: MagazineProjectMetaUpdate = {}
  if (patch.editionNumber   !== undefined) metaPatch.edition_number   = patch.editionNumber
  if (patch.publicationDate !== undefined) metaPatch.publication_date = patch.publicationDate || null
  if (patch.theme           !== undefined) metaPatch.theme            = patch.theme
  if (patch.status          !== undefined) metaPatch.editorial_status = patch.status
  if (patch.notes           !== undefined) metaPatch.notes            = patch.notes
  if (patch.totalBudget     !== undefined) metaPatch.total_budget     = patch.totalBudget

  if (Object.keys(metaPatch).length > 0) {
    const { error } = await supabase
      .from('magazine_project_meta')
      .update(metaPatch)
      .eq('project_id', id)
    if (error) console.warn('[MagazineProjectSync] update meta failed:', id, error.message)
  }
}

/**
 * Delete a magazine project from Supabase.
 * ON DELETE CASCADE (declared in 0004_reconcile_projects.sql) automatically
 * removes the magazine_project_meta and access_grants child rows.
 * Silently skips non-UUID ids and a missing Supabase client.
 */
export async function supabaseDeleteMagazineProject(id: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(id)) return

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('module', 'magazine')
  if (error) console.warn('[MagazineProjectSync] delete failed:', id, error.message)
}
