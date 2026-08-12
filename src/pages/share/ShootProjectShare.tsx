/**
 * ShootProjectShare — the public, section-scoped read-only view of a shoot.
 *
 * /share/shoot/:id/project?s=brief,schedule,callsheet
 *
 * Which sections appear comes from the URL, so one project can be shared differently
 * with a supplier, the talent agency and the venue without any server state. Renders
 * from the local project when present, else from the remote deck snapshot, so the link
 * opens on a device that has never seen the project.
 */
import { useParams, useSearchParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { useShootStore } from '@/store/useShootStore'
import { useEnsureProjectMedia } from '@/hooks/useMediaSync'
import { useRemoteDeckSnapshot } from '@/hooks/useRemoteDeckSnapshot'
import { buildShootDeckData, type ShootDeckData } from '@/lib/deckSnapshot'
import { usePrint } from '@/hooks/usePrint'
import { decodeSections } from '@/lib/shareSections'
import { buildExternalSections } from '@/lib/sharePresets'
import { useShareLinkStore, linkState } from '@/store/useShareLinkStore'
import ShootProjectView from '@/components/share/ShootProjectView'

export default function ShootProjectShare() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const token = params.get('t') ?? ''
  const requested = decodeSections(params.get('s'))
  const localProject = useShootStore((s) => s.projects.find((p) => p.id === id))
  const links = useShareLinkStore((s) => s.links)
  const triggerPrint = usePrint('portrait')

  // A tokened link is an issued external link: it can be revoked or expire, and it
  // can never show money or internal reasoning whatever the URL asks for.
  const issued = token ? links[token] : null
  const state = token ? linkState(issued) : 'active'
  const sections = token ? buildExternalSections(requested) : requested

  useEnsureProjectMedia(id)
  const { snapshot, loading } = useRemoteDeckSnapshot(id, !!localProject)

  const data: ShootDeckData | null = localProject
    ? buildShootDeckData(localProject)
    : snapshot
      ? (snapshot.payload as unknown as ShootDeckData)
      : null

  if (token && (state === 'revoked' || state === 'expired')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <p className="text-sm font-medium text-ink">
            {state === 'revoked' ? 'This link has been revoked' : 'This link has expired'}
          </p>
          <p className="text-xs text-ink-muted mt-1">
            Ask whoever sent it for a new one.
          </p>
        </div>
      </div>
    )
  }

  if (!id || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-ink-muted">
          {loading ? 'Loading…' : 'This shared link is no longer available.'}
        </p>
      </div>
    )
  }

  return (
    <div className="print-page-wrapper p-5 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 no-print pb-3 border-b border-surface-3">
        <span className="text-2xs font-bold uppercase tracking-widest bg-surface-2 text-ink-muted px-2 py-1 rounded">
          Shared view · Read only
        </span>
        <button
          onClick={triggerPrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-surface-3 rounded text-ink-secondary hover:bg-surface-1 transition-colors"
        >
          <Printer size={13} /> Print / PDF
        </button>
      </div>

      <div className="print-area">
        <ShootProjectView data={data} sections={sections} />
      </div>
    </div>
  )
}
