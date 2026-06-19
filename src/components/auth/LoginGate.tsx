import { isSupabaseEnabled } from '@/lib/supabase'
import SupabaseSignIn from './SupabaseSignIn'

/**
 * Full-screen login gate. Rendered by AppShell when no user is signed in.
 *
 * Email-only: everyone signs in with their email — the admin (and anyone who set a
 * password) by password, invited members via their magic link / "email me a sign-in
 * link". The local PIN profile picker has been removed entirely.
 */
export default function LoginGate() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base">
      <div className="absolute inset-0 bg-surface-1/30 pointer-events-none" />

      <div className="relative w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Brand Workspace</h1>
          <p className="text-sm text-ink-muted mt-1">Sign in to your workspace</p>
        </div>

        <div className="bg-white border border-surface-3 rounded-xl shadow-sm px-5 py-5">
          {isSupabaseEnabled ? (
            <SupabaseSignIn />
          ) : (
            <p className="text-sm text-ink-muted text-center py-4">
              Sign-in is unavailable — this build isn&rsquo;t connected to Supabase.
            </p>
          )}
        </div>

        <p className="text-center text-xs text-ink-faint mt-5">
          Your account determines which projects you see and what you can edit.
        </p>
      </div>
    </div>
  )
}
