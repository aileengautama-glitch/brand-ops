/**
 * useStylingSync — bidirectional sync of normalized styling (Phase E4C/D).
 * Mounted once in AppShell.  Depends on the products foundation (E4B).
 *
 * Each styling = one styling_items row + join rows (products/models).  The
 * styling_items row is the realtime "beacon": we always upsert it on any styling
 * change (scalar OR links), so a single subscription drives live updates — the
 * handler refetches that item's joins and rebuilds the full Styling.
 *
 * Directions / safety mirror useProductsSync:
 *   - Load (MERGE, seed-safe): apply remote, push local-only UUID stylings.
 *     Never wholesale-replaces the local array.
 *   - Push (debounced): value-dedup per styling id; reconcile joins; delete
 *     removed stylings.
 *   - Realtime: styling_items INSERT/UPDATE → refetch+rebuild; DELETE → remove.
 *
 * Conflict model: per-styling last-write-wins.
 *
 * Coexistence caveats:
 *   - Only UUID-id stylings sync; legacy/seed stay local-only.
 *   - Product links require the referenced product to be synced (E4B); a
 *     not-yet-synced product link retries on next load (eventual consistency).
 *   - model links are soft refs (models still local-only).
 */
import { useEffect } from 'react'
import { useShootStore } from '@/store/useShootStore'
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import {
  supabaseFetchStylingData,
  supabaseFetchStylingItem,
  supabasePushStyling,
  supabaseDeleteStyling,
} from '@/repositories/styling'
import type { Styling } from '@/types/shoot'
import type { AssembledStyling } from '@/repositories/styling'

const DEBOUNCE_MS = 1200

// stylingId → content JSON known to match remote.
const lastSynced = new Map<string, string>()

function stylingJson(s: Styling): string {
  return JSON.stringify({
    stylingCode: s.stylingCode, name: s.name, imageId: s.imageId,
    productIds: s.productIds, modelIds: s.modelIds,
    order: s.order, createdAt: s.createdAt,
  })
}

function findProjectIdForStyling(stylingId: string): string | null {
  for (const proj of useShootStore.getState().projects) {
    if ((proj.stylings ?? []).some((s) => s.id === stylingId)) return proj.id
  }
  return null
}

// ─── Apply remote → store ─────────────────────────────────────────────────────

function applyRemoteStyling(assembled: AssembledStyling): void {
  const { projectId, styling } = assembled
  if (!isValidUUID(styling.id) || !isValidUUID(projectId)) return
  const json = stylingJson(styling)
  if (lastSynced.get(styling.id) === json) return
  lastSynced.set(styling.id, json)
  useShootStore.getState().upsertStyling(projectId, styling)
}

function applyRemoteDelete(stylingId: string): void {
  if (!isValidUUID(stylingId)) return
  lastSynced.delete(stylingId)
  const projectId = findProjectIdForStyling(stylingId)
  if (projectId) useShootStore.getState().removeStyling(projectId, stylingId)
}

// ─── Push local → remote (debounced, deduped, success-gated) ──────────────────

function pushChangedStylings(): void {
  const projects = useShootStore.getState().projects

  const currentIds = new Set<string>()
  for (const proj of projects) {
    for (const s of proj.stylings ?? []) {
      if (isValidUUID(s.id) && isValidUUID(proj.id)) currentIds.add(s.id)
    }
  }

  // Deletions.
  for (const id of [...lastSynced.keys()]) {
    if (!currentIds.has(id)) {
      lastSynced.delete(id)
      void supabaseDeleteStyling(id)
    }
  }

  // Inserts / updates.
  for (const proj of projects) {
    if (!isValidUUID(proj.id)) continue
    for (const styling of proj.stylings ?? []) {
      if (!isValidUUID(styling.id)) continue
      const json = stylingJson(styling)
      if (lastSynced.get(styling.id) === json) continue
      void supabasePushStyling(styling, proj.id).then((ok) => {
        if (ok) lastSynced.set(styling.id, json)
      })
    }
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStylingSync(): void {
  useEffect(() => {
    const client = supabase
    if (!client) return

    // 1. Load (merge, seed-safe).
    const projectIds = useShootStore.getState().projects.map((p) => p.id)
    supabaseFetchStylingData(projectIds).then((rows) => {
      if (rows) rows.forEach(applyRemoteStyling)
      pushChangedStylings()
    })

    // 2. Debounced push.
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        pushChangedStylings()
      }, DEBOUNCE_MS)
    }
    const unsub = useShootStore.subscribe(schedule)

    // 3. Realtime — styling_items is the beacon; refetch joins on change.
    const channel = client
      .channel('brand-ops-styling')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'styling_items' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as { id?: string }
            if (row.id) {
              supabaseFetchStylingItem(row.id).then((a) => { if (a) applyRemoteStyling(a) })
            }
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as { id?: string }
            if (old.id) applyRemoteDelete(old.id)
          }
        },
      )
      .subscribe()

    return () => {
      if (timer) {
        clearTimeout(timer)
        pushChangedStylings()
      }
      unsub()
      client.removeChannel(channel)
    }
  }, [])
}
