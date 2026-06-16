import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, UserIcon, RefreshCw, Settings } from 'lucide-react'
import { signOutEverywhere } from '@/lib/authActions'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/store/useUserStore'
import { APP_USERS, DEFAULT_PIN, ROLE_LABELS } from '@/auth/users'
import type { AppUser } from '@/auth/users'
import { customMemberToAppUser } from '@/auth/members'
import Modal from '@/components/ui/Modal'

// ─── Avatar circle ────────────────────────────────────────────────────────────

export function UserAvatar({
  user,
  size = 'md',
}: {
  user: AppUser
  size?: 'sm' | 'md' | 'lg'
}) {
  const dims =
    size === 'sm' ? 'w-6 h-6 text-2xs' :
    size === 'lg' ? 'w-10 h-10 text-sm' :
    'w-8 h-8 text-xs'

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white shrink-0',
        dims
      )}
      style={{ backgroundColor: user.avatarColor }}
    >
      {user.initials}
    </div>
  )
}

// ─── PIN entry ─────────────────────────────────────────────────────────────────

export function PinEntry({
  user,
  /** Called with the entered PIN string when all 4 digits are in. */
  onAttempt,
  error,
  onCancel,
}: {
  user: AppUser
  onAttempt: (pin: string) => void
  error?: boolean
  onCancel?: () => void
}) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const r0 = useRef<HTMLInputElement>(null)
  const r1 = useRef<HTMLInputElement>(null)
  const r2 = useRef<HTMLInputElement>(null)
  const r3 = useRef<HTMLInputElement>(null)
  const refs = [r0, r1, r2, r3]

  // Clear digits and refocus on external error signal
  useEffect(() => {
    if (error) {
      setDigits(['', '', '', ''])
      setTimeout(() => refs[0].current?.focus(), 50)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  const handleDigit = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]
    next[i] = val
    setDigits(next)
    if (val && i < 3) refs[i + 1].current?.focus()
    if (val && i === 3) onAttempt([...next.slice(0, 3), val].join(''))
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus()
    if (e.key === 'Enter') onAttempt(digits.join(''))
  }

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="flex flex-col items-center gap-2">
        <UserAvatar user={user} size="lg" />
        <p className="text-sm font-semibold text-ink">{user.name}</p>
        <p className="text-xs text-ink-faint">{ROLE_LABELS[user.role]}</p>
      </div>

      <div className="space-y-1 text-center">
        <p className="text-xs text-ink-muted">Enter your 4-digit PIN</p>
        {error && (
          <p className="text-xs text-red-500 font-medium">Incorrect PIN — try again</p>
        )}
      </div>

      <div className="flex gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={d}
            autoFocus={i === 0}
            onChange={(e) => handleDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={cn(
              'w-11 h-11 text-center text-lg font-bold border rounded-lg bg-white focus:outline-none transition-colors',
              error
                ? 'border-red-400 bg-red-50'
                : 'border-surface-3 focus:border-accent'
            )}
          />
        ))}
      </div>

      {onCancel && (
        <button onClick={onCancel} className="text-xs text-ink-faint hover:text-ink transition-colors">
          ← Back to profiles
        </button>
      )}
    </div>
  )
}

// ─── First-time PIN change ────────────────────────────────────────────────────

