/**
 * BackendStatusBanner — says out loud when the backend isn't accepting writes.
 *
 * The app keeps working from local storage when the server is unreachable, which is
 * deliberate. What was wrong before is that it looked identical to working normally.
 * This banner makes the difference visible without blocking the user.
 */
import { AlertTriangle, X, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBackendStatus, ISSUE_COPY } from '@/store/useBackendStatus'

export default function BackendStatusBanner() {
  const issue = useBackendStatus((s) => s.issue)
  const last = useBackendStatus((s) => s.last)
  const dismissed = useBackendStatus((s) => s.dismissed)
  const dismiss = useBackendStatus((s) => s.dismiss)

  if (issue === 'none' || dismissed) return null

  const copy = ISSUE_COPY[issue]
  const isAuth = issue === 'auth'

  return (
    <div
      role="status"
      className={`no-print flex items-start gap-2.5 px-4 py-2 border-b text-xs ${
        isAuth
          ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}
    >
      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <span className="font-semibold">{copy.title}.</span>{' '}
        <span className="opacity-90">{copy.body}</span>
        {last && (
          <span className="block opacity-70 mt-0.5">
            {last.method} {last.resource}
            {last.status ? ` → ${last.status}` : ' → no response'}
            {last.message ? ` · ${last.message}` : ''}
          </span>
        )}
      </div>

      {isAuth && (
        <Link
          to="/settings"
          className="shrink-0 flex items-center gap-1 px-2 py-1 rounded border border-red-300 bg-white/60 hover:bg-white transition-colors font-medium"
        >
          Sign in again
        </Link>
      )}
      <button
        onClick={() => window.location.reload()}
        title="Retry"
        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded border border-current/20 bg-white/50 hover:bg-white transition-colors"
      >
        <RefreshCw size={11} /> Retry
      </button>
      <button onClick={dismiss} title="Dismiss" className="shrink-0 p-1 hover:opacity-70 transition-opacity">
        <X size={13} />
      </button>
    </div>
  )
}
