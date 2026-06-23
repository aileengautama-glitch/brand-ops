import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import LoginGate from '@/components/auth/LoginGate'
import RecoveryPrompt from '@/components/auth/RecoveryPrompt'
import { useUserStore } from '@/store/useUserStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { useAuthBridge } from '@/hooks/useAuthBridge'
import { useRemoteIdentityHydration } from '@/hooks/useRemoteIdentityHydration'
import { useProjectSync } from '@/hooks/useProjectSync'
import { useTaskSync }    from '@/hooks/useTaskSync'
import { useCommentSync } from '@/hooks/useCommentSync'
import { useMediaSync }   from '@/hooks/useMediaSync'
import { useDeckSnapshotSync } from '@/hooks/useDeckSnapshotSync'
import { useProjectContentSync } from '@/hooks/useProjectContentSync'
import { useProjectSectionsSync } from '@/hooks/useProjectSectionsSync'
import { useProductsSync } from '@/hooks/useProductsSync'
import { useStylingSync } from '@/hooks/useStylingSync'
import { useModelsSync }  from '@/hooks/useModelsSync'
import { useCrewSync }   from '@/hooks/useCrewSync'
import { useMagazineProjectSync } from '@/hooks/useMagazineProjectSync'
import { useMagazineGrantSync }   from '@/hooks/useMagazineGrantSync'
import { useCustomMemberSync }    from '@/hooks/useCustomMemberSync'
import { useMagazineProjectHydration } from '@/hooks/useMagazineProjectHydration'
import { useMagazineMemberHydration } from '@/hooks/useMagazineMemberHydration'
import { useMagazineOutreachSync } from '@/hooks/useMagazineOutreachSync'
import { useMagazineSpreadSync }   from '@/hooks/useMagazineSpreadSync'
import { useMagazineGraphicSync }  from '@/hooks/useMagazineGraphicSync'
import { useMagazineArticleSync }  from '@/hooks/useMagazineArticleSync'
import { useMagazineVisualProjectSync } from '@/hooks/useMagazineVisualProjectSync'
import { useMagazineTaskSync }     from '@/hooks/useMagazineTaskSync'
import { useMagazineMoodTileSync } from '@/hooks/useMagazineMoodTileSync'
import { useMagazineGraphicsInspoSync } from '@/hooks/useMagazineGraphicsInspoSync'
import { useMagazineBudgetItemSync } from '@/hooks/useMagazineBudgetItemSync'
import { useMagazineWriterHoursSync } from '@/hooks/useMagazineWriterHoursSync'
import { useMagazineArticleVersionSync } from '@/hooks/useMagazineArticleVersionSync'
import { useMagazineArticleCommentSync } from '@/hooks/useMagazineArticleCommentSync'

