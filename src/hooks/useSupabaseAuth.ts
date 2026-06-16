/**
 * useSupabaseAuth — Phase 6A: mount the Supabase Auth session foundation once.
 *
 * Restores any existing session and subscribes to auth-state changes (via useAuthStore.init).
 * No-op when Supabase is not configured. Purely additive session plumbing — it does NOT
 * change the existing local login flow (LoginGate / useUserStore), RLS, or read authority.
 *
 * To test (dev, with Supabase configured), from the console:
 *   await useAuthStore.getState().signIn('you@example.com', 'password')
 *   useAuthStore.getState()   // → { status: 'signedIn', authUser, linkedPersonId }
 */
import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'

export function useSupabaseAuth(): void {
  useEffect(() => {
    const unsub = useAuthStore.getState().init()
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
