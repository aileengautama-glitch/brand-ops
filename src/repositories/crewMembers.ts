/**
 * Crew members repository — normalized crew_members table (Phase E6).
 *
 * Each row maps 1:1 to the local `CrewMember` interface.  No join tables.
 *
 * Relationship note: tasks.assigned_to holds a crew member ID as a TEXT soft
 * ref.  That column is already synced by useTaskSync; no FK upgrade needed here.
 *
 * sort_order is the 0-based array index at push time (no reorder UI today).
 */
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { CrewMember } from '@/types/shoot'
import type { CrewMemberRow } from '@/lib/supabase.types'

// ─── Mapping ──────────────────────────────────────────────────────────────────

function crewMemberToRow(member: CrewMember, projectId: string, sortOrder: number) {
  return {
    id:         member.id,
    project_id: projectId,
    name:       member.name,
    role:       member.role,
    contact:    member.contact,
    notes:      member.notes,
    sort_order: sortOrder,
    created_at: member.createdAt,
    updated_at: new Date().toISOString(),
  }
}

function rowToCrewMember(row: CrewMemberRow): CrewMember {
  return {
    id:        row.id,
    name:      row.name,
    role:      row.role,
    contact:   row.contact,
    notes:     row.notes,
    createdAt: row.created_at,
  }
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Fetch all crew members for a set of projects.
 * Returns null if Supabase is not configured.
 */
export async function supabaseFetchCrewMembers(
  projectIds: string[],
): Promise<Array<{ projectId: string; member: CrewMember }> | null> {
  const client = supabase
  if (!client) return null

  const validIds = projectIds.filter(isValidUUID)
  if (validIds.length === 0) return null

  const { data, error } = await client
    .from('crew_members')
    .select('*')
    .in('project_id', validIds)
    .order('sort_order', { ascending: true })

  if (error) {
    console.warn('[Crew] fetch failed:', error.message)
    return null
  }

  return (data ?? []).map((row) => ({
    projectId: row.project_id,
    member: rowToCrewMember(row),
  }))
}

// ─── Push / delete ────────────────────────────────────────────────────────────

/**
 * Upsert a crew member row.  sortOrder is the 0-based position in the local
 * crewMembers array.
 * Returns true if the upsert succeeded.
 */
export async function supabasePushCrewMember(
  member: CrewMember,
  projectId: string,
  sortOrder: number,
): Promise<boolean> {
  const client = supabase
  if (!client) return false
  if (!isValidUUID(member.id) || !isValidUUID(projectId)) return false

  const { error } = await client
    .from('crew_members')
    .upsert(crewMemberToRow(member, projectId, sortOrder), {
      onConflict: 'id',
      ignoreDuplicates: false,
    })

  if (error) {
    console.warn('[Crew] push failed:', member.id, error.message)
    return false
  }
  return true
}

/** Delete a crew member row.  No-op for non-UUID ids. */
export async function supabaseDeleteCrewMember(memberId: string): Promise<void> {
  const client = supabase
  if (!client) return
  if (!isValidUUID(memberId)) return

  const { error } = await client.from('crew_members').delete().eq('id', memberId)
  if (error) console.warn('[Crew] delete failed:', memberId, error.message)
}
