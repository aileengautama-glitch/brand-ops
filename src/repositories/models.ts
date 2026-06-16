/**
 * Models repository — normalized models table (Phase E5).
 *
 * Models are per-project entities stored as individual rows.  Each row maps
 * 1:1 to the local `Model` interface.  No join tables — model references from
 * styling and D-Day rows are soft text refs (FK upgrade deferred to E5B).
 *
 * sort_order is the 0-based array index at push time (no reorder UI today).
 * Fetches are ordered by sort_order ASC so the remote array order is preserved.
 */
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { Model } from '@/types/shoot'
import type { ModelRow } from '@/lib/supabase.types'

// ─── Mapping ──────────────────────────────────────────────────────────────────

function modelToRow(model: Model, projectId: string, sortOrder: number) {
  return {
    id:                   model.id,
    project_id:           projectId,
    name:                 model.name,
    agency:               model.agency,
    image_id:             model.imageId,
    height:               model.height,
    shoe_size:            model.shoeSize,
    apparel_size:         model.apparelSize,
    dress_size:           model.dressSize,
    general_measurements: model.generalMeasurements,
    notes:                model.notes,
    sort_order:           sortOrder,
    created_at:           model.createdAt,
    updated_at:           new Date().toISOString(),
  }
}

function rowToModel(row: ModelRow): Model {
  return {
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
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Fetch all models for a set of projects.
 * Returns null if Supabase is not configured.
 * Returns an empty array if there are no remote models.
 */
export async function supabaseFetchModels(
  projectIds: string[],
): Promise<Array<{ projectId: string; model: Model }> | null> {
  const client = supabase
  if (!client) return null

  const validIds = projectIds.filter(isValidUUID)
  if (validIds.length === 0) return null

  const { data, error } = await client
    .from('models')
    .select('*')
    .in('project_id', validIds)
    .order('sort_order', { ascending: true })

  if (error) {
    console.warn('[Models] fetch failed:', error.message)
    return null
  }

  return (data ?? []).map((row) => ({
    projectId: row.project_id,
    model: rowToModel(row),
  }))
}

// ─── Push / delete ────────────────────────────────────────────────────────────

/**
 * Upsert a model row.  sortOrder is the 0-based position in the local models
 * array — used to reconstruct remote order on load.
 * Returns true if the upsert succeeded.
 */
export async function supabasePushModel(
  model: Model,
  projectId: string,
  sortOrder: number,
): Promise<boolean> {
  const client = supabase
  if (!client) return false
  if (!isValidUUID(model.id) || !isValidUUID(projectId)) return false

  const { error } = await client
    .from('models')
    .upsert(modelToRow(model, projectId, sortOrder), {
      onConflict: 'id',
      ignoreDuplicates: false,
    })

  if (error) {
    console.warn('[Models] push failed:', model.id, error.message)
    return false
  }
  return true
}

/** Delete a model row.  No-op for non-UUID ids. */
export async function supabaseDeleteModel(modelId: string): Promise<void> {
  const client = supabase
  if (!client) return
  if (!isValidUUID(modelId)) return

  const { error } = await client.from('models').delete().eq('id', modelId)
  if (error) console.warn('[Models] delete failed:', modelId, error.message)
}
