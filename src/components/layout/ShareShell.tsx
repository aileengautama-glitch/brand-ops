import { Outlet } from 'react-router-dom'

/**
 * Minimal shell for shareable read-only deck views.
 * No sidebar, no topbar, no print toolbar — just clean content.
 *
 * globals.css pins html/body/#root to height:100% + overflow:hidden (the in-app
 * shell scrolls via its own <main>), so this shell must provide its own scroll
 * container — otherwise tall shared decks are clipped and can't scroll.
 */
export default function ShareShell() {
  return (
    <div className="h-screen overflow-y-auto bg-base">
      <Outlet />
    </div>
  )
}
