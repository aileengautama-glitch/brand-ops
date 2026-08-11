/**
 * useNotificationStore — lightweight in-app notifications.
 *
 * Deliberately local-first and dependency-free: an approval being resolved has to
 * reach the project owner without adding a backend, an email provider or a new
 * table. Notifications are capped and persisted alongside the other local stores.
 *
 * NOTE: new localStorage key (brand-ops-notifications-v1) — additive, no existing
 * key is renamed or reused.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '@/lib/utils'

export type NotificationKind = 'approval' | 'gate' | 'task' | 'info'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  /** Route to open when the notification is clicked. */
  href: string
  /** Who this is addressed to (person name); '' = everyone. */
  audience: string
  createdAt: string
  read: boolean
}

const MAX = 50

interface NotificationState {
  notifications: AppNotification[]
  notify: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clear: () => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],

      notify: (n) =>
        set((s) => ({
          notifications: [
            { ...n, id: generateId(), createdAt: new Date().toISOString(), read: false },
            ...s.notifications,
          ].slice(0, MAX),
        })),

      markRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((x) => (x.id === id ? { ...x, read: true } : x)),
        })),

      markAllRead: () =>
        set((s) => ({ notifications: s.notifications.map((x) => ({ ...x, read: true })) })),

      clear: () => set({ notifications: [] }),
    }),
    { name: 'brand-ops-notifications-v1' }
  )
)
