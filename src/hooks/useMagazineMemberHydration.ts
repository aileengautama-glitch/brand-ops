/**
 * useMagazineMemberHydration — cross-device magazine project visibility.
 *
 * Everything magazine (useCurrentMagazineProject, Home counts, the project picker) reads
 * useMagazineStore.projects — the LOCAL store. On a fresh device that store is empty, and
 * the Phase-5B hydration deliberately refuses to "invent" remote-only projects (to protect
 * the admin's unsynced edits), so a member never receives the projects they only have
 * access to.
 *
 * This pulls the signed-in user's VIEWABLE magazine projects from Supabase
 * (MagazineProjectRepository.listMagazineProjects() is RLS-scoped to what they can view)
 * and upserts them into the local store as shells — content keeps reading remote per page.
 * Additive: upsertRemoteMagazineProjects skips any project already local, so it never
 * overwrites local data or touches the protective re-sourcing gate.
 *
 * Mounted once in AppShell after useMagazineProjectHydration. No-op when Supabase is off.
 */
import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useMagazineStore } from '@/store/useMagazineStore'
import { MagazineProjectRepository } from '@/repositories/magazineProjects'
import { isSupabaseEnabled } from '@/lib/supabase'

export function useMagazineMemberHydration(): void {
  const status         = useAuthStore((s) => s.status)
  const linkedPersonId = useAuthStore((s) => s.linkedPersonId)

  useEffect(() => {
    if (!isSupabaseEnabled || status !== 'signedIn') return

    let cancelled = false
    void (async () => {
      const summaries = await MagazineProjectRepository.listMagazineProjects()
      if (cancelled || summaries.length === 0) return
      useMagazineStore.getState().upsertRemoteMagazineProjects(summaries)
    })()
    return () => { cancelled = true }
  }, [status, linkedPersonId])
}
