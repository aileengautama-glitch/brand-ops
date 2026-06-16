/**
 * Magazine outreach repository — Supabase-first reads for the outreach content entity.
 *
 * Phase 5C: the first MAGAZINE CONTENT entity to read from Supabase (earlier magazine
 * work only covered the project summary). Outreach is the lowest-coupling content
 * entity — a flat record, no images, no relational child arrays, only a soft article
 * backlink.
 *
 * Read authority (resolved by the caller, MagazineOutreach.tsx):
 *     const outreach = (await list(projectId)) ?? project.outreach
 *   • list() returns mapped Supabase rows when the table has data for the project.
 *   • list() returns NULL — meaning "no Supabase answer, use your local copy" — in
 *     every uncertain case: Supabase disabled, non-UUID project id, query error, or
 *     zero rows. The caller MUST fall back to the local store on null.
 *
 * Because the outreach WRITE path is a later phase, the table is empty today, so
 * list() returns null and reads transparently fall back to the local store (adds /
 * edits keep working live). The Supabase-first read becomes observable as soon as
 * rows exist in magazine_outreach.
 *
 * This is a pure read helper — it never touches the Zustand store and never writes
 * to Supabase, so local edits can never be clobbered.
 */
import { supabase, isSupabaseEnabled } from '@/lib/supabase'
import { isValidUUID } from '@/repositories/projects'
import type { MagazineOutreachRow, MagazineOutreachInsert } from '@/lib/supabase.types'
import type { OutreachContact, OutreachType, OutreachStatus } from '@/types/magazine'

// row → app-facing OutreachContact (timestamps: only createdAt is on the local shape)
function rowToOutreach(r: MagazineOutreachRow): OutreachContact {
  return {
    id:          r.id,
    name:        r.name,
    type:        r.type   as OutreachType,    // text+CHECK pinned to the domain
    status:      r.status as OutreachStatus,  // text+CHECK pinned to the domain
    contactInfo: r.contact_info,
    fee:         r.fee,
    articleId:   r.article_id,
    role:        r.role,
    notes:       r.notes,
    createdAt:   r.created_at,
  }
}

export const MagazineOutreachRepository = {
  /**
   * Supabase-first read of a project's outreach contacts.
   * Returns a mapped array when Supabase has ≥1 row; otherwise NULL to signal the
   * caller to fall back to its local store copy (disabled / non-UUID / error / empty).
   */
  async list(projectId: string): Promise<OutreachContact[] | null> {
    if (!isSupabaseEnabled || !supabase) return null
    if (!isValidUUID(projectId)) return null

    const { data, error } = await supabase
      .from('magazine_outreach')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) {
      console.warn('[MagazineOutreachRepo] list failed:', projectId, error.message)
      return null
    }
    if (!data || data.length === 0) return null  // no rows yet → fall back to local

    return data.map(rowToOutreach)
  },
}

// ─── Supabase write helpers (Phase 5D — called by useMagazineOutreachSync only) ──
// Plain exported functions — NOT on MagazineOutreachRepository (which stays a pure
// read object). Mirrors the magazineProjects.ts / products.ts supabase* helpers.
// Dual-write contract: the store write is authoritative; these are best-effort and
// only log on failure (never throw, never roll back the local write).

// OutreachContact → row (created_at preserved from local; updated_at bumped on write).
function outreachToRow(c: OutreachContact, projectId: string): MagazineOutreachInsert {
  return {
    id:           c.id,
    project_id:   projectId,
    name:         c.name,
    type:         c.type,
    status:       c.status,
    contact_info: c.contactInfo,
    fee:          c.fee,
    article_id:   c.articleId,
    role:         c.role,
    notes:        c.notes,
    created_at:   c.createdAt,
    updated_at:   new Date().toISOString(),
  }
}

/**
 * Upsert one outreach contact — INSERT for adds, UPDATE for edits (conflict target id).
 * Skips non-UUID ids (seed-mag-* contacts / projects stay local-only).
 * FK magazine_outreach.project_id → projects(id): a 23503 means the project row isn't
 * in Supabase yet (Phase 4 push pending) — logged, self-heals on the next change.
 */
export async function supabasePushOutreach(contact: OutreachContact, projectId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(contact.id) || !isValidUUID(projectId)) return

  const { error } = await supabase
    .from('magazine_outreach')
    .upsert(outreachToRow(contact, projectId), { onConflict: 'id', ignoreDuplicates: false })
  if (error) {
    if (error.code === '23503') {
      console.warn('[MagazineOutreachSync] FK violation — project not yet in Supabase:', { contactId: contact.id, projectId }, error.message)
    } else {
      console.warn('[MagazineOutreachSync] push failed:', contact.id, error.message)
    }
  }
}

/** Delete one outreach contact by id. Skips non-UUID ids. */
export async function supabaseDeleteOutreach(contactId: string): Promise<void> {
  if (!supabase) return
  if (!isValidUUID(contactId)) return

  const { error } = await supabase.from('magazine_outreach').delete().eq('id', contactId)
  if (error) console.warn('[MagazineOutreachSync] delete failed:', contactId, error.message)
}
