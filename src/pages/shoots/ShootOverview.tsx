/**
 * ShootOverview — the internal, authenticated read-only view of a shoot, plus the
 * place you build share links from.
 *
 * Same renderer as the public share page, with every section on. This is what replaces
 * "send the whole deck": one link, the current data, readable on a phone.
 */
import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { useCurrentShootProject } from '@/hooks/useCurrentProject'
import { usePrint } from '@/hooks/usePrint'
import { buildShootDeckData } from '@/lib/deckSnapshot'
import { ALL_SECTION_KEYS } from '@/lib/shareSections'
import PageSection from '@/components/layout/PageSection'
import ShootProjectView from '@/components/share/ShootProjectView'
import ShareLinkManager from '@/components/share/ShareLinkManager'

export default function ShootOverview() {
  const { id } = useParams<{ id: string }>()
  const project = useCurrentShootProject()
  const triggerPrint = usePrint('portrait')

  if (!project || !id) return <div className="p-6 text-sm text-ink-muted">Project not found.</div>

  return (
    <div className="print-page-wrapper p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-5 no-print">
        <div>
          <h1 className="text-base font-semibold text-ink">Overview & Sharing</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            The whole project on one read-only page — and the links you send instead of a deck.
          </p>
        </div>
        <button
          onClick={triggerPrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
        >
          <Printer size={13} /> Print / PDF
        </button>
      </div>

      <div className="no-print mb-8">
        <PageSection label="Share links" card>
          <ShareLinkManager module="shoot" projectId={id} />
        </PageSection>
      </div>

      <div className="print-area">
        <ShootProjectView data={buildShootDeckData(project)} sections={ALL_SECTION_KEYS} />
      </div>
    </div>
  )
}
