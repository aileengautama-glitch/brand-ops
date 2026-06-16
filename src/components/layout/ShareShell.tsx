import { Outlet } from 'react-router-dom'

/**
 * Minimal shell for shareable read-only deck views.
 * No sidebar, no topbar, no print toolbar — just clean content.
 */
export default function ShareShell() {
  return (
    <div className="min-h-screen bg-base">
      <Outlet />
    </div>
  )
}
