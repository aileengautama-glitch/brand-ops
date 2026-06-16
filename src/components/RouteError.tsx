import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

/**
 * Route-level error boundary. Wired as the `errorElement` on the root route so a
 * render/loader error in any page shows a friendly, recoverable screen instead of
 * React Router's raw stack-trace overlay.
 */
export default function RouteError() {
  const error    = useRouteError()
  const navigate = useNavigate()

  let title   = 'Something went wrong'
  let detail  = ''
  if (isRouteErrorResponse(error)) {
    title  = `${error.status} ${error.statusText}`
    detail = typeof error.data === 'string' ? error.data : ''
  } else if (error instanceof Error) {
    detail = error.message
  } else if (typeof error === 'string') {
    detail = error
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-surface-3 rounded-lg p-6 text-center">
        <div className="mx-auto w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-3">
          <AlertTriangle size={20} className="text-amber-600" />
        </div>
        <h1 className="text-base font-semibold text-ink mb-1">{title}</h1>
        <p className="text-sm text-ink-muted mb-4">
          This page hit an unexpected error. Your saved data is safe — try reloading,
          or head back to the home screen.
        </p>

        {detail && (
          <pre className="text-2xs text-ink-faint bg-surface-1 border border-surface-2 rounded p-2 mb-4 text-left whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
            {detail}
          </pre>
        )}

        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent-dark transition-colors"
          >
            <RotateCcw size={13} /> Reload
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
          >
            <Home size={13} /> Home
          </button>
        </div>
      </div>
    </div>
  )
}
