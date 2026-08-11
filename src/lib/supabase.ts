/**
 * Supabase client — safe initialisation.
 *
 * Returns null when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set so
 * the app continues to work on localStorage in local dev without a backend.
 *
 * Usage pattern in repositories:
 *   if (supabase) { // use backend path } else { // use localStorage path }
 *
 * Swap guide (Phase B):
 *   - Fill in .env.local with your project's URL and anon key.
 *   - supabase will no longer be null; repository implementations will hit
 *     the backend instead of localStorage.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase.types'
import { useBackendStatus, classifyStatus } from '@/store/useBackendStatus'

const supabaseUrl    = import.meta.env.VITE_SUPABASE_URL    as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Resource name for the status store — 'projects', 'magazine_tasks', 'auth', …
 * Keeps the banner's detail line readable without leaking full URLs.
 */
function resourceOf(url: string): string {
  try {
    const { pathname } = new URL(url)
    if (pathname.includes('/auth/v1/')) return 'auth'
    if (pathname.includes('/storage/v1/')) return 'storage'
    return pathname.split('/rest/v1/')[1]?.split('?')[0] ?? pathname
  } catch {
    return 'request'
  }
}

/**
 * Every Supabase request passes through here, so one place sees all failures.
 *
 * The repositories are deliberately best-effort (they log and move on) to keep the
 * app working offline. That's the right call for durability but it made failures
 * invisible; this wrapper records them centrally so the UI can say so. It never
 * changes the outcome of a request — it only observes.
 */
const observedFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const method = init?.method ?? (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET') ?? 'GET'
  const { recordFailure, recordSuccess } = useBackendStatus.getState()

  let res: Response
  try {
    res = await fetch(input, init)
  } catch (err) {
    // Never completed: offline, DNS, CORS, server down.
    recordFailure({
      issue: 'unreachable',
      status: null,
      resource: resourceOf(url),
      method,
      message: err instanceof Error ? err.message : 'Network request failed',
    })
    throw err
  }

  if (res.ok) {
    recordSuccess()
    return res
  }

  const issue = classifyStatus(res.status)
  if (issue) {
    recordFailure({
      issue,
      status: res.status,
      resource: resourceOf(url),
      method,
      message: res.statusText || `HTTP ${res.status}`,
    })
  } else {
    // 4xx we didn't classify still means the server is up and answering.
    recordSuccess()
  }
  return res
}

/**
 * The Supabase client, or null when env vars are not configured.
 * All repository code should check `if (supabase)` before using it.
 */
export const supabase: SupabaseClient<Database> | null =
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
        global: { fetch: observedFetch },
      })
    : null

/** Convenience flag — use to gate backend-only UI features. */
export const isSupabaseEnabled = supabase !== null
