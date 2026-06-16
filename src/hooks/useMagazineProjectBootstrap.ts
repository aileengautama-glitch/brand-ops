/**
 * useMagazineProjectBootstrap — Phase 5A read-path verification (NO authority change).
 *
 * A read-only "bootstrap" that runs once at startup when isSupabaseEnabled. It does
 * NOT mutate the store or Supabase, and does NOT change which side is authoritative —
 * the local Zustand store remains the source of truth. Its sole job is to surface
 * drift between the local magazine project summaries and what Supabase returns, so we
 * can confirm the two sides agree BEFORE a later phase flips read authority to the DB.
 *
 * Sides compared:
 *   • Remote — MagazineProjectRepository.listMagazineProjects() (the Supabase impl,
 *              since isSupabaseEnabled). RLS-filtered when authenticated; with the
 *              anon key pre-Auth this may legitimately return fewer rows.
 *   • Local  — useMagazineStore.projects (authoritative today; untouched here).
 *
 * Fields compared (join key = id): the 8 content summary fields —
 *   name, description, editionNumber, publicationDate, theme, status, totalBudget, notes.
 * createdAt/updatedAt are intentionally EXCLUDED: the Supabase row timestamps are
 * DB-managed (set at push time) and will never equal the local creation timestamps,
 * so comparing them would report guaranteed false-positive drift.
 *
 * Drift is reported to the console in three buckets (mirrors _devParity logging):
 *   1. missing in Supabase (local-only) — classified expected (non-UUID seed id the
 *      write path skips by design) vs unexpected (a real UUID project not yet synced).
 *   2. missing locally (remote-only) — a DB row with no local counterpart.
 *   3. field drift — one row per { id, name, field, local, remote } mismatch.
 *
 * The runner is exported so it can be re-invoked from the dev console:
 *   const m = await import('/src/hooks/useMagazineProjectBootstrap.ts')
 *   await m.runMagazineProjectBootstrap()
 *
 * Called once from AppShell. No-op when VITE_SUPABASE_URL/ANON_KEY are absent.
 */
import { useEffect } from 'react'
import { useMagazineStore } from '@/store/useMagazineStore'
import { MagazineProjectRepository } from '@/repositories'
import { isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { MagazineProjectSummary } from '@/repositories'
import type { MagazineProject } from '@/types/magazine'

// ─── Report shape ───────────────────────────────────────────────────────────────

/** A single field-level mismatch for one project. */
type DriftField = { id: string; name: string; field: string; local: unknown; remote: unknown }

/** A project present on only one side. `expected` is set for the local-only bucket. */
type SideOnly = { id: string; name: string; expected?: boolean }

export type MagazineBootstrapReport = {
  localCount: number
  remoteCount: number
  inSync: number                 // present on both sides with no field drift
  missingRemote: SideOnly[]      // present locally, absent in Supabase
  missingLocal: SideOnly[]       // present in Supabase, absent locally
  fieldDrift: DriftField[]       // present on both sides, one or more fields differ
  remote: MagazineProjectSummary[] // the remote summaries fetched (reused by Phase 5B hydration)
}

// ─── Field comparison ───────────────────────────────────────────────────────────
// Explicit per-field comparison (mirrors summaryDiff in useMagazineProjectSync) —
// fully typed, no key-indexing gymnastics. Timestamps are deliberately omitted.

function driftFields(local: MagazineProject, remote: MagazineProjectSummary): DriftField[] {
  const out: DriftField[] = []
  const cmp = (field: string, l: unknown, r: unknown) => {
    if (l !== r) out.push({ id: local.id, name: local.name, field, local: l, remote: r })
  }
  cmp('name',            local.name,            remote.name)
  cmp('description',     local.description,     remote.description)
  cmp('editionNumber',   local.editionNumber,   remote.editionNumber)
  cmp('publicationDate', local.publicationDate, remote.publicationDate)
  cmp('theme',           local.theme,           remote.theme)
  cmp('status',          local.status,          remote.status)
  cmp('totalBudget',     local.totalBudget,     remote.totalBudget)
  cmp('notes',           local.notes,           remote.notes)
  return out
}

// ─── Runner ─────────────────────────────────────────────────────────────────────

/**
 * Fetch remote magazine summaries, diff against the local store, log + return a report.
 * Returns null when Supabase is not configured (nothing to verify against).
 * Pure verification — performs no writes.
 */
export async function runMagazineProjectBootstrap(): Promise<MagazineBootstrapReport | null> {
  if (!isSupabaseEnabled) return null

  const local  = useMagazineStore.getState().projects
  const remote = await MagazineProjectRepository.listMagazineProjects()

  const remoteById = new Map(remote.map((r) => [r.id, r]))
  const localIds   = new Set(local.map((p) => p.id))

  const missingRemote: SideOnly[]   = []
  const fieldDrift:    DriftField[] = []
  let inSync = 0

  for (const p of local) {
    const r = remoteById.get(p.id)
    if (!r) {
      // expected when the id is a non-UUID seed: supabasePushMagazineProject skips
      // non-UUID ids, so seed-mag-001 etc. are never expected to exist remotely.
      missingRemote.push({ id: p.id, name: p.name, expected: !isValidUUID(p.id) })
      continue
    }
    const drift = driftFields(p, r)
    if (drift.length === 0) inSync++
    else fieldDrift.push(...drift)
  }

  const missingLocal: SideOnly[] = remote
    .filter((r) => !localIds.has(r.id))
    .map((r) => ({ id: r.id, name: r.name }))

  const report: MagazineBootstrapReport = {
    localCount:  local.length,
    remoteCount: remote.length,
    inSync,
    missingRemote,
    missingLocal,
    fieldDrift,
    remote,
  }

  const expectedMissing   = missingRemote.filter((m) => m.expected).length
  const unexpectedMissing = missingRemote.length - expectedMissing

  /* eslint-disable no-console */
  console.log(
    `[MagazineBootstrap] ${report.localCount} local · ${report.remoteCount} remote · ${inSync} in sync\n` +
    `  missing in Supabase (local-only): ${missingRemote.length}  (expected seed/non-UUID: ${expectedMissing}, unexpected: ${unexpectedMissing})\n` +
    `  missing locally (remote-only):    ${missingLocal.length}\n` +
    `  field drift rows:                 ${fieldDrift.length}`
  )
  if (missingRemote.length) console.table(missingRemote)
  if (missingLocal.length)  console.table(missingLocal)
  if (fieldDrift.length)    console.table(fieldDrift)
  /* eslint-enable no-console */

  return report
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useMagazineProjectBootstrap(): void {
  useEffect(() => {
    // No-op when Supabase is not configured (missing env vars, offline, CI, etc.)
    if (!isSupabaseEnabled) return
    void runMagazineProjectBootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
