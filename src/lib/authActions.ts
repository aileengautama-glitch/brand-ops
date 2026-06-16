/**
 * authActions — Phase 6D: full sign-out across both identity systems.
 *
 * "Sign out" must clear BOTH the local app user and any Supabase session, so the gate
 * returns cleanly and the identity bridge (useAuthBridge) never re-asserts. clearUser()
 * runs first (instant gate), then Supabase signOut() (a no-op when Supabase is absent or
 * there is no session) — safe for local-only users.
 */
import { useAuthStore } from '@/store/useAuthStore'
import { useUserStore } from '@/store/useUserStore'

export async function signOutEverywhere(): Promise<void> {
  useUserStore.getState().clearUser()         // instant: LoginGate reappears
  await useAuthStore.getState().signOut()      // clears the Supabase session (no-op if none)
}
