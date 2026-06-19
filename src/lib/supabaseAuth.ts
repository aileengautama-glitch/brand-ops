/**
 * Supabase Auth — thin, null-safe wrappers (Phase 6A foundation).
 *
 * All functions no-op / return null when Supabase is not configured, so local-only dev
 * is completely unaffected. The Supabase client persists its OWN session (an `sb-*`
 * localStorage key it manages); this module adds NO app localStorage keys and never
 * touches the brand-ops-* stores. No service-role key — anon client only.
 *
 * This slice establishes session plumbing only: it does NOT change the existing local
 * login flow (LoginGate / useUserStore), does NOT enable/alter RLS, and does NOT flip
 * any read authority.
 */
import { supabase } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

/** Minimal auth-user shape the app cares about (id + email). */
export type AuthUserLite = { id: string; email: string | null }

export function toAuthUserLite(u: User | null): AuthUserLite | null {
  return u ? { id: u.id, email: u.email ?? null } : null
}

/** Restore the current session (if any). Null when Supabase is off or on error. */
export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) { console.warn('[Auth] getSession failed:', error.message); return null }
  return data.session
}

/** Subscribe to auth-state changes. Returns an unsubscribe (no-op when Supabase is off). */
export function onAuthChange(cb: (session: Session | null) => void): () => void {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}

/** Email/password sign-in. onAuthStateChange fires on success → store updates. */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase is not configured' }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) { console.warn('[Auth] signIn failed:', error.message); return { ok: false, error: error.message } }
  return { ok: true }
}

/**
 * Invite / activate a member by email (client-only, no service-role key).
 *
 * Sends a magic-link OTP that CREATES the auth user if needed (shouldCreateUser).
 * On click the member is authenticated; the server-side link trigger
 * (0017_link_auth_users) then sets people.auth_user_id by matching email, so the
 * app bridges them to their existing person record (same id → grants carry over).
 *
 * Prerequisite for the link to complete: a people row with this email must exist
 * (created by the custom-member dual-write while an admin is signed in).
 * No-op with an error when Supabase isn't configured.
 */
export async function inviteByEmail(
  email: string,
  redirectTo?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase is not configured' }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: redirectTo ?? window.location.origin,
    },
  })
  if (error) { console.warn('[Auth] invite failed:', error.message); return { ok: false, error: error.message } }
  return { ok: true }
}

/**
 * Send a passwordless sign-in link to an EXISTING user (shouldCreateUser: false — the
 * gate must never create accounts; only an admin invite does that). Lets invited members,
 * who have no password, self-serve a fresh session from the email-only LoginGate.
 */
export async function sendSignInLink(
  email: string,
  redirectTo?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase is not configured' }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: redirectTo ?? window.location.origin,
    },
  })
  if (error) { console.warn('[Auth] sign-in link failed:', error.message); return { ok: false, error: error.message } }
  return { ok: true }
}

/**
 * Set (or change) the signed-in user's password. Lets a member who first signed in via a
 * magic link (no password) set one, so they can sign in with email + password next time.
 * Requires an active session — Supabase authorizes via the session, no current password needed.
 */
export async function setPassword(password: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase is not configured' }
  const { error } = await supabase.auth.updateUser({ password })
  if (error) { console.warn('[Auth] set password failed:', error.message); return { ok: false, error: error.message } }
  return { ok: true }
}

/** Sign out. onAuthStateChange fires → store resets to signedOut. */
export async function signOut(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) console.warn('[Auth] signOut failed:', error.message)
}
