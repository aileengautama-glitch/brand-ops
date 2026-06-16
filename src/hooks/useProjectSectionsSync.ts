/**
 * useProjectSectionsSync — bidirectional sync of editable ARRAY slices
 * (Phase E3).  Mounted once in AppShell.  Registry-driven (see
 * lib/projectSections.ts): adding a section is a registry entry + store setter.
 *
 * Directions (same proven pattern as useProjectContentSync / E2):
 *   1. Load    : fetch all section rows for valid-UUID projects → apply into
 *                store (remote authoritative on load).
 *   2. Push    : on local store changes (debounced), push changed sections up.
 *   3. Realtime: on remote section changes, apply into store live.
 *
 * Echo-loop prevention — value dedup per (project, section):
 *   lastSynced[`${projectId}:${section}`] holds the content JSON known to match
 *   remote.  Applying remote sets it; the debounced push skips when the rebuilt
 *   content equals it.  So remote→store→(subscriber)→push is a no-op.
 *
 * Failure safety: lastSynced is set only AFTER a confirmed push, so failed
 * pushes retry.  Local Zustand/localStorage is always the immediate write
 * target — edits are never lost if Supabase is unavailable.
 *
 * Conflict model: SECTION-level last-write-wins (each section row independent).
 */
import { useEffect } from 'react'
import { useShootStore } from '@/store/useShootStore'
import { useEventStore } from '@/store/useEventStore'
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import {
  supabaseFetchProjectSections,
  supabasePushProjectSection,
} from '@/repositories/projectSections'
import { SHOOT_SECTIONS, EVENT_SECTIONS } from '@/lib/projectSections'
import type { Json, ProjectSectionRow } from '@/lib/supabase.types'

const DEBOUNCE_MS = 1200

// `${projectId}:${section}` → content JSON known to match remote.
const lastSynced = new Map<string, string>()

const keyOf = (projectId: string, section: string) => `${projectId}:${section}`

// ─── Apply remote → store ─────────────────────────────────────────────────────

function applyRemoteSection(row: ProjectSectionRow): void {
  const registry = row.module === 'shoot' ? SHOOT_SECTIONS : EVENT_SECTIONS
  const desc = registry.find((d) => d.section === row.section)
  if (!desc) return  // section not registered (yet) — ignore

  const json = JSON.stringify(row.content)
  const key = keyOf(row.project_id, row.section)
  if (lastSynced.get(key) === json) return  // already in sync
  lastSynced.set(key, json)

  const items = (row.content as { items?: unknown[] })?.items ?? []
  desc.apply(row.project_id, items)
}

// ─── Push local → remote (debounced, deduped, success-gated) ──────────────────

function pushChangedSections(): void {
  for (const p of useShootStore.getState().projects) {
    if (!isValidUUID(p.id)) continue
    for (const desc of SHOOT_SECTIONS) {
      const content = desc.build(p)
      const json = JSON.stringify(content)
      const key = keyOf(p.id, desc.section)
      if (lastSynced.get(key) === json) continue
      void supabasePushProjectSection(p.id, desc.section, 'shoot', content as unknown as Json)
        .then((ok) => { if (ok) lastSynced.set(key, json) })
    }
  }

  for (const p of useEventStore.getState().projects) {
    if (!isValidUUID(p.id)) continue
    for (const desc of EVENT_SECTIONS) {
      const content = desc.build(p)
      const json = JSON.stringify(content)
      const key = keyOf(p.id, desc.section)
      if (lastSynced.get(key) === json) continue
      void supabasePushProjectSection(p.id, desc.section, 'event', content as unknown as Json)
        .then((ok) => { if (ok) lastSynced.set(key, json) })
    }
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProjectSectionsSync(): void {
  useEffect(() => {
    const client = supabase
    if (!client) return

    // 1. Initial load: remote → store, then seed any section with no remote row.
    const projectIds = [
      ...useShootStore.getState().projects.map((p) => p.id),
      ...useEventStore.getState().projects.map((p) => p.id),
    ]
    supabaseFetchProjectSections(projectIds).then((rows) => {
      if (rows) rows.forEach(applyRemoteSection)
      pushChangedSections()
    })

    // 2. Debounced push on local store changes.
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        pushChangedSections()
      }, DEBOUNCE_MS)
    }
    const unsubShoot = useShootStore.subscribe(schedule)
    const unsubEvent = useEventStore.subscribe(schedule)

    // 3. Realtime: apply remote section changes live.
    const channel = client
      .channel('brand-ops-project-sections')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_sections' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            applyRemoteSection(payload.new as ProjectSectionRow)
          }
        },
      )
      .subscribe()

    return () => {
      if (timer) {
        clearTimeout(timer)
        pushChangedSections()  // flush a pending edit on unmount
      }
      unsubShoot()
      unsubEvent()
      client.removeChannel(channel)
    }
  }, [])
}
