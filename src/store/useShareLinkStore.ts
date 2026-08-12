/**
 * useShareLinkStore — issued external links, so they can be revoked and expire.
 *
 * Scope travels in the URL (a link has to work on a device that has never seen the
 * project), but "is this link still allowed" cannot: that has to be looked up. This
 * store is that lookup — one record per issued link, keyed by an opaque token.
 *
 * Honest limitation: this is a local store, so revocation is enforced wherever the
 * store is present (the team's devices and any device that has synced). It is a
 * workflow control, not a cryptographic one — a recipient who saved the page still
 * has the copy they already loaded. Server-enforced revocation needs the share
 * tokens in Supabase, which is the natural next step.
 *
 * NOTE: new localStorage key (brand-ops-share-links-v1) — additive, nothing renamed.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ShareSectionKey } from '@/lib/shareSections'

export interface IssuedLink {
  token: string
  module: 'shoot' | 'event'
  projectId: string
  /** Preset key, or 'custom'. */
  preset: string
  /** Human label for the list, e.g. 'Photographer'. */
  label: string
  sections: ShareSectionKey[]
  createdAt: string
  /** ISO date; '' = never expires. */
  expiresAt: string
  revokedAt: string
  /** Optional note — who it went to. */
  recipient: string
}

export type LinkState = 'active' | 'revoked' | 'expired'

interface ShareLinkState {
  links: Record<string, IssuedLink>
  issue: (data: Omit<IssuedLink, 'token' | 'createdAt' | 'revokedAt'>) => IssuedLink
  revoke: (token: string) => void
  restore: (token: string) => void
  remove: (token: string) => void
  setExpiry: (token: string, expiresAt: string) => void
  forProject: (projectId: string) => IssuedLink[]
}

export function linkState(link: IssuedLink | null | undefined, now = new Date()): LinkState | 'unknown' {
  if (!link) return 'unknown'
  if (link.revokedAt) return 'revoked'
  if (link.expiresAt && link.expiresAt < now.toISOString().slice(0, 10)) return 'expired'
  return 'active'
}

export const useShareLinkStore = create<ShareLinkState>()(
  persist(
    (set, get) => ({
      links: {},

      issue: (data) => {
        const token = crypto.randomUUID().replace(/-/g, '').slice(0, 22)
        const link: IssuedLink = {
          ...data,
          token,
          createdAt: new Date().toISOString(),
          revokedAt: '',
        }
        set((s) => ({ links: { ...s.links, [token]: link } }))
        return link
      },

      revoke: (token) =>
        set((s) => {
          const l = s.links[token]
          if (!l) return s
          return { links: { ...s.links, [token]: { ...l, revokedAt: new Date().toISOString() } } }
        }),

      restore: (token) =>
        set((s) => {
          const l = s.links[token]
          if (!l) return s
          return { links: { ...s.links, [token]: { ...l, revokedAt: '' } } }
        }),

      remove: (token) =>
        set((s) => {
          const next = { ...s.links }
          delete next[token]
          return { links: next }
        }),

      setExpiry: (token, expiresAt) =>
        set((s) => {
          const l = s.links[token]
          if (!l) return s
          return { links: { ...s.links, [token]: { ...l, expiresAt } } }
        }),

      forProject: (projectId) =>
        Object.values(get().links)
          .filter((l) => l.projectId === projectId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }),
    { name: 'brand-ops-share-links-v1' }
  )
)
