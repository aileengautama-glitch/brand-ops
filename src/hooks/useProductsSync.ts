/**
 * useProductsSync — bidirectional sync of normalized product rows (Phase E4B).
 * Mounted once in AppShell.
 *
 * This is row-level sync (one DB row per product), unlike the JSON-blob section
 * sync (E3).  Pattern mirrors useTaskSync but with value-dedup echo prevention.
 *
 * Directions:
 *   1. Load (MERGE, seed-safe): fetch product rows → upsert each into the store
 *      (remote authoritative for products that exist remotely).  Local UUID
 *      products NOT in remote are pushed up to seed.  CRITICAL: never
 *      wholesale-replaces the local array, so an empty remote table on first
 *      run cannot wipe local products.
 *   2. Push (debounced): diff store vs lastSynced → upsert changed products,
 *      delete products that were removed locally.
 *   3. Realtime: apply remote INSERT/UPDATE/DELETE into the store.
 *
 * Echo-loop prevention — value dedup per product id:
 *   lastSynced[productId] = content JSON known to match remote.  Applying remote
 *   sets it; the debounced push skips when the rebuilt product equals it.
 *
 * Failure safety: lastSynced set only AFTER a confirmed push (failed pushes
 * retry).  Local Zustand is always the immediate write target.
 *
 * Migration coexistence: only UUID-id products sync.  Seed/legacy non-UUID
 * products stay local-only and render from the store exactly as before.
 *
 * Conflict model: per-product last-write-wins.
 */
import { useEffect } from 'react'
import { useShootStore } from '@/store/useShootStore'
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import {
  supabaseFetchProducts,
  supabasePushProduct,
  supabaseDeleteProduct,
  rowToProduct,
} from '@/repositories/products'
import type { Product } from '@/types/shoot'
import type { ProductRow } from '@/lib/supabase.types'

const DEBOUNCE_MS = 1200

// productId → content JSON known to match remote.
const lastSynced = new Map<string, string>()

/** Stable content signature for a product (excludes nothing — full row). */
function productJson(p: Product): string {
  return JSON.stringify({
    name: p.name, category: p.category, ownership: p.ownership,
    imageId: p.imageId, usps: p.usps, order: p.order, createdAt: p.createdAt,
  })
}

/** Find which project currently owns a given product id (for routing). */
function findProjectIdForProduct(productId: string): string | null {
  for (const proj of useShootStore.getState().projects) {
    if ((proj.products ?? []).some((x) => x.id === productId)) return proj.id
  }
  return null
}

// ─── Apply remote → store ─────────────────────────────────────────────────────

function applyRemoteProduct(row: ProductRow): void {
  if (!isValidUUID(row.id) || !isValidUUID(row.project_id)) return
  const product = rowToProduct(row)
  const json = productJson(product)
  if (lastSynced.get(row.id) === json) return  // already in sync
  lastSynced.set(row.id, json)
  useShootStore.getState().upsertProduct(row.project_id, product)
}

function applyRemoteDelete(productId: string): void {
  if (!isValidUUID(productId)) return
  lastSynced.delete(productId)
  const projectId = findProjectIdForProduct(productId)
  if (projectId) useShootStore.getState().removeProduct(projectId, productId)
}

// ─── Push local → remote (debounced, deduped, success-gated) ──────────────────

function pushChangedProducts(): void {
  const projects = useShootStore.getState().projects

  // Current UUID product ids across all shoot projects.
  const currentIds = new Set<string>()
  for (const proj of projects) {
    for (const product of proj.products ?? []) {
      if (isValidUUID(product.id) && isValidUUID(proj.id)) currentIds.add(product.id)
    }
  }

  // Deletions: ids we previously synced that are gone locally.
  for (const id of [...lastSynced.keys()]) {
    if (!currentIds.has(id)) {
      lastSynced.delete(id)
      void supabaseDeleteProduct(id)
    }
  }

  // Inserts / updates.
  for (const proj of projects) {
    if (!isValidUUID(proj.id)) continue
    for (const product of proj.products ?? []) {
      if (!isValidUUID(product.id)) continue
      const json = productJson(product)
      if (lastSynced.get(product.id) === json) continue
      void supabasePushProduct(product, proj.id).then((ok) => {
        if (ok) lastSynced.set(product.id, json)
      })
    }
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProductsSync(): void {
  useEffect(() => {
    const client = supabase
    if (!client) return

    // 1. Load (merge, seed-safe).
    const projectIds = useShootStore.getState().projects.map((p) => p.id)
    supabaseFetchProducts(projectIds).then((rows) => {
      if (rows) rows.forEach(applyRemoteProduct)
      pushChangedProducts()  // seed remote from local UUID products not yet there
    })

    // 2. Debounced push on store changes.
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        pushChangedProducts()
      }, DEBOUNCE_MS)
    }
    const unsub = useShootStore.subscribe(schedule)

    // 3. Realtime.
    const channel = client
      .channel('brand-ops-products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            applyRemoteProduct(payload.new as ProductRow)
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
        pushChangedProducts()
      }
      unsub()
      client.removeChannel(channel)
    }
  }, [])
}
