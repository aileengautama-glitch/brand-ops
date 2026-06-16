import { useState, useEffect } from 'react'
import { useUserStore } from '@/store/useUserStore'
import { useAuthStore } from '@/store/useAuthStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import { APP_USERS, DEFAULT_PIN } from '@/auth/users'
import { SelectProfileView } from './UserSelector'
import SupabaseSignIn from './SupabaseSignIn'
import ChangePinGate from './ChangePinGate'

/**
 * Full-screen profile selection gate.
 * Rendered by AppShell when no user is logged in and guestMode is false.
 *
 * Flow:
 *   1. User picks their profile and enters PIN (handled inside SelectProfileView)
 *   2. If PIN is still the default '0000', show first-time PIN change screen
 *   3. Gate disappears once logged in + PIN is set (or skipped)
 */
export default function LoginGate() {
  const setCurrentUser  = useUserStore((s) => s.setCurrentUser)
  const enableGuestMode = useUserStore((s) => s.enableGuestMode)
  const getEffectivePin = useUserStore((s) => s.getEffectivePin)
  const setPinOverride  = useUserStore((s) => s.setPinOverride)
  const isDev = import.meta.env.MODE !== 'production'

  // Phase 6D — additive Supabase sign-in path alongside the local profile picker.
  const authStatus     = useAuthStore((s) => s.status)
  const linkedPersonId = useAuthStore((s) => s.linkedPersonId)
  const [mode, setMode] = useState<'local' | 'sync'>('local')

  // Surface the "account not linked" state when a (restored) Supabase session can't bridge.
  useEffect(() => {
    if (isSupabaseEnabled && authStatus === 'signedIn' && !linkedPersonId) setMode('sync')
  }, [authStatus, linkedPersonId])

  // After profile selected + PIN verified, check if they need to change default PIN
  const [changePinUserId, setChangePinUserId] = useState<string | null>(null)

  const handleSelect = (userId: string) => {
    setCurrentUser(userId)
    if (getEffectivePin(userId) === DEFAULT_PIN) {
      setChangePinUserId(userId)
    }
    // If PIN is already personalised, the gate closes naturally (isLoggedIn becomes true
    // and changePinUserId stays null — AppShell will no longer render the gate)
  }

  const changePinUser = changePinUserId
    ? APP_USERS.find((u) => u.id === changePinUserId)
    : null

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
          <p className="text-sm text-ink-muted mt-1">Select your profile to get started</p>
        </div>

        <div className="bg-white border border-surface-3 rounded-xl shadow-sm px-5 py-5">
          {mode === 'sync' ? (
            <SupabaseSignIn onBack={() => setMode('local')} />
          ) : (
            <>
              <SelectProfileView
                onSelect={handleSelect}
                guestLinkLabel={isDev ? 'Continue without profile (dev only)' : undefined}
                onGuestLink={isDev ? enableGuestMode : undefined}
              />
              {isSupabaseEnabled && (
                <button
                  onClick={() => setMode('sync')}
                  className="w-full mt-4 pt-3 border-t border-surface-3 text-xs text-accent hover:text-accent-dark transition-colors"
                >
                  Sign in to sync across devices →
                </button>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-ink-faint mt-5">
          Your profile determines which tasks you see and what you can edit.
        </p>
      </div>
    </div>
  )
}