export default function AppShell() {
  const currentUserId = useUserStore((s) => s.currentUserId)
  const guestMode     = useUserStore((s) => s.guestMode)
  const isLoggedIn    = currentUserId !== null
  const recovery      = useAuthStore((s) => s.recovery)

  // Phase 6A: Supabase Auth session foundation — restores/subscribes the auth session
  // and reconciles the auth user → people row (read-only). No-op when Supabase is absent;
  // does NOT change the local login flow, RLS, or read authority.
  useSupabaseAuth()

  // Phase 6D: bridge a linked Supabase identity → currentUserId (auto-login when linked).
  // Unlinked signed-in users are NOT bridged (LoginGate shows a "not linked" state).
  useAuthBridge()

  // Cross-device member login: hydrate a signed-in (non-APP_USER) member's identity +
  // grants from Supabase so useCurrentUser resolves them on a device that didn't create them.
  useRemoteIdentityHydration()

  // Phase B: keep project list in sync with Supabase across devices.
  // No-op when VITE_SUPABASE_URL is absent (pure-local dev / offline).
  useProjectSync()

  // Phase C: keep tasks and comments in sync with Supabase.
  useTaskSync()
  useCommentSync()

  // Phase D: hydrate the media URL cache from the media metadata table.
  // Enables useStoredImage() to serve Supabase public URLs without per-image fetches.
  useMediaSync()

  // Phase E1: publish deck snapshots so /share/* routes render on fresh devices.
  useDeckSnapshotSync()

  // Phase E2: bidirectional sync of the editable text slice (brief text +
  // event metadata) across devices.
  useProjectContentSync()

  // Phase E3: bidirectional sync of editable array slices (shot list, schedules,
  // milestones, D-Day). Registry-driven — see lib/projectSections.ts.
  useProjectSectionsSync()

  // Phase E4: normalized products — row-level bidirectional sync.
  useProductsSync()

  // Phase E4C/D: normalized styling + relational join tables.
  useStylingSync()

  // Phase E5: normalized models — row-level bidirectional sync.
  // Also prepares the path for E5B (FK upgrade of styling_item_models.model_id).
  useModelsSync()

  // Phase E6: normalized crew members — row-level bidirectional sync.
  useCrewSync()

  // Phase 4: dual-write magazine project summary mutations to Supabase.
  // No-op when VITE_SUPABASE_URL/ANON_KEY are absent.
  useMagazineProjectSync()

  // Phase 4B: dual-write magazine access grants to Supabase.
  // FK deps on projects (Phase 4) and people (Phase 4C); FK violations are logged, not thrown.
  useMagazineGrantSync()

  // Phase 4C: dual-write custom members (people rows) to Supabase.
  // Satisfies person_id FK for access_grants; removes are intentionally not synced.
  useCustomMemberSync()

  // Phase 5B: guarded authority flip — runs the Phase 5A drift check (still logged),
  // then re-sources magazine summary fields from Supabase ONLY when there is zero
  // unexpected drift; otherwise the local store stays authoritative. Content arrays
  // are always preserved. Supersedes the standalone Phase 5A mount.
  useMagazineProjectHydration()

  // Cross-device: pull the signed-in user's VIEWABLE magazine projects into the local store
  // as shells, so a member on a fresh device can see the Magazine card + open shared projects.
  useMagazineMemberHydration()

  // Phase 5D: dual-write magazine outreach contacts to Supabase (magazine_outreach).
  // Best-effort; the local store stays authoritative. FK on projects(id) self-heals
  // after the Phase 4 project push. Populates the table the Phase 5C read consumes.
  useMagazineOutreachSync()

  // Phase 5E: dual-write magazine spreads to Supabase (magazine_spreads). Same
  // contract; content sig includes order + links so reorders / link edits sync.
  useMagazineSpreadSync()

  // Phase 5F: dual-write magazine graphics to Supabase (magazine_graphics). Same
  // contract; image-id refs are soft (bytes stay in IndexedDB/media). Both JSONB
  // arrays + order are in the content sig.
  useMagazineGraphicSync()

  // Phase 5G: dual-write magazine articles to Supabase (magazine_articles). Flat
  // Article fields only; workspace arrays (comments/versions/hours) deferred. Content
  // sig covers body + order.
  useMagazineArticleSync()

  // Phase 5H: dual-write magazine visual projects to Supabase (magazine_visual_projects).
  // shots/resultLinks JSONB; app updatedAt → app_updated_at (distinct from DB updated_at).
  useMagazineVisualProjectSync()

  // Phase 5I: dual-write magazine tasks to Supabase (magazine_tasks). Separate from the
  // shared tasks table / useTaskSync. app updatedAt → app_updated_at; reorders sync via order.
  useMagazineTaskSync()

  // Phase 5J: dual-write magazine mood tiles to Supabase (magazine_mood_tiles). Flat;
  // image_id is a soft ref (bytes stay in IndexedDB/media). Reorders sync via order.
  useMagazineMoodTileSync()

  // Phase 5K: dual-write magazine graphics inspiration tiles (magazine_graphics_inspo).
  // Flat; image_id soft ref (bytes stay in IndexedDB/media). No reorder action.
  useMagazineGraphicsInspoSync()

  // Phase 5L: dual-write magazine budget items (magazine_budget_items). Separate from
  // totalBudget (5B summary) and event/shoot budgets. invoice_file_id is a soft blob ref.
  useMagazineBudgetItemSync()

  // Phase 5M: dual-write magazine writer hours (magazine_writer_hours). First writing-
  // workspace array; article_id is a soft ref (no hard FK — entries may be general).
  useMagazineWriterHoursSync()

  // Phase 5N: dual-write magazine article versions (magazine_article_versions). Hard
  // article FK + project FK; push guard skips versions of non-UUID seed articles.
  useMagazineArticleVersionSync()

  // Phase 5O: dual-write magazine article comments (magazine_article_comments). Final
  // content slice; hard article FK + project FK; nullable anchor jsonb; mutable via resolve.
  useMagazineArticleCommentSync()

  return (
    <div className="print-shell-root flex flex-col h-screen overflow-hidden bg-base">
      {/* Login gate — shown when no user is selected and not in guest mode */}
      {!isLoggedIn && !guestMode && <LoginGate />}

      {/* Forgot-password recovery — set a new password after arriving via a reset link */}
      {recovery && <RecoveryPrompt />}

      <TopBar />
      <div className="app-shell-inner flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-base">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
