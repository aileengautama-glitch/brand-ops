/**
 * Access repository — scoped grants for a person.
 *
 * Dual-path, read-only (Phase 2):
 *   • Local    — useUserStore.accessGrants[personId] (the ProjectGrant[] shape).
 *   • Supabase — SELECT * FROM access_grants WHERE person_id, re-grouped into
 *                ProjectGrant[] ({ module, projectId, sections:{ key: level } }).
 *                Row absence = inherit (matches the client model; '*' = default).
 *
 * The resolver (canView/canViewSection/canEdit) stays in useCurrentUser; this
 * repo only supplies the raw grants. Writes stay on the store (Phase 3).
 */
import { useUserStore } from '@/store/useUserStore'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { AccessGrantRow } from '@/lib/supabase.types'
import type { ProjectGrant, AccessModule, AccessLevel } from '@/auth/access'
import type { IAccessRepository } from './_types'

function rowsToGrants(rows: AccessGrantRow[]): ProjectGrant[] {
  const byProject = new Map<string, ProjectGrant>()
  for (const r of rows) {
    const key = `${r.module}:${r.project_id}`
    let g = byProject.get(key)
    if (!g) {
      g = { module: r.module as AccessModule, projectId: r.project_id, sections: {} }
      byProject.set(key, g)
    }
    g.sections[r.section_key] = r.level as AccessLevel
  }
  return [...byProject.values()]
}

const LocalAccess: IAccessRepository = {
  async getGrants(personId) {
    return useUserStore.getState().accessGrants[personId] ?? []
  },
}

const SupabaseAccess: IAccessRepository = {
  async getGrants(personId) {
    if (!supabase) return []
    const { data, error } = await supabase.from('access_grants').select('*').eq('person_id', personId)
    if (error) { console.warn('[AccessRepo] getGrants failed:', error.message); return [] }
    return rowsToGrants(data ?? [])
  },
}

export const AccessRepository: IAccessRepository = isSupabaseEnabled ? SupabaseAccess : LocalAccess

// ─── Supabase sync helpers (called by useMagazineGrantSync only) ──────────────
// Pattern mirrors magazineProjects.ts supabase* helpers.
// Not on the IAccessRepository interface — fire-and-forget, consumed by the sync hook.

/**
 * Upsert one access_grants row for a magazine project.
 * Conflict target: UNIQUE (person_id, module, project_id, section_key).
 * On conflict, updates `level` only (created_at is not included in payload → not overwritten).
 *
 * FK dependencies (both cause error code 23503 — logged with specific guidance):
 *   • (project_id, module) → projects(id, module): projects row must exist first (Phase 4).
 *   • person_id → people(id): people write path not yet wired; all app-user grants will
 *     fail with 23503 until that phase is complete. Self-heals after people are pushed.
 *
 * Silently skips non-UUID project_id values (seed-mag-001 etc.).
 */
export async function supabaseUpsertAccessGrant(
  personId:   string,
  projectId:  string,
  sectionKey: string,
  level:      AccessLevel,
): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(projectId)) return

  const { error } = await supabase
    .from('access_grants')
    .upsert(
      { person_id: personId, module: 'magazine' as const, project_id: projectId, section_key: sectionKey, level },
      { onConflict: 'person_id,module,project_id,section_key' }
    )
  if (error) {
    if (error.code === '23503') {
      // FK violation: project or person row not yet in Supabase (expected during initial sync).
      // Self-heals once the project push (Phase 4) and people push (future phase) complete.
      console.warn(
        '[MagazineGrantSync] FK violation — project or person not yet in Supabase:',
        { personId, projectId, sectionKey }, error.message
      )
    } else {
      console.warn('[MagazineGrantSync] upsert failed:', { personId, projectId, sectionKey }, error.message)
    }
  }
}

/**
 * Delete one access_grants row for a magazine project (section-level removal).
 * Used when setSectionAccess is called with level='inherit' (clears explicit override).
 * Silently skips non-UUID project_id values.
 */
export async function supabaseDeleteAccessGrant(
  personId:   string,
  projectId:  string,
  sectionKey: string,
): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(projectId)) return

  const { error } = await supabase
    .from('access_grants')
    .delete()
    .eq('person_id',   personId)
    .eq('module',      'magazine')
    .eq('project_id',  projectId)
    .eq('section_key', sectionKey)
  if (error) {
    console.warn('[MagazineGrantSync] delete row failed:', { personId, projectId, sectionKey }, error.message)
  }
}
