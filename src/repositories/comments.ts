/**
 * Comment repository — threaded comments on tasks, shots, and collaterals.
 *
 * Architecture (Phase A → C):
 *   - ICommentRepository methods delegate to useCommentStore (localStorage).
 *   - supabaseXxx helpers push/pull to the remote comments table.
 *     Called by useCommentSync; never by UI components directly.
 *
 * Data-shape notes:
 *   - Comment.projectId: required for Supabase FK; '' on pre-Phase-C local data
 *     (those comments will be skipped by isValidUUID guard).
 *   - author_id stays null until Phase E (Supabase Auth).
 *     author_local_id stores the local APP_USERS id for attribution.
 */
import { useCommentStore } from '@/store/useCommentStore'
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { Comment, CommentEntityType } from '@/types/common'
import type { CommentRow } from '@/lib/supabase.types'
import type { ICommentRepository, NewComment } from './_types'

// ─── ICommentRepository (UI-facing, store-backed) ────────────────────────────

export const CommentRepository: ICommentRepository = {
  async getFor(entityType: CommentEntityType, entityId: string): Promise<Comment[]> {
    return useCommentStore.getState().getFor(entityType, entityId)
  },

  async addComment(data: NewComment): Promise<Comment> {
    useCommentStore.getState().addComment(data)
    const comments = useCommentStore.getState().getFor(data.entityType, data.entityId)
    return comments[comments.length - 1]
  },

  async removeComment(commentId: string): Promise<void> {
    useCommentStore.getState().removeComment(commentId)
  },
}

// ─── Row ↔ local type conversions ────────────────────────────────────────────

/** Converts a Supabase CommentRow to a local Comment. */
export function commentRowToLocal(row: CommentRow): Comment {
  return {
    id:           row.id,
    projectId:    row.project_id,
    entityType:   row.entity_type,
    entityId:     row.entity_id,
    authorUserId: row.author_local_id,
    body:         row.body,
    createdAt:    row.created_at,
  }
}

// ─── Supabase sync helpers (called by useCommentSync only) ────────────────────

/**
 * Fetch all comments for all entity IDs that belong to a set of project IDs.
 * Returns null if Supabase is not configured.
 */
export async function supabaseFetchCommentsByProject(
  projectIds: string[]
): Promise<CommentRow[] | null> {
  const client = supabase
  if (!client) return null

  const validIds = projectIds.filter(isValidUUID)
  if (validIds.length === 0) return null

  const { data, error } = await client
    .from('comments')
    .select('*')
    .in('project_id', validIds)
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('[CommentSync] fetch failed:', error.message)
    return null
  }
  return data
}

/**
 * Insert a comment into Supabase.
 * Skips if:
 *   - Supabase not configured
 *   - comment.id, projectId, or entityId are not valid UUIDs
 *     (pre-Phase-C data and seed entity IDs)
 */
export async function supabasePushComment(comment: Comment): Promise<void> {
  const client = supabase
  if (!client) return
  if (
    !isValidUUID(comment.id) ||
    !isValidUUID(comment.projectId) ||
    !isValidUUID(comment.entityId)
  ) return

  const { error } = await client.from('comments').upsert(
    {
      id:               comment.id,
      project_id:       comment.projectId,
      entity_type:      comment.entityType,
      entity_id:        comment.entityId,
      author_id:        null,                   // Phase E: Supabase auth UUID
      author_local_id:  comment.authorUserId,
      body:             comment.body,
    },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  if (error) console.warn('[CommentSync] push failed:', comment.id, error.message)
}

/**
 * Delete a comment from Supabase.
 */
export async function supabaseDeleteComment(commentId: string): Promise<void> {
  const client = supabase
  if (!client) return
  if (!isValidUUID(commentId)) return

  const { error } = await client.from('comments').delete().eq('id', commentId)
  if (error) console.warn('[CommentSync] delete failed:', commentId, error.message)
}
