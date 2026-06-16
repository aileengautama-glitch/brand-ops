/**
 * useDeckSnapshotSync — publishes deck snapshots to Supabase (AppShell, once).
 *
 * One-directional (local → remote): serialises the deck-visible slice of every
 * valid-UUID project and upserts it into deck_snapshots so /share/* routes can
 * render on a fresh device.  The editor never reads snapshots back, so there is
 * no echo loop, no realtime, and no merge logic — far simpler than task/comment
 * sync.
 *
 * Trigger model: debounced + deduped.
 *   - On mount: publish once (covers app-load / first run).
 *   - On any store change: debounce, then publish only the projects whose deck
 *     slice actually changed (JSON-compared against the last published payload).
 *
 * No-op when Supabase isn't configured.
 */
import { useEffect } from 'react'
import { useEventStore } from '@/store/useEventStore'
import { useShootStore } from '@/store/useShootStore'
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import { supabasePublishDeckSnapshot } from '@/repositories/deckSnapshots'
import { buildEventDeckData, buildShootDeckData } from '@/lib/deckSnapshot'
import type { Json } from '@/lib/supabase.types'

const DEBOUNCE_MS = 1500

// Module-level dedupe: projectId → last published payload JSON.
// Reset on full page reload (one idempotent upsert per project per load).
const lastPublished = new Map<string, string>()

/** Build + publish snapshots for any project whose deck slice changed. */
function publishChangedSnapshots(): void {
  for (const p of useEventStore.getState().projects) {
    if (!isValidUUID(p.id)) continue
    const data = buildEventDeckData(p)
    const json = JSON.stringify(data)
    if (lastPublished.get(p.id) === json) continue
    lastPublished.set(p.id, json)
    void supabasePublishDeckSnapshot(p.id, 'event', p.name, data as unknown as Json)
  }

  for (const p of useShootStore.getState().projects) {
    if (!isValidUUID(p.id)) continue
    const data = buildShootDeckData(p)
    const json = JSON.stringify(data)
    if (lastPublished.get(p.id) === json) continue
    lastPublished.set(p.id, json)
    void supabasePublishDeckSnapshot(p.id, 'shoot', p.name, data as unknown as Json)
  }
}

export function useDeckSnapshotSync(): void {
  useEffect(() => {
    const client = supabase
    if (!client) return

    // Initial publish on mount.
    publishChangedSnapshots()

    // Debounced publish on store changes.
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        publishChangedSnapshots()
      }, DEBOUNCE_MS)
    }

    const unsubEvent = useEventStore.subscribe(schedule)
    const unsubShoot = useShootStore.subscribe(schedule)

    return () => {
      if (timer) {
        clearTimeout(timer)
        // Flush a pending debounced change so a last-second edit isn't lost.
        publishChangedSnapshots()
      }
      unsubEvent()
      unsubShoot()
    }
  }, [])
}
