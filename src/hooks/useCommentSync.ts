/**
 * useCommentSync — global comment sync hook (called once from AppShell).
 *
 * Strategy (Phase C):
 *   1. On mount: pull all remote comments for every valid-UUID project →
 *      upsert into useCommentStore.
 *   2. Push local comments that have valid UUIDs up to Supabase.
 *   3. Zustand subscription: detect new additions and removals → push to
 *      Supabase.  Updates are not synced (comments are immutable after posting).
 *   4. Supabase Realtime: listen to ALL inserts/deletes on the comments table
 *      and apply them into useCommentStore.
 *
 * Echo-loop prevention:
 *   Same Set-based pattern as useProjectSync and useTaskSync.
 *   Remote-sourced ids are marked before touching Zustand so the
 *   Zustand subscriber skips them.
 *
 * projectId threading:
 *   Comments already carry a projectId field (added in Phase C).
 *   Pre-Phase-C comments have projectId = '' and are silently skipped by
 *   the isValidUUID guard in supabasePushComment.
 */
import { useEffect } from 'react'
import { useEventStore } from '@/store/useEventStore'
import { useShootStore } from '@/store/useShootStore'
import { useCommentStore } from '@/store/useCommentStore'
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import {
  supabaseFetchCommentsByProject,
  supabasePushComment,
  supabaseDeleteComment,
  commentRowToLocal,
} from '@/repositories/comments'
import type { CommentRow } from '@/lib/supabase.types'

// ─── Echo-loop prevention ─────────────────────────────────────────────────────

const inFlightRemoteCommentIds = new Set<string>()

function markRemoteComment(id: string) {
  inFlightRemoteCommentIds.add(id)
  setTimeout(() => inFlightRemoteCommentIds.delete(id), 0)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCommentSync() {
  useEffect(() => {
    const client = supabase
    if (!client) return

    // ── 1. Collect all valid-UUID project IDs ─────────────────────────────────
    const allProjectIds = [
      ...useEventStore.getState().projects.map((p) => p.id),
      ...useShootStore.getState().projects.map((p) => p.id),
    ].filter(isValidUUID)

    if (allProjectIds.length === 0) {
      // No UUID projects yet — skip fetch but still wire Realtime + subscribe
    }

    // ── 2. Initial fetch: remote → Zustand ────────────────────────────────────
    if (allProjectIds.length > 0) {
      supabaseFetchCommentsByProject(allProjectIds).then((rows) => {
        if (!rows) return
        rows.forEach((row) => {
          markRemoteComment(row.id)
          useCommentStore.getState().upsertComment(commentRowToLocal(row))
        })
      })
    }

    // ── 3. Initial push: local → Supabase ─────────────────────────────────────
    // Push any local comments whose id, projectId, and entityId are all valid UUIDs.
    useCommentStore.getState().comments
      .filter(
        (c) =>
          isValidUUID(c.id) &&
          isValidUUID(c.projectId) &&
          isValidUUID(c.entityId)
      )
      .forEach((c) => supabasePushComment(c))

    // ── 4. Zustand subscribe: local mutations → Supabase ─────────────────────
    let prevComments = useCommentStore.getState().comments

    const unsubComments = useCommentStore.subscribe((state) => {
      const next = state.comments
      const prev = prevComments
      prevComments = next

      const prevIds = new Set(prev.map((c) => c.id))
      const nextIds = new Set(next.map((c) => c.id))

      // Added
      next
        .filter((c) => !prevIds.has(c.id) && !inFlightRemoteCommentIds.has(c.id))
        .forEach((c) => supabasePushComment(c))

      // Removed
      prev
        .filter((c) => !nextIds.has(c.id) && !inFlightRemoteCommentIds.has(c.id))
        .forEach((c) => supabaseDeleteComment(c.id))
    })

    // ── 5. Realtime: remote mutations → Zustand ───────────────────────────────

    const channel = client
      .channel('brand-ops-comments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as CommentRow
            if (!isValidUUID(row.id)) return

            markRemoteComment(row.id)
            useCommentStore.getState().upsertComment(commentRowToLocal(row))
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old as { id?: string }
            if (!row.id || !isValidUUID(row.id)) return

            markRemoteComment(row.id)
            useCommentStore.getState().removeComment(row.id)
          }
          // UPDATE is not handled — comments are immutable after posting.
        }
      )
      .subscribe()

    return () => {
      unsubComments()
      client.removeChannel(channel)
    }
  }, [])
}
