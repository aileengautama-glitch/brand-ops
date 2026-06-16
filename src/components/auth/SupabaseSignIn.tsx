import { useState } from 'react'
import { LogOut, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { signOutEverywhere } from '@/lib/authActions'

/**
 * SupabaseSignIn — Phase 6D email/password sign-in, rendered additively inside LoginGate.
 *
 * On success: onAuthStateChange → reconciliation → useAuthBridge sets currentUserId and the
 * gate closes (if the account is linked to a workspace profile). If signed in but NOT
 * linked, shows a clear dead-end with a sign-out option (it does NOT bridge).
 */
export default function SupabaseSignIn({ onBack }: { onBack: () => void }) {
  const status         = useAuthStore((s) => s.status)
  const authUser       = useAuthStore((s) => s.authUser)
  const linkedPersonId = useAuthStore((s) => s.linkedPersonId)
  const error          = useAuthStore((s) => s.error)
  const signIn         = useAuthStore((s) => s.signIn)

  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Signed in, but not reconciled to a workspace profile → clear dead-end (no bridge).
  if (status === 'signedIn' && !linkedPersonId) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm font-semibold text-ink">Account not linked</p>
        <p className="text-xs text-ink-muted">
          You're signed in{authUser?.email ? ` as ${authUser.email}` : ''}, but this account isn't linked
          to a workspace profile yet. Contact your admin to get access.
        </p>
        <button
          onClick={() => void signOutEverywhere()}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-red-500 transition-colors"
        >
          <LogOut size={13} /> Sign out
        </button>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password || submitting) return
    setSubmitting(true)
    await signIn(email.trim(), password)
    setSubmitting(false)
    // Success → the bridge closes the gate (if linked), or the unlinked panel above renders.
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="text-center mb-1">
        <p className="text-sm font-semibold text-ink">Sign in to sync</p>
        <p className="text-2xs text-ink-faint mt-0.5">Access your workspace across devices.</p>
      </div>
      <input
        type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="Email" autoComplete="email"
        className="w-full px-3 py-1.5 text-sm border border-surface-3 rounded bg-white focus:outline-none focus:border-accent placeholder:text-ink-faint"
      />
      <input
        type="password" value={password} onChange={(e) => setPassword(e.target.value)}
        placeholder="Password" autoComplete="current-password"
        className="w-full px-3 py-1.5 text-sm border border-surface-3 rounded bg-white focus:outline-none focus:border-accent placeholder:text-ink-faint"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit" disabled={submitting || !email.trim() || !password}
        className="w-full px-3 py-1.5 bg-accent text-white text-sm rounded hover:bg-accent-dark transition-colors disabled:opacity-40"
      >
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
      <button
        type="button" onClick={onBack}
        className="w-full flex items-center justify-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft size={12} /> Back to profiles
      </button>
    </form>
  )
}
