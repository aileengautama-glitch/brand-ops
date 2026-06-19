import { useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { setPassword } from '@/lib/supabaseAuth'

/**
 * RecoveryPrompt — shown (full-screen, over everything) when the user arrives via a
 * "forgot password" reset link (PASSWORD_RECOVERY event → useAuthStore.recovery = true).
 * They set a new password here; on success we clear the recovery flag and they continue
 * into the app with their fresh password. Mounted in AppShell.
 */
export default function RecoveryPrompt() {
  const clearRecovery = useAuthStore((s) => s.clearRecovery)

  const [pw, setPw]           = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (pw !== confirm) { setError('Passwords don’t match.'); return }
    setBusy(true); setError(null)
    const r = await setPassword(pw)
    setBusy(false)
    if (r.ok) clearRecovery()
    else setError(r.error ?? 'Could not set the password. Try again.')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base">
      <div className="absolute inset-0 bg-surface-1/30 pointer-events-none" />

      <div className="relative w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Set a new password</h1>
          <p className="text-sm text-ink-muted mt-1">Choose a new password to finish resetting your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-surface-3 rounded-xl shadow-sm px-5 py-5 space-y-3">
          <input
            type="password" autoFocus value={pw}
            onChange={(e) => { setPw(e.target.value); if (error) setError(null) }}
            placeholder="New password (min 6 characters)" autoComplete="new-password"
            className="w-full px-3 py-1.5 text-sm border border-surface-3 rounded bg-white focus:outline-none focus:border-accent placeholder:text-ink-faint"
          />
          <input
            type="password" value={confirm}
            onChange={(e) => { setConfirm(e.target.value); if (error) setError(null) }}
            placeholder="Confirm password" autoComplete="new-password"
            className="w-full px-3 py-1.5 text-sm border border-surface-3 rounded bg-white focus:outline-none focus:border-accent placeholder:text-ink-faint"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit" disabled={busy || pw.length < 6 || pw !== confirm}
            className="w-full px-3 py-1.5 bg-accent text-white text-sm rounded hover:bg-accent-dark transition-colors disabled:opacity-40"
          >
            {busy ? 'Saving…' : 'Set password & continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
