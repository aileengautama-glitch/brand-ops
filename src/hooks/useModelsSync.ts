/**
 * useModelsSync — bidirectional sync of normalized models (Phase E5).
 * Mounted once in AppShell.
 *
 * Pattern mirrors useProductsSync exactly:
 *   - Load (MERGE, seed-safe): apply remote rows, push local-only UUID models.
 *     Never wholesale-replaces the local array.
 *   - Push (debounced, value-deduped): upserts changed models, deletes removed ones.
 *     sort_order = current array index (no reorder UI today; preserves insertion order).
 *   - Realtime: models INSERT/UPDATE → apply row directly (no join fetch needed);
 *     DELETE → remove from store.
 *
 * Conflict model: per-model last-write-wins.
 *
 * Coexistence caveats:
 *   - Only UUID-id models sync; seed records (seed-sh-md-*) remain local-only.
 *   - References in styling_item_models and DDayTimelineRow.modelIds are soft
 *     text refs.  If a referenced model isn't yet loaded locally, the UI renders
 *     the chip as absent — self-heals once the model row is applied.
 *   - sort_order tracks array index (not a user-visible order field). If array
 *     order diverges across devices, the first device to push wins.  A moveModel
 *     action would require emitting sort_order changes — deferred to E5+.
 *   - FK upgrade (styling_item_models.model_id → uuid FK) deferred to E5B.
 */
import { useEffect } from 'react'
import { useShootStore } from '@/store/useShootStore'
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import {
  supabaseFetchModels,
  supabasePushModel,
  supabaseDeleteModel,
} from '@/repositories/models'
import type { Model } from '@/types/shoot'
import type { ModelRow } from '@/lib/supabase.types'

const DEBOUNCE_MS = 1200

// modelId → content JSON known to match remote (echo-loop / value-dedup).
const lastSynced = new Map<string, string>()

function modelJson(m: Model): string {
  return JSON.stringify({
    name: m.name,
    agency: m.agency,
    imageId: m.imageId,
    height: m.height,
    shoeSize: m.shoeSize,
    apparelSize: m.apparelSize,
    dressSize: m.dressSize,
    generalMeasurements: m.generalMeasurements,
    notes: m.notes,
    createdAt: m.createdAt,
  })
}

function findProjectIdForModel(modelId: string): string | null {
  for (const proj of useShootStore.getState().projects) {
    if ((proj.models ?? []).some((m) => m.id === modelId)) return proj.id
  }
  return null
}

// ─── Apply remote → store ─────────────────────────────────────────────────────

function applyRemoteModel(projectId: string, model: Model): void {
  if (!isValidUUID(model.id) || !isValidUUID(projectId)) return
  const json = modelJson(model)
  if (lastSynced.get(model.id) === json) return
  lastSynced.set(model.id, json)
  useShootStore.getState().upsertModel(projectId, model)
}

function applyRemoteDelete(modelId: string): void {
  if (!isValidUUID(modelId)) return
  lastSynced.delete(modelId)
  const projectId = findProjectIdForModel(modelId)
  if (projectId) useShootStore.getState().removeModel(projectId, modelId)
}

// ─── Push local → remote (debounced, deduped, success-gated) ──────────────────

function pushChangedModels(): void {
  const projects = useShootStore.getState().projects

  // Build the current set of sync-eligible model IDs.
  const currentIds = new Set<string>()
  for (const proj of projects) {
    for (const m of proj.models ?? []) {
      if (isValidUUID(m.id) && isValidUUID(proj.id)) currentIds.add(m.id)
    }
  }

  // Deletions: ids we last synced that are no longer present locally.
  for (const id of [...lastSynced.keys()]) {
    if (!currentIds.has(id)) {
      lastSynced.delete(id)
      void supabaseDeleteModel(id)
    }
  }

  // Inserts / updates: push anything whose content has changed.
  for (const proj of projects) {
    if (!isValidUUID(proj.id)) continue
    const models = proj.models ?? []
    for (let i = 0; i < models.length; i++) {
      const model = models[i]
      if (!isValidUUID(model.id)) continue
      const json = modelJson(model)
      if (lastSynced.get(model.id) === json) continue
      // Pass array index as sort_order so remote order tracks local array order.
      void supabasePushModel(model, proj.id, i).then((ok) => {
        if (ok) lastSynced.set(model.id, json)
      })
    }
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useModelsSync(): void {
  useEffect(() => {
    const client = supabase
    if (!client) return

    // 1. Load: fetch remote models, merge into store (seed-safe), then push
    //    any local-only UUID models not yet on the server.
    const projectIds = useShootStore.getState().projects.map((p) => p.id)
    supabaseFetchModels(projectIds).then((rows) => {
      if (rows) rows.forEach(({ projectId, model }) => applyRemoteModel(projectId, model))
      pushChangedModels()
    })

    // 2. Debounced push: schedule a push on any store change.
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        pushChangedModels()
      }, DEBOUNCE_MS)
    }
    const unsub = useShootStore.subscribe(schedule)

    // 3. Realtime: models are simple rows — apply the payload directly without
    //    a secondary fetch (unlike styling which needs join reassembly).
    const channel = client
      .channel('brand-ops-models')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'models' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as ModelRow
            if (row.id && row.project_id) {
              const model: Model = {
                id:                   row.id,
                name:                 row.name,
                agency:               row.agency,
                imageId:              row.image_id,
                height:               row.height,
                shoeSize:             row.shoe_size,
                apparelSize:          row.apparel_size,
                dressSize:            row.dress_size,
                generalMeasurements:  row.general_measurements,
                notes:                row.notes,
                createdAt:            row.created_at,
              }
              applyRemoteModel(row.project_id, model)
            }
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as { id?: string }
            if (old.id) applyRemoteDelete(old.id)
          }
        },
      )
      .subscribe()

    return () => {
      // Flush any pending debounced push before unmount.
      if (timer) {
        clearTimeout(timer)
        pushChangedModels()
      }
      unsub()
      client.removeChannel(channel)
    }
  }, [])
}
