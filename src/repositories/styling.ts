/**
 * Styling repository — normalized styling + relational join tables (E4C/D).
 *
 *   styling_items          — scalar fields (code, name, image, order)
 *   styling_item_products  — m:n styling↔products (real FK to products)
 *   styling_item_models    — m:n styling↔models (soft model_id ref)
 *
 * A local Styling is reconstructed (assembled) from one styling_items row plus
 * its join rows.  Called by useStylingSync only.
 *
 * Push order: upsert styling_items (parent, must exist for join FKs) → replace
 * its join rows.  Join inserts are filtered to valid-UUID product ids and are
 * best-effort: a product not yet synced makes that link retry on the next load
 * (eventual consistency).
 */
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { Styling } from '@/types/shoot'
import type {
  StylingItemRow,
  StylingItemProductRow,
  StylingItemModelRow,
} from '@/lib/supabase.types'

export interface AssembledStyling {
  projectId: string
  styling:   Styling
}

// ─── Mapping / assembly ───────────────────────────────────────────────────────

export function stylingItemToRow(s: Styling, projectId: string) {
  return {
    id:           s.id,
    project_id:   projectId,
    styling_code: s.stylingCode,
    name:         s.name,
    image_id:     s.imageId,
    sort_order:   s.order,
    created_at:   s.createdAt,
    updated_at:   new Date().toISOString(),
  }
}

function assembleStyling(
  item:         StylingItemRow,
  productLinks: StylingItemProductRow[],
  modelLinks:   StylingItemModelRow[],
): Styling {
  const productIds = productLinks
    .filter((l) => l.styling_item_id === item.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((l) => l.product_id)
  const modelIds = modelLinks
    .filter((l) => l.styling_item_id === item.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((l) => l.model_id)

  return {
    id:          item.id,
    stylingCode: item.styling_code,
    name:        item.name,
    imageId:     item.image_id,
    productIds,
    modelIds,
    order:       item.sort_order,
    createdAt:   item.created_at,
  }
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

/** Fetch + assemble all stylings for a set of projects. Null if Supabase off. */
export async function supabaseFetchStylingData(projectIds: string[]): Promise<AssembledStyling[] | null> {
  const client = supabase
  if (!client) return null

  const validIds = projectIds.filter(isValidUUID)
  if (validIds.length === 0) return null

  const { data: items, error } = await client
    .from('styling_items')
    .select('*')
    .in('project_id', validIds)
    .order('sort_order', { ascending: true })

  if (error) {
    console.warn('[Styling] fetch failed:', error.message)
    return null
  }
  if (!items || items.length === 0) return []

  const itemIds = items.map((i) => i.id)
  const [{ data: productLinks }, { data: modelLinks }] = await Promise.all([
    client.from('styling_item_products').select('*').in('styling_item_id', itemIds),
    client.from('styling_item_models').select('*').in('styling_item_id', itemIds),
  ])

  return items.map((item) => ({
    projectId: item.project_id,
    styling:   assembleStyling(item, productLinks ?? [], modelLinks ?? []),
  }))
}

/** Fetch + assemble ONE styling (used by realtime). Null if not found. */
export async function supabaseFetchStylingItem(stylingItemId: string): Promise<AssembledStyling | null> {
  const client = supabase
  if (!client) return null

  const { data: item } = await client
    .from('styling_items')
    .select('*')
    .eq('id', stylingItemId)
    .maybeSingle()
  if (!item) return null

  const [{ data: productLinks }, { data: modelLinks }] = await Promise.all([
    client.from('styling_item_products').select('*').eq('styling_item_id', stylingItemId),
    client.from('styling_item_models').select('*').eq('styling_item_id', stylingItemId),
  ])

  return {
    projectId: item.project_id,
    styling:   assembleStyling(item, productLinks ?? [], modelLinks ?? []),
  }
}

// ─── Push / delete ────────────────────────────────────────────────────────────

/**
 * Upsert a styling (parent row + reconcile join rows).
 * Returns true if the parent upsert succeeded (joins are best-effort).
 */
export async function supabasePushStyling(styling: Styling, projectId: string): Promise<boolean> {
  const client = supabase
  if (!client) return false
  if (!isValidUUID(styling.id) || !isValidUUID(projectId)) return false

  // 1. Parent first — join FKs require it to exist. Bumps updated_at (beacon).
  const { error } = await client
    .from('styling_items')
    .upsert(stylingItemToRow(styling, projectId), { onConflict: 'id', ignoreDuplicates: false })
  if (error) {
    console.warn('[Styling] push failed:', styling.id, error.message)
    return false
  }

  // 2. Reconcile product links (real FK → filter to valid-UUID product ids).
  const productIds = styling.productIds.filter(isValidUUID)
  await client.from('styling_item_products').delete().eq('styling_item_id', styling.id)
  if (productIds.length > 0) {
    const rows = productIds.map((pid, i) => ({
      styling_item_id: styling.id, product_id: pid, sort_order: i,
    }))
    const { error: e } = await client.from('styling_item_products').insert(rows)
    // FK violation = referenced product not yet synced; self-heals on next load.
    if (e) console.warn('[Styling] product links (will retry):', styling.id, e.message)
  }

  // 3. Reconcile model links (soft ref — keep ids as-is).
  await client.from('styling_item_models').delete().eq('styling_item_id', styling.id)
  if (styling.modelIds.length > 0) {
    const rows = styling.modelIds.map((mid, i) => ({
      styling_item_id: styling.id, model_id: mid, sort_order: i,
    }))
    const { error: e } = await client.from('styling_item_models').insert(rows)
    if (e) console.warn('[Styling] model links:', styling.id, e.message)
  }

  return true
}

/** Delete a styling (cascade removes its join rows). */
export async function supabaseDeleteStyling(stylingId: string): Promise<void> {
  const client = supabase
  if (!client) return
  if (!isValidUUID(stylingId)) return

  const { error } = await client.from('styling_items').delete().eq('id', stylingId)
  if (error) console.warn('[Styling] delete failed:', stylingId, error.message)
}
