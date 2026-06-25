/**
 * Products repository — normalized product rows (Phase E4).
 *
 * Architecture:
 *   - ShootProject.products[] (Zustand) stays the UI's read/write target.
 *   - These helpers map products ↔ the normalized `products` table and are
 *     called by useProductsSync (never by UI components directly).
 *
 * Data-shape notes:
 *   - id reuses the local Product.id (UUID-guarded by the sync).
 *   - image_id is the media/IndexedDB key (soft ref; asset syncs via media table).
 *   - usps stored as JSONB ([{id,text}]).
 *   - sort_order ↔ Product.order (Date.now()-based; bigint column).
 */
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { Product, ProductUSP } from '@/types/shoot'
import type { Json, ProductRow } from '@/lib/supabase.types'

// ─── Mapping ──────────────────────────────────────────────────────────────────

/** Local Product → row (for insert/upsert). */
export function productToRow(product: Product, projectId: string) {
  return {
    id:         product.id,
    project_id: projectId,
    name:       product.name,
    category:   product.category,
    ownership:  product.ownership,
    image_id:   product.imageId,
    flatlay_image_id: product.flatlayImageId ?? '',
    usps:       product.usps as unknown as Json,
    sort_order: product.order,
    created_at: product.createdAt,
    updated_at: new Date().toISOString(),
  }
}

/** Row → local Product. */
export function rowToProduct(row: ProductRow): Product {
  return {
    id:        row.id,
    name:      row.name,
    imageId:   row.image_id,
    flatlayImageId: row.flatlay_image_id ?? '',
    usps:      (row.usps as unknown as ProductUSP[]) ?? [],
    ownership: (row.ownership as Product['ownership']) ?? '',
    category:  row.category,
    order:     row.sort_order,
    createdAt: row.created_at,
  }
}

// ─── Supabase helpers (called by useProductsSync only) ───────────────────────

/** Fetch all product rows for a set of projects. Null if Supabase off. */
export async function supabaseFetchProducts(projectIds: string[]): Promise<ProductRow[] | null> {
  const client = supabase
  if (!client) return null

  const validIds = projectIds.filter(isValidUUID)
  if (validIds.length === 0) return null

  const { data, error } = await client
    .from('products')
    .select('*')
    .in('project_id', validIds)
    .order('sort_order', { ascending: true })

  if (error) {
    console.warn('[Products] fetch failed:', error.message)
    return null
  }
  return data as ProductRow[]
}

/**
 * Upsert one product row. Returns true on a confirmed write so the caller can
 * mark it synced and let failed pushes retry. Skips non-UUID ids (seed/legacy).
 */
export async function supabasePushProduct(product: Product, projectId: string): Promise<boolean> {
  const client = supabase
  if (!client) return false
  if (!isValidUUID(product.id) || !isValidUUID(projectId)) return false

  const { error } = await client
    .from('products')
    .upsert(productToRow(product, projectId), { onConflict: 'id', ignoreDuplicates: false })

  if (error) {
    console.warn('[Products] push failed:', product.id, error.message)
    return false
  }
  return true
}

/** Delete a product row by id. */
export async function supabaseDeleteProduct(productId: string): Promise<void> {
  const client = supabase
  if (!client) return
  if (!isValidUUID(productId)) return

  const { error } = await client.from('products').delete().eq('id', productId)
  if (error) console.warn('[Products] delete failed:', productId, error.message)
}
