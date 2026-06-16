/**
 * useCustomMemberSync — Phase 4C write-path: local → Supabase for custom members.
 *
 * What it does:
 *   1. On mount: pushes all current custom members from the local store to Supabase
 *      (best-effort upsert with onConflict='id' — safe to re-run, already-synced
 *      rows are updated if any fields have changed).
 *   2. Watches useUserStore.customMembers for adds and updates, and forwards them
 *      to Supabase via supabasePushCustomMember:
 *        - Member added   → INSERT (upsert handles the conflict case)
 *        - Member updated → UPDATE all mutable fields (updatedAt acts as change signal)
 *        - Member removed → intentionally NO-OP; the people row is preserved in
 *          Supabase for the invite-reuse design (same id reused on later invite).
 *
 * FK notes: people.id is text PK (no UUID guard needed).  Once people rows exist,
 * subsequent useMagazineGrantSync upserts that previously failed with 23503
 * (person not in Supabase) will succeed on the next user interaction.
 *
 * App-user rows (user-sarah-chen etc.) are seeded via the import migration and
 * never go through addCustomMember, so this hook only ever sees UUID-based custom
 * members.
 *
 * Called once from AppShell. No-op when VITE_SUPABASE_URL/ANON_KEY are absent.
 */
import { useEffect } from 'react'
import { useUserStore } from '@/store/useUserStore'
import { isSupabaseEnabled } from '@/lib/supabase'
import { supabasePushCustomMember } from '@/repositories/people'

export function useCustomMemberSync(): void {
  useEffect(() => {
    // No-op when Supabase is not configured (missing env vars, offline, CI, etc.)
    if (!isSupabaseEnabled) return

    // ── 1. Initial push: all current custom members → Supabase ───────────────
    // upsert with onConflict='id' means existing rows are updated with latest values.
    void (async () => {
      for (const m of useUserStore.getState().customMembers) {
        await supabasePushCustomMember(m)
      }
    })()

    // ── 2. Subscribe to store changes; forward adds and updates ──────────────
    const unsub = useUserStore.subscribe((state, prevState) => {
      // Fast-path: skip when customMembers reference hasn't changed.
      if (state.customMembers === prevState.customMembers) return

      const prevMap = new Map(prevState.customMembers.map((m) => [m.id, m]))

      for (const m of state.customMembers) {
        const prev = prevMap.get(m.id)
        // Push if new (no prev) or if any field changed (updatedAt is the change signal).
        if (!prev || prev.updatedAt !== m.updatedAt) {
          void supabasePushCustomMember(m)
        }
      }

      // Removed members: intentionally NO-OP.
      // The people row is kept in Supabase for the invite-reuse design —
      // the same id is reused if the member is later invited as a full user.
      // Grant cleanup is handled by useMagazineGrantSync (Phase 4B).
    })

    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
