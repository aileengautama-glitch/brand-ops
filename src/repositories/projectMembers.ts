/**
 * Project members repository — who is on a project (roster / membership).
 *
 * Dual-path, read-only (Phase 2):
 *   • Local    — useUserStore.memberships (login user → project links).
 *   • Supabase — SELECT FROM project_members.
 *
 * Project-id centric: project ids are globally-unique UUIDs, so membership is
 * keyed by project_id alone (no module needed). Used by the parity harness for
 * the legacy event/shoot "membership ⇒ view" fallback. Writes stay on the
 * stores (useUserStore.addMembership, magazine roster) for now — Phase 3.
 */
import { useUserStore } from '@/store/useUserStore'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import type { IProjectMembersRepository } from './_types'

const LocalMembers: IProjectMembersRepository = {
  async listProjectIdsForPerson(personId) {
    return (useUserStore.getState().memberships[personId] ?? []).map((m) => m.projectId)
  },
  async isMember(personId, projectId) {
    return (useUserStore.getState().memberships[personId] ?? []).some((m) => m.projectId === projectId)
  },
}

const SupabaseMembers: IProjectMembersRepository = {
  async listProjectIdsForPerson(personId) {
    if (!supabase) return []
    const { data, error } = await supabase.from('project_members').select('project_id').eq('person_id', personId)
    if (error) { console.warn('[MembersRepo] listProjectIdsForPerson failed:', error.message); return [] }
    return (data ?? []).map((r) => r.project_id)
  },
  async isMember(personId, projectId) {
    if (!supabase) return false
    const { data, error } = await supabase
      .from('project_members').select('id')
      .eq('person_id', personId).eq('project_id', projectId).maybeSingle()
    if (error) { console.warn('[MembersRepo] isMember failed:', error.message); return false }
    return !!data
  },
}

export const ProjectMembersRepository: IProjectMembersRepository = isSupabaseEnabled ? SupabaseMembers : LocalMembers
