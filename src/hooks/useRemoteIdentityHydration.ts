/**
 * useRemoteIdentityHydration — make an invited/linked member a usable identity on
 * ANY device (cross-device member login).
 *
 * Identity (useUserStore.customMembers) and access grants live in per-device local
 * storage. A member signing in on their OWN device — which never created those records
 * (the admin did, on the admin's device) — has neither, so useCurrentUser resolves their
 * currentUserId to null and the app "treats them as logged out" (drops to the picker).
 *
 * When signed in and reconciled to a people.id that is NOT a static APP_USER, this fetches
 * that person + their grants from Supabase (PeopleRepository/AccessRepository — both
 * RLS-scoped to the caller, so a member only ever reads their OWN row + grants) and hydrates
 * them into the local store. useCurrentUser then resolves the member with their scoped
 * access. App users (admin + seed roster) already resolve via getUserById and are skipped.
 *
 * The matching "skip-self" guards in useCustomMemberSync / useMagazineGrantSync stop the
 * member's device from echoing this hydrated record back to Supabase.
 *
 * Additive; mounted once in AppShell after useAuthBridge. No-op when Supabase is off
 * (status 'disabled') or until a linked person is reconciled.
 */
import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useUserStore } from '@/store/useUserStore'
import { getUserById } from '@/auth/users'
import { PeopleRepository } from '@/repositories/people'
import { AccessRepository } from '@/repositories/access'
import type { CustomMember } from '@/auth/members'
import { now } from '@/lib/utils'

export function useRemoteIdentityHydration(): void {
  const status         = useAuthStore((s) => s.status)
  const linkedPersonId = useAuthStore((s) => s.linkedPersonId)

  useEffect(() => {
    if (status !== 'signedIn' || !linkedPersonId) return
    // App users (admin + seed roster) already resolve locally via getUserById — no hydration.
    if (getUserById(linkedPersonId)) return

    let cancelled = false
    void (async () => {
      const [person, grants] = await Promise.all([
        PeopleRepository.getById(linkedPersonId),
        AccessRepository.getGrants(linkedPersonId),
      ])
      if (cancelled || !person) return
      const member: CustomMember = {
        id:        person.id,
        name:      person.name,
        role:      person.roleLabel || 'Collaborator',
        email:     person.email,
        phone:     person.phone ?? '',
        notes:     '',
        status:    'active',
        createdAt: now(),
        updatedAt: now(),
      }
      useUserStore.getState().hydrateRemoteIdentity(member, grants)
    })()
    return () => { cancelled = true }
  }, [status, linkedPersonId])
}
