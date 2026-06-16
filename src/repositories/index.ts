/**
 * Repository barrel — import all repositories from here.
 *
 * Usage:
 *   import { ProjectRepository, TaskRepository, CommentRepository, SessionRepository } from '@/repositories'
 *
 * Each repository provides a Promise-based interface that currently delegates
 * to the Zustand localStorage stores.  In Phase B/C, individual repositories
 * will be swapped to Supabase without changing any import sites.
 */
export { ProjectRepository } from './projects'
export { TaskRepository }    from './tasks'
export { CommentRepository } from './comments'
export { SessionRepository } from './session'

// Identity / access (Phase 2 — read-only, dual-path)
export { PeopleRepository }         from './people'
export { AccessRepository }         from './access'
export { ProjectMembersRepository } from './projectMembers'

// Magazine projects (Phase 3 — read-only, dual-path)
export { MagazineProjectRepository } from './magazineProjects'

// Magazine outreach content (Phase 5C — Supabase-first read with local fallback)
export { MagazineOutreachRepository } from './magazineOutreach'

// Magazine spreads content (Phase 5E — Supabase-first read with local fallback)
export { MagazineSpreadRepository } from './magazineSpreads'

// Magazine graphics content (Phase 5F — Supabase-first read with local fallback)
export { MagazineGraphicRepository } from './magazineGraphics'

// Magazine articles content (Phase 5G — Supabase-first read with local fallback)
export { MagazineArticleRepository } from './magazineArticles'

// Magazine visual projects content (Phase 5H — Supabase-first read with local fallback)
export { MagazineVisualProjectRepository } from './magazineVisualProjects'

// Magazine tasks content (Phase 5I — Supabase-first read with local fallback)
export { MagazineTaskRepository } from './magazineTasks'

// Magazine mood tiles content (Phase 5J — Supabase-first read with local fallback)
export { MagazineMoodTileRepository } from './magazineMoodTiles'

// Magazine graphics inspiration content (Phase 5K — Supabase-first read with local fallback)
export { MagazineGraphicsInspoRepository } from './magazineGraphicsInspo'

// Magazine budget items content (Phase 5L — Supabase-first read with local fallback)
export { MagazineBudgetItemRepository } from './magazineBudgetItems'

// Magazine writer hours content (Phase 5M — Supabase-first read with local fallback)
export { MagazineWriterHoursRepository } from './magazineWriterHours'

// Magazine article versions content (Phase 5N — Supabase-first read with local fallback)
export { MagazineArticleVersionRepository } from './magazineArticleVersions'

// Magazine article comments content (Phase 5O — Supabase-first read with local fallback)
export { MagazineArticleCommentRepository } from './magazineArticleComments'

// Re-export types so consumers only need one import
export type {
  ProjectModule,
  ProjectSummary,
  SessionProfile,
  NewTask,
  TaskPatch,
  NewComment,
  IProjectRepository,
  ITaskRepository,
  ICommentRepository,
  ISessionRepository,
  IPeopleRepository,
  IAccessRepository,
  IProjectMembersRepository,
  MagazineProjectSummary,
  IMagazineProjectRepository,
} from './_types'
