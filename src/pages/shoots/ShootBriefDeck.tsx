import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { useCurrentShootProject } from '@/hooks/useCurrentProject'
import CopyShareLinkButton from '@/components/ui/CopyShareLinkButton'
import { usePrint } from '@/hooks/usePrint'
import { buildShootDeckData } from '@/lib/deckSnapshot'
import ShootDeckDocument from '@/components/deck/ShootDeckDocument'

/**
 * In-app Shoot Brief Deck — now a thin wrapper around ShootDeckDocument (the single
 * source of deck-template truth, shared with the public /share route). Renders the
 * live project as the same A4-portrait page blocks → a faithful page-by-page preview
 * of the exported PDF. Print / Download uses the browser print path (portrait).
 */
export default function ShootBriefDeck() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentShootProject()
  const triggerPrint = usePrint('portrait')

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  return (
    <div className="print-page-wrapper p-6">
      {/* Header bar — hidden when printing */}
      <div className="flex items-center justify-between mb-6 no-print max-w-[210mm] mx-auto">
        <div>
          <h1 className="text-lg font-bold text-ink">Shoot Brief Deck</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Page-by-page preview of the exported PDF. Content is edited on its section pages — this deck auto-updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CopyShareLinkButton module="shoot" projectId={id} deckType="brief-deck" />
          <button
            onClick={triggerPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
          >
            <Printer size={13} /> Print / Download PDF
          </button>
        </div>
      </div>

      <ShootDeckDocument data={buildShootDeckData(project)} />
    </div>
  )
}
