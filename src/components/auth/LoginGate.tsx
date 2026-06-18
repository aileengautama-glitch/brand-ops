import { useState } from 'react'
import { useUserStore } from '@/store/useUserStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import { APP_USERS, DEFAULT_PIN } from '@/auth/users'
import { SelectProfileView } from './UserSelector'
import SupabaseSignIn from './SupabaseSignIn'
import ChangePinGate from './ChangePinGate'

/**
 * Full-screen login gate. Rendered by AppShell when no user is logged in and
 * guestMode is false.
 *
 * Two paths, chosen by whether Supabase is configured:
 *   • Hosted (isSupabaseEnabled) → EMAIL sign-in only. Real users sign in with their
 *     email; invited members arrive via their email magic link and are auto-signed-in.
 *     The local PIN profile picker is intentionally retired here — the built-in roster is
 *     seed data, not real users, so a name picker / "switch user" is redundant.
 *   • Local dev (no Supabase env) → the PIN profile picker remains as the only way in,
 *     so offline/local development still works.
 */
export default function LoginGate() {
  const setCurrentUser  = useUserStore((s) => s.setCurrentUser)
  const enableGuestMode = useUserStore((s) => s.enableGuestMode)
  const getEffectivePin = useUserStore((s) => s.getEffectivePin)
  const setPinOverride  = useUserStore((s) => s.setPinOverride)
  const isDev = import.meta.env.MODE !== 'production'

  // Dev-only PIN picker state (unused in the hosted email-only path).
  const [changePinUserId, setChangePinUserId] = useState<string | null>(null)

  const handleSelect = (userId: string) => {
    setCurrentUser(userId)
    if (getEffectivePin(userId) === DEFAULT_PIN) setChangePinUserId(userId)
  }

  const changePinUser = changePinUserId ? APP_USERS.find((u) => u.id === changePinUserId) : null
  if (changePinUser) {
    return (
      <ChangePinGate
        user={changePinUser}
        onSave={(pin) => { setPinOverride(changePinUser.id, pin); setChangePinUserId(null) }}
        onSkip={() => setChangePinUserId(null)}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base">
      <div className="absolute inset-0 bg-surface-1/30 pointer-events-none" />

      <div className="relative w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Brand Workspace</h1>
          <p className="text-sm text-ink-muted mt-1">
            {isSupabaseEnabled ? 'Sign in to your workspace' : 'Select your profile to get started'}
          </p>
        </div>

        <div className="bg-white border border-surface-3 rounded-xl shadow-sm px-5 py-5">
          {isSupabaseEnabled ? (
            <SupabaseSignIn />
          ) : (
            <SelectProfileView
              onSelect={handleSelect}
              guestLinkLabel={isDev ? 'Continue without profile (dev only)' : undefined}
              onGuestLink={isDev ? enableGuestMode : undefined}
            />
          )}
        </div>

        <p className="text-center text-xs text-ink-faint mt-5">
          {isSupabaseEnabled
            ? "Your account determines which projects you see and what you can edit."
            : 'Your profile determines which tasks you see and what you can edit.'}
        </p>
      </div>
    </div>
  )
}
