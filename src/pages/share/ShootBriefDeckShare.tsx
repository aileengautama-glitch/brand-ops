/**
 * Read-only shareable view of the Shoot Brief Deck.
 * Accessible at /share/shoot/:id/brief-deck — no sidebar, no editing controls.
 *
 * Renders ShootDeckDocument (the single source of deck-template truth) from either
 * the local project (authoring device) or the remote deck snapshot (fresh device).
 * The deck layout itself lives in ShootDeckDocument so this route stays a thin
 * shell (data source + print action) — and the same document is the target a
 * headless PDF renderer would load later.
 */
import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { useShootStore } from '@/store/useShootStore'
import { useEnsureProjectMedia } from '@/hooks/useMediaSync'
import { useRemoteDeckSnapshot } from '@/hooks/useRemoteDeckSnapshot'
import { buildShootDeckData, type ShootDeckData } from '@/lib/deckSnapshot'
import { usePrint } from '@/hooks/usePrint'
import ShootDeckDocument from '@/components/deck/ShootDeckDocument'

export default function ShootBriefDeckShare() {
  const { id } = useParams<{ id: string }>()
  const localProject = useShootStore((s) => s.projects.find((p) => p.id === id))
  const triggerPrint = usePrint('portrait', { margin: '0' })

  // This route mounts under ShareShell (outside AppShell), so it doesn't inherit
  // useMediaSync / project structure. Hydrate the media cache and fetch the remote
  // deck snapshot for cold loads on a fresh device.
  useEnsureProjectMedia(id)
  const { snapshot, loading } = useRemoteDeckSnapshot(id, !!localProject)

  // Render from the local project when present, else from the remote snapshot.
  const project: ShootDeckData | null = localProject
    ? buildShootDeckData(localProject)
    : snapshot
      ? (snapshot.payload as unknown as ShootDeckData)
      : null

  if (!id || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-ink-muted">
          {loading ? 'Loading shared deck…' : 'This shared deck is no longer available.'}
        </p>
      </div>
    )
  }

  return (
    <div className="print-page-wrapper p-8 max-w-5xl mx-auto">
      {/* Share header — hidden when printing */}
      <div className="flex items-center justify-between mb-8 no-print pb-4 border-b border-surface-3">
        <div className="flex items-center gap-2">
          <span className="text-2xs font-bold uppercase tracking-widest bg-surface-2 text-ink-muted px-2 py-1 rounded">
            Shared view · Read only
          </span>
          <span className="text-sm text-ink-faint">Brand Workspace</span>
        </div>
        <button
          onClick={triggerPrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
        >
          <Printer size={13} /> Print / Download PDF
        </button>
      </div>

      <ShootDeckDocument data={project} />
    </div>
  )
}
