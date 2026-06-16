import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Share token ──────────────────────────────────────────────────────────────
// A thin abstraction over shareable deck links.  Currently the "token" IS
// just the project ID (the URL is /share/event/:id/brief-deck).  When a real
// auth backend is added, swap generateToken to produce opaque UUIDs and add
// a server-side lookup instead of reading from the local store.

export type DeckType = 'brief-deck'
export type ShareModule = 'event' | 'shoot'

export interface ShareEntry {
  token: string       // currently === projectId; future: opaque UUID
  module: ShareModule
  projectId: string
  deckType: DeckType
  createdAt: string
}

interface ShareStoreState {
  tokens: Record<string, ShareEntry>   // token → entry
  /** Returns or creates a stable share token for the given deck. */
  getOrCreateToken: (module: ShareModule, projectId: string, deckType: DeckType) => string
  /** Resolves a token to its share entry, or null if unknown. */
  resolve: (token: string) => ShareEntry | null
  /** Removes the share token for a deck (revokes the link). */
  revoke: (token: string) => void
}

export const useShareStore = create<ShareStoreState>()(
  persist(
    (set, get) => ({
      tokens: {},

      getOrCreateToken: (module, projectId, deckType) => {
        const existing = Object.values(get().tokens).find(
          (e) => e.module === module && e.projectId === projectId && e.deckType === deckType
        )
        if (existing) return existing.token

        // Current implementation: token = projectId (predictable, easy to deep-link)
        // Future: token = crypto.randomUUID()
        const token = projectId
        const entry: ShareEntry = { token, module, projectId, deckType, createdAt: new Date().toISOString() }
        set((s) => ({ tokens: { ...s.tokens, [token]: entry } }))
        return token
      },

      resolve: (token) => get().tokens[token] ?? null,

      revoke: (token) =>
        set((s) => {
          const next = { ...s.tokens }
          delete next[token]
          return { tokens: next }
        }),
    }),
    { name: 'brand-ops-share-v1' }
  )
)
