/**
 * useAuthBridge — Phase 6D: bridge the Supabase auth identity → the app identity.
 *
 * When signed in AND reconciled to a people row, set useUserStore.currentUserId =
 * linkedPersonId. The Supabase session is authoritative when present, so a restored
 * linked session auto-logs-in. Bridges ONLY when linked; an unlinked signed-in user is
 * left at the gate (LoginGate shows a "not linked" state) — never silently bridged.
 *
 * The effect keys on [status, linkedPersonId] only, so clearing currentUserId locally
 * does not re-trigger it; sign-out goes through signOutEverywhere (which flips status to
 * 'signedOut'), so this never re-asserts after logout.
 *
 * No-op when Supabase is absent (status 'disabled'). Mounted once in AppShell.
 */
import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useUserStore } from '@/store/useUserStore'

export function useAuthBridge(): void {
  const status = useAuthStore((s) => s.status)
  const linkedPersonId = useAuthStore((s) => s.linkedPersonId)

  useEffect(() => {
    if (status !== 'signedIn' || !linkedPersonId) return
    if (useUserStore.getState().currentUserId !== linkedPersonId) {
      useUserStore.getState().setCurrentUser(linkedPersonId)
    }
  }, [status, linkedPersonId])
}