function ChangePinView({
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
  const [error, setError] = useState(false)

  const handleNewAttempt = (pin: string) => {
    setNewPin(pin)
    setStep('confirm')
  }

  const handleConfirmAttempt = (pin: string) => {
    if (pin === newPin) {
      onSave(pin)
    } else {
      setError(true)
      setTimeout(() => {
        setError(false)
        setStep('new')
        setNewPin('')
      }, 1200)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="text-center mb-2">
        <p className="text-sm font-semibold text-ink">Welcome, {user.name}!</p>
        <p className="text-xs text-ink-muted mt-1">
          Your PIN is still the default. Set a personal PIN to secure your profile.
        </p>
      </div>

      {step === 'new' ? (
        <>
          <p className="text-xs text-ink-faint">Enter your new 4-digit PIN:</p>
          <PinEntry user={user} onAttempt={handleNewAttempt} />
        </>
      ) : (
        <>
          <p className="text-xs text-ink-faint">Confirm your new PIN:</p>
          <PinEntry
            user={user}
            onAttempt={handleConfirmAttempt}
            error={error}
          />
          {error && (
            <p className="text-xs text-red-500 font-medium">PINs didn't match — try again</p>
          )}
        </>
      )}

      <button onClick={onSkip} className="text-xs text-ink-faint hover:text-ink-muted transition-colors mt-1">
        Skip for now (you can change it in your profile later)
      </button>
    </div>
  )
}

// ─── Shared profile grid ──────────────────────────────────────────────────────
// Used by both LoginGate (full-page) and UserSelector (modal).

export function SelectProfileView({
  onSelect,
  currentUserId,
  guestLinkLabel,
  onGuestLink,
}: {
  /** Called with the chosen user ID AFTER PIN (if any) is verified. */
  onSelect: (userId: string) => void
  currentUserId?: string | null
  guestLinkLabel?: string
  onGuestLink?: () => void
}) {
  const getEffectivePin = useUserStore((s) => s.getEffectivePin)
  const [pendingUser, setPendingUser] = useState<AppUser | null>(null)
  const [pinError, setPinError] = useState(false)

  const handleCardClick = (user: AppUser) => {
    setPendingUser(user)
    setPinError(false)
  }

  const handlePinAttempt = (pin: string) => {
    if (!pendingUser) return
    const effective = getEffectivePin(pendingUser.id)
    if (pin === effective) {
      onSelect(pendingUser.id)
      setPendingUser(null)
    } else {
      setPinError(true)
    }
  }

  if (pendingUser) {
    return (
      <PinEntry
        user={pendingUser}
        onAttempt={handlePinAttempt}
        error={pinError}
        onCancel={() => { setPendingUser(null); setPinError(false) }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {APP_USERS.map((user) => {
          const active = user.id === currentUserId
          return (
            <button
              key={user.id}
              onClick={() => handleCardClick(user)}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-lg border text-center transition-all',
                active
                  ? 'border-accent bg-accent/5 ring-1 ring-accent'
                  : 'border-surface-3 bg-surface-1 hover:border-accent/40 hover:bg-surface-2'
              )}
            >
              <UserAvatar user={user} size="lg" />
              <div className="min-w-0 w-full">
                <p className={cn('text-xs font-semibold truncate', active ? 'text-accent' : 'text-ink')}>
                  {user.name}
                </p>
                <p className="text-2xs text-ink-faint mt-0.5 truncate">{ROLE_LABELS[user.role]}</p>
              </div>
              {active && (
                <span className="text-2xs font-bold uppercase tracking-widest text-accent">You</span>
              )}
            </button>
          )
        })}
      </div>

      {guestLinkLabel && onGuestLink && (
        <div className="text-center pt-1">
          <button
            onClick={onGuestLink}
            className="text-xs text-ink-faint hover:text-ink-muted transition-colors"
          >
            {guestLinkLabel}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Modal wrapper ─────────────────────────────────────────────────────────────
// Opens from the TopBar user menu to switch profile while inside the app.

interface UserSelectorProps {
  open: boolean
  onClose: () => void
}

export default function UserSelector({ open, onClose }: UserSelectorProps) {
  const currentUserId  = useUserStore((s) => s.currentUserId)
  const setCurrentUser = useUserStore((s) => s.setCurrentUser)
  const getEffectivePin = useUserStore((s) => s.getEffectivePin)
  const setPinOverride = useUserStore((s) => s.setPinOverride)

  const [changePinUserId, setChangePinUserId] = useState<string | null>(null)

  const handleSelect = (userId: string) => {
    setCurrentUser(userId)
    // Prompt PIN change if still on default
    if (getEffectivePin(userId) === DEFAULT_PIN) {
      setChangePinUserId(userId)
    } else {
      onClose()
    }
  }

  const handlePinSaved = (userId: string, pin: string) => {
    setPinOverride(userId, pin)
    setChangePinUserId(null)
    onClose()
  }

  const handlePinSkipped = () => {
    setChangePinUserId(null)
    onClose()
  }

  const changePinUser = changePinUserId ? APP_USERS.find((u) => u.id === changePinUserId) : null

  return (
    <Modal
      open={open}
      onClose={() => { setChangePinUserId(null); onClose() }}
      title={changePinUser ? 'Set your PIN' : 'Select your profile'}
      width="md"
      footer={
        !changePinUser && currentUserId ? (
          <button
            onClick={() => { void signOutEverywhere(); onClose() }}
            className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-red-500 transition-colors"
          >
            <LogOut size={13} /> Sign out
          </button>
        ) : !changePinUser ? (
          <p className="text-xs text-ink-faint">No profile selected — all sections are editable.</p>
        ) : null
      }
    >
      {changePinUser ? (
        <ChangePinView
          user={changePinUser}
          onSave={(pin) => handlePinSaved(changePinUser.id, pin)}
          onSkip={handlePinSkipped}
        />
      ) : (
        <>
          <p className="text-xs text-ink-muted mb-4">
            Select yourself to see your tasks and apply your role's editing permissions.
          </p>
          <SelectProfileView
            currentUserId={currentUserId}
            onSelect={handleSelect}
          />
        </>
      )}
    </Modal>
  )
}

// ─── Compact chip / dropdown menu for the top bar ──────────────────────────────

export function UserChip({ onClick }: { onClick: () => void }) {
  const currentUserId = useUserStore((s) => s.currentUserId)
  const customMembers = useUserStore((s) => s.customMembers)
  // Resolve a seed account, else an admin-created member (invited/linked identity).
  const cm = currentUserId ? customMembers.find((c) => c.id === currentUserId) : undefined
  const user = (APP_USERS.find((u) => u.id === currentUserId) ?? (cm ? customMemberToAppUser(cm) : null)) ?? null

  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-ink-faint hover:text-ink hover:bg-surface-3 transition-colors"
      >
        <UserIcon size={13} />
        Select profile
      </button>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-surface-3 transition-colors group"
        title={`${user.name} (${ROLE_LABELS[user.role]})`}
      >
        <UserAvatar user={user} size="sm" />
        <span className="text-xs text-ink-secondary group-hover:text-ink transition-colors max-w-[120px] truncate">
          {user.name}
        </span>
      </button>

      {menuOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-surface-3 rounded shadow-lg z-50 py-1.5 overflow-hidden">
          {/* Profile header */}
          <div className="px-3 py-2 border-b border-surface-3">
            <p className="text-xs font-semibold text-ink">{user.name}</p>
            <p className="text-2xs text-ink-faint mt-0.5">{ROLE_LABELS[user.role]}</p>
          </div>
          {/* Actions */}
          <button
            onClick={() => { setMenuOpen(false); onClick() }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-surface-1 transition-colors"
          >
            <RefreshCw size={12} className="text-ink-faint" />
            Switch user
          </button>
          <Link
            to="/settings"
            onClick={() => setMenuOpen(false)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-surface-1 transition-colors"
          >
            <Settings size={12} className="text-ink-faint" />
            Settings
          </Link>
          <div className="border-t border-surface-3 my-1" />
          <button
            onClick={() => { void signOutEverywhere(); setMenuOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-surface-1 transition-colors"
          >
            <LogOut size={12} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
