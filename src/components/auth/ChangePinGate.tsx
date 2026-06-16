import { useState } from 'react'
import type { AppUser } from '@/auth/users'
import { ROLE_LABELS } from '@/auth/users'
import { UserAvatar, PinEntry } from './UserSelector'

/**
 * Full-screen first-time PIN change overlay.
 * Shown when a user logs in for the first time and their PIN is still '0000'.
 */
export default function ChangePinGate({
  user,
  onSave,
  onSkip,
}: {
  user: AppUser
  onSave: (newPin: string) => void
  onSkip: () => void
}) {
  const [step, setStep] = useState<'new' | 'confirm'>('new')
  const [newPin, setNewPin] = useState('')
  const [mismatch, setMismatch] = useState(false)

  const handleNewAttempt = (pin: string) => {
    setNewPin(pin)
    setStep('confirm')
  }

  const handleConfirmAttempt = (pin: string) => {
    if (pin === newPin) {
      onSave(pin)
    } else {
      setMismatch(true)
      setTimeout(() => {
        setMismatch(false)
        setStep('new')
        setNewPin('')
      }, 1200)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base">
      <div className="absolute inset-0 bg-surface-1/30 pointer-events-none" />

      <div className="relative w-full max-w-sm mx-4">
        {/* Card */}
        <div className="bg-white border border-surface-3 rounded-xl shadow-sm px-6 py-7 space-y-5">
          <div className="text-center">
            <UserAvatar user={user} size="lg" />
            <p className="mt-3 text-sm font-semibold text-ink">Welcome, {user.name}!</p>
            <p className="text-xs text-ink-faint mt-0.5">{ROLE_LABELS[user.role]}</p>
          </div>

          <div className="border-t border-surface-2 pt-5 text-center space-y-4">
            <div>
              <p className="text-sm font-medium text-ink">Set your personal PIN</p>
              <p className="text-xs text-ink-muted mt-1">
                Your profile is currently using the default PIN. Set a personal 4-digit PIN to secure it.
              </p>
            </div>

            {step === 'new' ? (
              <div className="space-y-2">
                <p className="text-xs text-ink-faint">Enter your new PIN:</p>
                <PinEntry user={user} onAttempt={handleNewAttempt} />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-ink-faint">Confirm your PIN:</p>
                <PinEntry
                  user={user}
                  onAttempt={handleConfirmAttempt}
                  error={mismatch}
                />
                {mismatch && (
                  <p className="text-xs text-red-500 font-medium">PINs didn't match — starting over</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-4">
          <button
            onClick={onSkip}
            className="text-xs text-ink-faint hover:text-ink-muted transition-colors"
          >
            Skip for now — I'll set my PIN later
          </button>
        </div>
      </div>
    </div>
  )
}
