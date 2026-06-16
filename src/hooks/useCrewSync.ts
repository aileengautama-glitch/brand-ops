/**
 * useCrewSync — bidirectional sync of normalized crew members (Phase E6).
 * Mounted once in AppShell.
 *
 * Pattern mirrors useModelsSync exactly:
 *   - Load (MERGE, seed-safe): apply remote rows, push local-only UUID members.
 *     Never wholesale-replaces the local array.
 *   - Push (debounced, value-deduped): upserts changed members, deletes removed.
 *     sort_order = current array index.
 *   - Realtime: crew_members INSERT/UPDATE → apply row directly;
 *     DELETE → remove from store.
 *
 * Conflict model: per-member last-write-wins.
 *
 * Coexistence caveats:
 *   - Only UUID-id members sync; seed records (seed-sh-cr-*) remain local-only.
 *   - tasks.assigned_to is a TEXT soft ref — tasks still resolve correctly even
 *     when the referenced crew member hasn't arrived from remote yet.  The UI
 *     displays "unassigned" gracefully until the crew row lands.
 *   - sort_order tracks array index. No moveCrewMember action exists today so
 *     order is stable (insertion order), but two devices independently adding
 *     members could get different sort_orders that converge to last-write-wins.
 */
import { useEffect } from 'react'
import { useShootStore } from '@/store/useShootStore'
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import {
  supabaseFetchCrewMembers,
  supabasePushCrewMember,
  supabaseDeleteCrewMember,
} from '@/repositories/crewMembers'
import type { CrewMember } from '@/types/shoot'
import type { CrewMemberRow } from '@/lib/supabase.types'

const DEBOUNCE_MS = 1200

// memberId → content JSON known to match remote.
const lastSynced = new Map<string, string>()

function memberJson(m: CrewMember): string {
  return JSON.stringify({
    name: m.name, role: m.role, contact: m.contact, notes: m.notes, createdAt: m.createdAt,
  })
}

function findProjectIdForMember(memberId: string): string | null {
  for (const proj of useShootStore.getState().projects) {
    if ((proj.crewMembers ?? []).some((m) => m.id === memberId)) return proj.id
  }
  return null
}

// ─── Apply remote → store ─────────────────────────────────────────────────────

function applyRemoteMember(projectId: string, member: CrewMember): void {
  if (!isValidUUID(member.id) || !isValidUUID(projectId)) return
  const json = memberJson(member)
  if (lastSynced.get(member.id) === json) return
  lastSynced.set(member.id, json)
  useShootStore.getState().upsertCrewMember(projectId, member)
}

function applyRemoteDelete(memberId: string): void {
  if (!isValidUUID(memberId)) return
  lastSynced.delete(memberId)
  const projectId = findProjectIdForMember(memberId)
  if (projectId) useShootStore.getState().removeCrewMember(projectId, memberId)
}

// ─── Push local → remote (debounced, deduped, success-gated) ──────────────────

function pushChangedMembers(): void {
  const projects = useShootStore.getState().projects

  const currentIds = new Set<string>()
  for (const proj of projects) {
    for (const m of proj.crewMembers ?? []) {
      if (isValidUUID(m.id) && isValidUUID(proj.id)) currentIds.add(m.id)
    }
  }

  // Deletions.
  for (const id of [...lastSynced.keys()]) {
    if (!currentIds.has(id)) {
      lastSynced.delete(id)
      void supabaseDeleteCrewMember(id)
    }
  }

  // Inserts / updates.
  for (const proj of projects) {
    if (!isValidUUID(proj.id)) continue
    const members = proj.crewMembers ?? []
    for (let i = 0; i < members.length; i++) {
      const member = members[i]
      if (!isValidUUID(member.id)) continue
      const json = memberJson(member)
      if (lastSynced.get(member.id) === json) continue
      void supabasePushCrewMember(member, proj.id, i).then((ok) => {
        if (ok) lastSynced.set(member.id, json)
      })
    }
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCrewSync(): void {
  useEffect(() => {
    const client = supabase
    if (!client) return

    // 1. Load: fetch remote members, merge into store, then push local-only.
    const projectIds = useShootStore.getState().projects.map((p) => p.id)
    supabaseFetchCrewMembers(projectIds).then((rows) => {
      if (rows) rows.forEach(({ projectId, member }) => applyRemoteMember(projectId, member))
      pushChangedMembers()
    })

    // 2. Debounced push.
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { timer = null; pushChangedMembers() }, DEBOUNCE_MS)
    }
    const unsub = useShootStore.subscribe(schedule)

    // 3. Realtime: simple rows — apply payload directly.
    const channel = client
      .channel('brand-ops-crew')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crew_members' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as CrewMemberRow
            if (row.id && row.project_id) {
              const member: CrewMember = {
                id:        row.id,
                name:      row.name,
                role:      row.role,
                contact:   row.contact,
                notes:     row.notes,
                createdAt: row.created_at,
              }
              applyRemoteMember(row.project_id, member)
            }
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as { id?: string }
            if (old.id) applyRemoteDelete(old.id)
          }
        },
      )
      .subscribe()

    return () => {
      if (timer) { clearTimeout(timer); pushChangedMembers() }
      unsub()
      client.removeChannel(channel)
    }
  }, [])
}
