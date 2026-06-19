/**
 * useAuthStore — Phase 6A: Supabase Auth session state (foundation).
 *
 * A NON-PERSISTED Zustand store (Supabase persists the session itself; this store adds
 * no localStorage key). It exposes the current auth session and a best-effort, READ-ONLY
 * reconciliation of the auth user → app `people` row. It does NOT touch useUserStore /
 * the local login flow, does NOT change RLS, and does NOT flip any read authority.
 *
 * Status:
 *   'disabled'  — Supabase not configured (local-only dev).
 *   'loading'   — restoring the session on mount.
 *   'signedOut' — no Supabase session.
 *   'signedIn'  — a Supabase session exists (authUser set).
 *
 * linkedPersonId: the people.id the auth user maps to. Under RLS (0003) this resolves
 * only once people.auth_user_id is linked server-side (a later slice); until then it is
 * null and the app keeps using its existing local identity (useUserStore.currentUserId).
 */
import { create } from 'zustand'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import {
  getSession,
  onAuthChange,
  signInWithPassword as sbSignIn,
  signOut as sbSignOut,
  toAuthUserLite,
  type AuthUserLite,
} from '@/lib/supabaseAuth'
import type { Session } from '@supabase/supabase-js'

export type AuthStatus = 'disabled' | 'loading' | 'signedOut' | 'signedIn'

interface AuthState {
  status: AuthStatus
  authUser: AuthUserLite | null
  /** people.id reconciled from the auth user (read-only); null until auth_user_id is linked. */
  linkedPersonId: string | null
  error: string | null
  /** True while in a "forgot password" recovery session (PASSWORD_RECOVERY) — show RecoveryPrompt. */
  recovery: boolean
  /** Restore the session + subscribe to changes. Returns an unsubscribe. Called once from AppShell. */
  init: () => () => void
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  /** Clear the recovery flag after the user sets a new password. */
  clearRecovery: () => void
}

// Best-effort, READ-ONLY reconciliation: auth user → app people row.
// Tries auth_user_id first, then email. Under RLS this returns null until linking exists
// (people writes are admin-only, so linking is a server-side step in a later slice).
async function reconcilePerson(authUser: AuthUserLite): Promise<string | null> {
  if (!supabase) return null
  const byAuthId = await supabase.from('people').select('id').eq('auth_user_id', authUser.id).maybeSingle()
  if (byAuthId.data?.id) return byAuthId.data.id
  if (authUser.email) {
    const byEmail = await supabase.from('people').select('id').eq('email', authUser.email).maybeSingle()
    if (byEmail.data?.id) return byEmail.data.id
  }
  return null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: isSupabaseEnabled ? 'loading' : 'disabled',
  authUser: null,
  linkedPersonId: null,
  error: null,
  recovery: false,

  init: () => {
    if (!isSupabaseEnabled) {
      set({ status: 'disabled' })
      return () => {}
    }

    const apply = async (session: Session | null, event?: string) => {
      if (event === 'PASSWORD_RECOVERY') set({ recovery: true })
      const authUser = toAuthUserLite(session?.user ?? null)
      if (!authUser) {
        set({ status: 'signedOut', authUser: null, linkedPersonId: null, recovery: false })
        return
      }
      set({ status: 'signedIn', authUser, error: null })
      const personId = await reconcilePerson(authUser)
      // Ignore a stale resolution if the signed-in user changed while awaiting.
      if (get().authUser?.id === authUser.id) set({ linkedPersonId: personId })
    }

    void getSession().then(apply)
    return onAuthChange(apply)
  },

  signIn: async (email, password) => {
    const r = await sbSignIn(email, password)
    if (!r.ok) {
      set({ error: r.error ?? 'Sign-in failed' })
      return false
    }
    set({ error: null })
    return true // onAuthChange → apply() updates status/authUser/linkedPersonId
  },

  signOut: async () => {
    await sbSignOut() // onAuthChange → apply() sets signedOut
  },

  clearRecovery: () => set({ recovery: false }),
}))
