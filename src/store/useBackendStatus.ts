/**
 * useBackendStatus — is the backend actually working?
 *
 * The app is local-authoritative with best-effort dual-write, which is good for
 * offline but meant every backend failure was a console.warn nobody saw: the UI
 * showed a successful edit while the server had rejected it. This store is the one
 * place that knows the truth, and the banner reads from it.
 *
 * Fed by the fetch wrapper in lib/supabase.ts, so it sees EVERY request without
 * each of the ~100 call sites having to opt in.
 *
 * Not persisted — it describes right now, not history.
 */
import { create } from 'zustand'

export type BackendIssue =
  | 'none'
  /** Request never completed — offline, DNS, CORS, server down. */
  | 'unreachable'
  /** 401 — no valid session reached the server (signed out, expired, anon-only). */
  | 'auth'
  /** 403 / RLS — signed in, but the server refused this write. */
  | 'denied'
  /** 5xx or an unexpected status. */
  | 'server'

export interface BackendFailure {
  issue: Exclude<BackendIssue, 'none'>
  status: number | null
  /** Path portion of the failing request, e.g. 'projects'. */
  resource: string
  method: string
  message: string
  at: string
}

interface BackendStatusState {
  issue: BackendIssue
  last: BackendFailure | null
  /** Failures since the last success — a single blip shouldn't shout. */
  consecutive: number
  /** User dismissed the banner for the current issue. */
  dismissed: boolean
  recordFailure: (f: Omit<BackendFailure, 'at'>) => void
  recordSuccess: () => void
  dismiss: () => void
  reset: () => void
}

export const useBackendStatus = create<BackendStatusState>()((set, get) => ({
  issue: 'none',
  last: null,
  consecutive: 0,
  dismissed: false,

  recordFailure: (f) =>
    set((s) => ({
      issue: f.issue,
      last: { ...f, at: new Date().toISOString() },
      consecutive: s.consecutive + 1,
      // A different kind of problem is worth showing again.
      dismissed: s.issue === f.issue ? s.dismissed : false,
    })),

  recordSuccess: () => {
    // Only clear once something actually worked — avoids flapping on mixed traffic.
    if (get().issue === 'none' && get().consecutive === 0) return
    set({ issue: 'none', consecutive: 0, dismissed: false })
  },

  dismiss: () => set({ dismissed: true }),
  reset: () => set({ issue: 'none', last: null, consecutive: 0, dismissed: false }),
}))

/** Classify an HTTP status into the issue the user needs to hear about. */
export function classifyStatus(status: number): Exclude<BackendIssue, 'none'> | null {
  if (status === 401) return 'auth'
  if (status === 403) return 'denied'
  if (status >= 500) return 'server'
  // 4xx other than auth/permission are usually our own bad request — surfaced by
  // the caller, not as a global "backend is broken" banner.
  return null
}

export const ISSUE_COPY: Record<Exclude<BackendIssue, 'none'>, { title: string; body: string }> = {
  unreachable: {
    title: "Can't reach the backend",
    body: 'Changes are saved on this device only and are not syncing. They will not appear for anyone else until the connection is back.',
  },
  auth: {
    title: 'Your session has expired',
    body: 'The server rejected the request because you are not signed in. Sign in again — until then nothing is syncing.',
  },
  denied: {
    title: 'The server refused a change',
    body: 'You do not have permission for that action. It was not saved on the server, even if it briefly appeared here.',
  },
  server: {
    title: 'The backend returned an error',
    body: 'Something failed on the server. Changes are not syncing right now.',
  },
}
