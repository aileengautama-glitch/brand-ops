/**
 * useRemoteDeckSnapshot — fetch a project's deck snapshot for share routes.
 *
 * Used by /share/* deck pages so they can render on a fresh device where the
 * project isn't in local Zustand/localStorage.  When the project IS available
 * locally (authoring device), pass `skip = true` to avoid a needless fetch.
 *
 * Returns a small state machine so the page can distinguish "still loading"
 * from "definitively not found" — important so a cold load shows a spinner
 * rather than flashing the "no longer available" message before the fetch.
 */
import { useEffect, useState } from 'react'
import { supabaseFetchDeckSnapshot } from '@/repositories/deckSnapshots'
import type { RemoteDeckSnapshot } from '@/repositories/deckSnapshots'

type Status = 'idle' | 'loading' | 'done'

export interface RemoteDeckSnapshotState {
  snapshot: RemoteDeckSnapshot | null
  /** True while a fetch is in flight — show a spinner rather than "not found". */
  loading:  boolean
}

export function useRemoteDeckSnapshot(
  projectId: string | undefined,
  skip:      boolean,
): RemoteDeckSnapshotState {
  const [snapshot, setSnapshot] = useState<RemoteDeckSnapshot | null>(null)
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    if (skip || !projectId) {
      setStatus('idle')
      setSnapshot(null)
      return
    }

    let cancelled = false
    setStatus('loading')

    supabaseFetchDeckSnapshot(projectId).then((result) => {
      if (cancelled) return
      setSnapshot(result)
      setStatus('done')
    })

    return () => {
      cancelled = true
    }
  }, [projectId, skip])

  return {
    snapshot,
    loading: status === 'loading',
  }
}
