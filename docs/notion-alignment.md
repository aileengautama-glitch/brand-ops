# Notion alignment — one way, app → Notion

**Status: designed, not implemented.** Nothing in the app writes to Notion today.
The share URLs and summary fields it needs already exist, so this is a thin layer
when you want it.

## The split

| Layer | Owns | Why |
|---|---|---|
| **Notion** | Season brief, creative platform, top-line comms, cross-team reading | Already where non-production people look; season briefs are prose, not structured data |
| **App** | Project status, dates, gates, approvals, budget actuals, assets | Operational source of truth — the things that need to compute and report |

The rule that keeps them from drifting: **Notion links to the app, it does not copy
it.** One URL property per project, and a handful of read-only summary fields that
the app overwrites. Nothing is authored in both places.

## Target: the season board

One Notion database (the existing Brand Marketing Master season board). One row per
project. Properties the app would write:

| Notion property | Type | Source in the app |
|---|---|---|
| `Name` | Title | `project.name` |
| `Season` | Select | `project.season` |
| `Type` | Select | module — Shoot / Event / Magazine |
| `Status` | Select | derived: Planning / In progress / Shot / Delivered / Closed |
| `Owner` | Person or Text | `callSheet.onSiteContact` (shoots), else project owner |
| `Shoot date` | Date | `shootDateISO` |
| `Event date` | Date | `eventDate` |
| `Publish date` | Date | `publicationDate` |
| `Launch date` | Date | `launchDate` |
| `App link` | URL | internal share URL — `/share/<module>/<id>/project?s=all` |
| `Gates open` | Number | count of incomplete gates |
| `Gates overdue` | Number | count from the Overdue view |
| `Approvals pending` | Number | count from the Approvals queue |
| `Committed` / `Actual` | Number | season budget rollup, per project |
| `Last synced` | Date | write timestamp, so staleness is visible |

Everything except `Name`, `Season` and `Type` is **read-only in Notion** — the app
overwrites it. If someone edits those in Notion, the next push wins, which is the
correct direction for a one-way sync.

## How the push would work

1. **Match** on a stored `notionPageId` per project (new optional field on the
   project, same JSON-blob pattern as `season`). No page id yet → create the row and
   store the id.
2. **Build** the summary from the data that already exists: `lib/reportingIndex.ts`
   gives gate and approval counts, `lib/seasonBudget.ts` gives committed/actual, and
   `lib/shareSections.ts` builds the internal URL.
3. **Push** with the Notion API `PATCH /v1/pages/{id}` (or `POST /v1/pages` on first
   sync). Debounced, and only when the summary actually changed — the same
   content-signature approach the Supabase sync hooks already use.
4. **Report failures** through the Phase 0 backend-status plumbing rather than a
   `console.warn`, so a broken Notion token surfaces like any other backend problem.

### Where the call runs

The Notion API doesn't allow browser calls (no CORS, and the token must not ship in
the bundle). So this needs one server endpoint — a Vercel function holding the
integration token, which the app calls with the project summary. That's the only new
infrastructure this requires, and it's the reason it isn't built yet: it's the first
piece of server runtime in an otherwise static SPA.

## Deliberately not doing

- **Two-way sync.** Notion editing production data would recreate the split-brain the
  whole system exists to remove.
- **Pushing content** (briefs, shot lists, schedules). Those are what the share links
  are for — a link that's always current beats a copy that goes stale.
- **Per-gate rows in Notion.** The gate list is the app's job; Notion gets counts.
