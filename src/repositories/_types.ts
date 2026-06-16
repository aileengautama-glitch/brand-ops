/**
 * Shared types and interfaces for the repository layer.
 *
 * Repositories are the single authoritative interface between the UI and
 * wherever data is stored (localStorage today, Supabase tomorrow).
 * Components should import from here rather than from stores directly.
 *
 * All repository methods return Promise<T> so the implementation can be
 * either synchronous (localStorage path) or async (Supabase path) without
 * changing call sites.
 */

import type { Task, Comment, CommentEntityType } from '@/types/common'
import type { UserRole } from '@/auth/users'
import type { DirectoryPerson } from '@/auth/members'
import type { ProjectGrant } from '@/auth/access'
import type { MagazineProjectStatus } from '@/types/magazine'

// ─── Module ───────────────────────────────────────────────────────────────────

export type ProjectModule = 'event' | 'shoot'

// ─── Session / Profile ────────────────────────────────────────────────────────
// Canonical user profile as seen by the app layer.
// Today: sourced from APP_USERS + useUserStore.
// Future: sourced from Supabase auth.users + profiles table.

export interface SessionProfile {
  /** Stable ID.  Today: static string from users.ts.  Future: Supabase UUID. */
  id: string
  name: string
  email?: string
  role: UserRole
  initials: string
  avatarColor: string
  /**
   * Future field — not set until Supabase Auth is wired in.
   * Will map the internal profile ID to the Supabase auth.users UUID.
   */
  supabaseId?: string
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface ProjectSummary {
  id: string
  module: ProjectModule
  name: string
  description: string
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type NewTask = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
export type TaskPatch = Partial<Task>

// ─── Comments ─────────────────────────────────────────────────────────────────

export type NewComment = Omit<Comment, 'id' | 'createdAt'>

// ─── Repository interfaces ────────────────────────────────────────────────────
// Implemented by each repository module.  The interface is intentionally
// minimal for Phase A; methods will be added as Phase B/C proceed.

export interface ISessionRepository {
  getCurrentProfile(): Promise<SessionProfile | null>
  getProfileById(id: string): Promise<SessionProfile | null>
  listProfiles(): Promise<SessionProfile[]>
}

export interface IProjectRepository {
  listProjects(module: ProjectModule): Promise<ProjectSummary[]>
  getProjectName(module: ProjectModule, id: string): Promise<string | null>
}

export interface ITaskRepository {
  listTasks(module: ProjectModule, projectId: string): Promise<Task[]>
  addTask(module: ProjectModule, projectId: string, data: NewTask): Promise<Task>
  updateTask(module: ProjectModule, projectId: string, taskId: string, patch: TaskPatch): Promise<void>
  removeTask(module: ProjectModule, projectId: string, taskId: string): Promise<void>
}

export interface ICommentRepository {
  getFor(entityType: CommentEntityType, entityId: string): Promise<Comment[]>
  addComment(data: NewComment): Promise<Comment>
  removeComment(commentId: string): Promise<void>
}

// ─── Identity / access (Phase 2 — read-only, dual-path) ───────────────────────
// Local impls read useUserStore + buildDirectory (today's behavior). Supabase
// impls read the Phase-1 tables (people / access_grants / project_members).
// The active impl is chosen by isSupabaseEnabled, mirroring SessionRepository.

/** The unified people directory (login accounts + custom/manual members). */
export interface IPeopleRepository {
  list(): Promise<DirectoryPerson[]>
  getById(id: string): Promise<DirectoryPerson | null>
}

/** Scoped access grants for a person, reconstructed into the ProjectGrant shape. */
export interface IAccessRepository {
  getGrants(personId: string): Promise<ProjectGrant[]>
}

/** Project membership / roster (project-id centric — ids are globally-unique UUIDs). */
export interface IProjectMembersRepository {
  listProjectIdsForPerson(personId: string): Promise<string[]>
  isMember(personId: string, projectId: string): Promise<boolean>
}

// ─── Magazine projects (Phase 3 — read-only, dual-path) ───────────────────────
// Project-level summary of a magazine issue. Supabase path joins the base
// projects row (module='magazine') with its magazine_project_meta detail; local
// path reads useMagazineStore. Nested content (articles, spreads, roster, …) is
// intentionally EXCLUDED — that arrives with the content tables in a later phase.
// status uses the magazine taxonomy (MagazineProjectStatus), which equals the DB
// magazine_project_meta.editorial_status CHECK domain.

export interface MagazineProjectSummary {
  id: string
  name: string
  description: string
  editionNumber: string
  publicationDate: string        // ISO date or '' when unset (mirrors MagazineProject)
  theme: string
  status: MagazineProjectStatus  // ← editorial_status (DB) / MagazineProject.status (local)
  totalBudget: number
  notes: string
  createdAt: string
  updatedAt: string
}

export interface IMagazineProjectRepository {
  listMagazineProjects(): Promise<MagazineProjectSummary[]>
  getMagazineProject(id: string): Promise<MagazineProjectSummary | null>
}
