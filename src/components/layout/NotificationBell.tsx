/**
 * NotificationBell — in-app notifications, mostly approvals resolving.
 *
 * Shows notifications addressed to the current user plus broadcast ones (empty
 * audience). Deliberately simple: an approval landing has to be visible without
 * anyone watching a channel, but it shouldn't become an inbox to manage.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { user } = useCurrentUser()
  const all = useNotificationStore((s) => s.notifications)
  const markRead = useNotificationStore((s) => s.markRead)
  const markAllRead = useNotificationStore((s) => s.markAllRead)

  const mine = useMemo(
    () => all.filter((n) => !n.audience || (user?.name && n.audience === user.name)),
    [all, user?.name],
  )
  const unread = mine.filter((n) => !n.read).length

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="flex items-center relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        className={cn(
          'relative flex items-center px-2 py-1 rounded transition-colors',
          open ? 'bg-surface-3 text-ink' : 'text-ink-faint hover:text-ink',
        )}
      >
        <Bell size={13} />
        {unread > 0 && (
          <span className="absolute -top-0.5 right-0.5 min-w-[13px] h-[13px] px-0.5 flex items-center justify-center rounded-full bg-accent text-white text-[9px] font-bold tabular-nums">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-surface-3 rounded shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-surface-3 bg-surface-1">
            <span className="text-2xs font-bold uppercase tracking-widest text-ink-faint">
              Notifications{unread > 0 ? ` — ${unread} new` : ''}
            </span>
            {mine.length > 0 && (
              <button onClick={markAllRead} className="text-2xs text-ink-muted hover:text-ink transition-colors">
                Mark all read
              </button>
            )}
          </div>
          {mine.length === 0 ? (
            <p className="px-3 py-4 text-xs text-ink-faint text-center">Nothing yet.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-surface-2">
              {mine.slice(0, 20).map((n) => (
                <Link
                  key={n.id}
                  to={n.href}
                  onClick={() => { markRead(n.id); setOpen(false) }}
                  className={cn('block px-3 py-2 hover:bg-surface-1 transition-colors', !n.read && 'bg-accent/5')}
                >
                  <div className="flex items-start gap-1.5">
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />}
                    <div className="min-w-0">
                      <p className="text-xs text-ink leading-snug">{n.title}</p>
                      {n.body && <p className="text-2xs text-ink-muted leading-snug mt-0.5">{n.body}</p>}
                      <p className="text-2xs text-ink-faint mt-0.5">{formatDate(n.createdAt.slice(0, 10))}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
