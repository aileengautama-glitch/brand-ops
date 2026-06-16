/**
 * useProjectContentSync — bidirectional sync of the editable text slice
 * (Phase E2).  Mounted once in AppShell.
 *
 * Scope (first shared-editing slice):
 *   - shoots: briefDetails + shootBrief
 *   - events: eventDate / venue / runTime
 *
 * Directions:
 *   1. Load   : fetch remote content for all valid-UUID projects → apply into
 *               the store (remote authoritative on load, so a second device
 *               pulls the latest).  Projects with no remote row are seeded by
 *               the first local push.
 *   2. Push   : on local store changes (debounced), push changed content up.
 *   3. Realtime: on remote changes, apply into the store live.
 *
 * Echo-loop prevention — value dedup (no timing-sensitive in-flight flags):
 *   `lastSynced[projectId]` holds the last content JSON that is known to match
 *   remote.  Applying a remote change sets it; the debounced push skips when
 *   the rebuilt content equals it.  So remote→store→(subscriber)→push is a
 *   no-op, and only genuine local edits push.
 *
 * Failure safety:
 *   lastSynced is updated only AFTER a confirmed push, so a failed push retries
 *   on the next change.  Local Zustand/localStorage is always the immediate
 *   write target, so edits are never lost if Supabase is unavailable.
 *
 * Conflict model: last-write-wins at document level. Acceptable for a small set
 * of co-authored text fields; field-level merge / CRDT is future hardening.
 */
import { useEffect } from 'react'
import { useEventStore } from '@/store/useEventStore'
import { useShootStore } from '@/store/useShootStore'
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import {
  supabaseFetchProjectContent,
  supabasePushProjectContent,
} from '@/repositories/projectContent'
import {
  buildEventContent,
  buildShootContent,
  applyEventContent,
  applyShootContent,
  type EventContent,
  type ShootContent,
} from '@/lib/projectContent'
import type { Json, ProjectContentRow } from '@/lib/supabase.types'

const DEBOUNCE_MS = 1200

// projectId → last content JSON known to match remote.
const lastSynced = new Map<string, string>()

// ─── Apply remote → store ─────────────────────────────────────────────────────

function applyRemoteRow(row: ProjectContentRow): void {
  const json = JSON.stringify(row.content)
  // Already in sync — nothing to apply, and keeps the push side a no-op.
  if (lastSynced.get(row.project_id) === json) return
  lastSynced.set(row.project_id, json)

  if (row.module === 'event') {
    applyEventContent(row.project_id, row.content as unknown as EventContent)
  } else {
    applyShootContent(row.project_id, row.content as unknown as ShootContent)
  }
}

// ─── Push local → remote (debounced, deduped, success-gated) ──────────────────

function pushChangedContent(): void {
  for (const p of useEventStore.getState().projects) {
    if (!isValidUUID(p.id)) continue
    const content = buildEventContent(p)
    const json = JSON.stringify(content)
    if (lastSynced.get(p.id) === json) continue
    void supabasePushProjectContent(p.id, 'event', content as unknown as Json).then((ok) => {
      if (ok) lastSynced.set(p.id, json)
    })
  }

  for (const p of useShootStore.getState().projects) {
    if (!isValidUUID(p.id)) continue
    const content = buildShootContent(p)
    const json = JSON.stringify(content)
    if (lastSynced.get(p.id) === json) continue
    void supabasePushProjectContent(p.id, 'shoot', content as unknown as Json).then((ok) => {
      if (ok) lastSynced.set(p.id, json)
    })
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProjectContentSync(): void {
  useEffect(() => {
    const client = supabase
    if (!client) return

    // 1. Initial load: remote → store (authoritative), then seed any project
    //    that has no remote row yet via the first push.
    const projectIds = [
      ...useEventStore.getState().projects.map((p) => p.id),
      ...useShootStore.getState().projects.map((p) => p.id),
    ]
    supabaseFetchProjectContent(projectIds).then((rows) => {
      if (rows) rows.forEach(applyRemoteRow)
      // Seed projects with no remote row (and push any pre-existing local edits).
      pushChangedContent()
    })

    // 2. Debounced push on local store changes.
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        pushChangedContent()
      }, DEBOUNCE_MS)
    }
    const unsubEvent = useEventStore.subscribe(schedule)
    const unsubShoot = useShootStore.subscribe(schedule)

    // 3. Realtime: apply remote changes live.
    const channel = client
      .channel('brand-ops-project-content')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_content' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            applyRemoteRow(payload.new as ProjectContentRow)
          }
        },
      )
      .subscribe()

    return () => {
      if (timer) {
        clearTimeout(timer)
        pushChangedContent()  // flush a pending edit on unmount
      }
      unsubEvent()
      unsubShoot()
      client.removeChannel(channel)
    }
  }, [])
}
