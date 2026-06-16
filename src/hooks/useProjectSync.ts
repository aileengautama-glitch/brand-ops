/**
 * useProjectSync — Phase B bi-directional project sync
 *
 * What it does:
 *   1. On mount: fetches all project headers from Supabase.
 *        - Remote projects missing locally  → addProjectFromRemote (skeleton only)
 *        - Local projects (valid UUID) missing remotely → supabasePushProject
 *   2. Watches the Zustand stores for local changes and forwards them to Supabase:
 *        - New project added locally  → INSERT (skips legacy / seed IDs)
 *        - Project removed locally    → DELETE
 *        - name/description updated   → UPDATE (only those two fields)
 *   3. Subscribes to Supabase Realtime on the projects table and reflects
 *      remote changes into the correct Zustand store without echoing them back.
 *
 * No UI components change.  Both EventsHome and ShootsHome continue reading
 * from Zustand; this hook simply keeps Zustand in sync with the backend.
 *
 * Called once from AppShell.  A no-op when VITE_SUPABASE_URL/ANON_KEY are
 * absent (dev without backend, CI, etc.).
 */

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useEventStore } from '@/store/useEventStore'
import { useShootStore } from '@/store/useShootStore'
import type { ProjectRow } from '@/lib/supabase.types'
import {
  supabaseFetchAllProjects,
  supabasePushProject,
  supabaseUpdateProject,
  supabaseDeleteProject,
  isValidUUID,
} from '@/repositories/projects'

// ─── Loop-prevention ──────────────────────────────────────────────────────────
// When a Realtime event arrives we update the local Zustand store, which fires
// the Zustand subscriber, which would otherwise echo the change straight back
// to Supabase.  We prevent that by tracking which IDs are currently being
// processed from the remote side.
//
// Module-level so it persists across React re-renders (not stored in state).

const inFlightRemoteIds = new Set<string>()

function markRemote(id: string): void {
  inFlightRemoteIds.add(id)
  // setTimeout(0) ensures cleanup happens after the synchronous Zustand
  // notification cycle completes (Zustand notifies subscribers synchronously
  // inside set(), so the subscriber runs before the timeout fires).
  setTimeout(() => inFlightRemoteIds.delete(id), 0)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProjectSync(): void {
  const mountedRef = useRef(true)

  useEffect(() => {
    // No-op when Supabase is not configured (missing env vars, test environment, etc.)
    // Capture in a local const so TypeScript can narrow the type throughout the
    // effect (including closures and async callbacks) without losing narrowing.
    const client = supabase
    if (!client) return

    mountedRef.current = true

    // ── 1. Initial sync ──────────────────────────────────────────────────────
    void (async () => {
      const remoteRows = await supabaseFetchAllProjects()
      if (!remoteRows || !mountedRef.current) return

      const remoteIdSet = new Set(remoteRows.map((r) => r.id))

      // Pull: remote → local for any project not yet in the local store
      for (const r of remoteRows) {
        const data = {
          id:          r.id,
          name:        r.name,
          description: r.description,
          createdAt:   r.created_at,
          updatedAt:   r.updated_at,
        }
        markRemote(r.id)
        if (r.module === 'event') {
          useEventStore.getState().addProjectFromRemote(data)
        } else if (r.module === 'shoot') {
          useShootStore.getState().addProjectFromRemote(data)
        }
      }

      // Push: local → remote for valid-UUID projects not yet in Supabase
      for (const p of useEventStore.getState().projects) {
        if (isValidUUID(p.id) && !remoteIdSet.has(p.id)) {
          await supabasePushProject(p, 'event')
        }
      }
      for (const p of useShootStore.getState().projects) {
        if (isValidUUID(p.id) && !remoteIdSet.has(p.id)) {
          await supabasePushProject(p, 'shoot')
        }
      }
    })()

    // ── 2. Zustand → Supabase (local changes forwarded outward) ─────────────
    // Zustand's plain subscribe passes (nextState, prevState) synchronously on
    // every set() call, making it easy to diff without extra tracking state.

    const unsubEvent = useEventStore.subscribe((state, prevState) => {
      // Added
      state.projects
        .filter((p) => !prevState.projects.some((pp) => pp.id === p.id))
        .filter((p) => !inFlightRemoteIds.has(p.id))
        .forEach((p) => void supabasePushProject(p, 'event'))

      // Removed
      prevState.projects
        .filter((p) => !state.projects.some((pp) => pp.id === p.id))
        .filter((p) => !inFlightRemoteIds.has(p.id))
        .forEach((p) => void supabaseDeleteProject(p.id))

      // name / description updated (only these two fields live in the projects table)
      state.projects
        .filter((p) => !inFlightRemoteIds.has(p.id))
        .forEach((p) => {
          const prev = prevState.projects.find((pp) => pp.id === p.id)
          if (prev && (prev.name !== p.name || prev.description !== p.description)) {
            void supabaseUpdateProject(p.id, { name: p.name, description: p.description })
          }
        })
    })

    const unsubShoot = useShootStore.subscribe((state, prevState) => {
      state.projects
        .filter((p) => !prevState.projects.some((pp) => pp.id === p.id))
        .filter((p) => !inFlightRemoteIds.has(p.id))
        .forEach((p) => void supabasePushProject(p, 'shoot'))

      prevState.projects
        .filter((p) => !state.projects.some((pp) => pp.id === p.id))
        .filter((p) => !inFlightRemoteIds.has(p.id))
        .forEach((p) => void supabaseDeleteProject(p.id))

      state.projects
        .filter((p) => !inFlightRemoteIds.has(p.id))
        .forEach((p) => {
          const prev = prevState.projects.find((pp) => pp.id === p.id)
          if (prev && (prev.name !== p.name || prev.description !== p.description)) {
            void supabaseUpdateProject(p.id, { name: p.name, description: p.description })
          }
        })
    })

    // ── 3. Supabase Realtime → Zustand (remote changes reflected inward) ────
    const channel = client
      .channel('brand-ops-projects')
      .on<ProjectRow>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'projects' },
        ({ new: r }) => {
          markRemote(r.id)
          const data = {
            id:          r.id,
            name:        r.name,
            description: r.description,
            createdAt:   r.created_at,
            updatedAt:   r.updated_at,
          }
          if (r.module === 'event') useEventStore.getState().addProjectFromRemote(data)
          else if (r.module === 'shoot') useShootStore.getState().addProjectFromRemote(data)
        }
      )
      .on<ProjectRow>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects' },
        ({ new: r }) => {
          markRemote(r.id)
          const patch = { name: r.name, description: r.description }
          if (r.module === 'event') useEventStore.getState().updateProject(r.id, patch)
          else if (r.module === 'shoot') useShootStore.getState().updateProject(r.id, patch)
        }
      )
      .on<ProjectRow>(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'projects' },
        ({ old }) => {
          const id = (old as Partial<ProjectRow>).id
          if (!id) return
          markRemote(id)
          useEventStore.getState().removeProject(id)
          useShootStore.getState().removeProject(id)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.info('[ProjectSync] Realtime channel connected')
        }
      })

    return () => {
      mountedRef.current = false
      unsubEvent()
      unsubShoot()
      void client.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
