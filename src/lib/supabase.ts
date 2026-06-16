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

const supabaseUrl    = import.meta.env.VITE_SUPABASE_URL    as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * The Supabase client, or null when env vars are not configured.
 * All repository code should check `if (supabase)` before using it.
 */
export const supabase: SupabaseClient<Database> | null =
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey)
    : null

/** Convenience flag — use to gate backend-only UI features. */
export const isSupabaseEnabled = supabase !== null
