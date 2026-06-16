import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId, now } from '@/lib/utils'
import type { Comment, CommentEntityType } from '@/types/common'

// ─── State ────────────────────────────────────────────────────────────────────

interface CommentStoreState {
  comments: Comment[]

  /** Add a new comment. id and createdAt are auto-generated. */
  addComment: (data: Omit<Comment, 'id' | 'createdAt'>) => void

  /**
   * Upsert a comment that arrived from Supabase Realtime or an initial fetch.
   * The full Comment (including id + createdAt) is provided by the caller.
   * No-ops if the comment already exists with the same id.
   */
  upsertComment: (comment: Comment) => void

  /** Remove a comment by ID. Call-site should guard ownership before calling. */
  removeComment: (commentId: string) => void

  /**
   * Convenience selector — returns comments for a given entity in
   * chronological order. Call inside a component with useCommentStore(s => s.getFor(...)).
   */
  getFor: (entityType: CommentEntityType, entityId: string) => Comment[]
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCommentStore = create<CommentStoreState>()(
  persist(
    (set, get) => ({
      comments: [],

      addComment: (data) =>
        set((s) => ({
          comments: [
            ...s.comments,
            { ...data, id: generateId(), createdAt: now() },
          ],
        })),

      upsertComment: (comment) =>
        set((s) => ({
          comments: s.comments.some((c) => c.id === comment.id)
            ? s.comments  // already present — no-op (Realtime echo)
            : [...s.comments, comment],
        })),

      removeComment: (commentId) =>
        set((s) => ({
          comments: s.comments.filter((c) => c.id !== commentId),
        })),

      getFor: (entityType, entityId) =>
        get()
          .comments.filter(
            (c) => c.entityType === entityType && c.entityId === entityId
          )
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }),
    { name: 'brand-ops-comments-v1' }
  )
)
