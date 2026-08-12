/**
 * useSeasonBudgetStore — the approved envelope per season.
 *
 * A season isn't an entity in this app by design (the season brief lives in Notion),
 * so the one number the app genuinely needs — the approved envelope — is kept here
 * keyed by season label rather than inventing a Season table.
 *
 * NOTE: new localStorage key (brand-ops-season-budgets-v1) — additive, nothing renamed.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SeasonBudgetState {
  /** season label → approved envelope. Absent = derive from project budgets. */
  envelopes: Record<string, number>
  setEnvelope: (season: string, amount: number) => void
  clearEnvelope: (season: string) => void
}

export const useSeasonBudgetStore = create<SeasonBudgetState>()(
  persist(
    (set) => ({
      envelopes: {},
      setEnvelope: (season, amount) =>
        set((s) => ({ envelopes: { ...s.envelopes, [season]: amount } })),
      clearEnvelope: (season) =>
        set((s) => {
          const next = { ...s.envelopes }
          delete next[season]
          return { envelopes: next }
        }),
    }),
    { name: 'brand-ops-season-budgets-v1' }
  )
)
