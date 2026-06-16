import type { ReactElement } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import ShareShell from '@/components/layout/ShareShell'
import RouteError from '@/components/RouteError'
import { RequireProjectAccess, RequireSectionAccess } from '@/components/auth/RequireAccess'
import type { SectionKey } from '@/auth/permissions'
import EventBriefDeckShare from '@/pages/share/EventBriefDeckShare'
import ShootBriefDeckShare from '@/pages/share/ShootBriefDeckShare'

// Home
import Home from '@/pages/Home'

// Events
import EventsHome from '@/pages/events/EventsHome'
import EventDashboard from '@/pages/events/EventDashboard'
import EventTasks from '@/pages/events/EventTasks'
import EventTimeline from '@/pages/events/EventTimeline'
import EventBudget from '@/pages/events/EventBudget'
import EventVendors from '@/pages/events/EventVendors'
import EventTeams from '@/pages/events/EventTeams'
import EventCreative from '@/pages/events/EventCreative'
import EventBriefDeck from '@/pages/events/EventBriefDeck'
import EventCollaterals from '@/pages/events/EventCollaterals'
import EventProps from '@/pages/events/EventProps'

// Top-level
import MyTasks from '@/pages/MyTasks'
import Help from '@/pages/Help'
import Settings from '@/pages/Settings'

// Magazine
import MagazineHome from '@/pages/magazine/MagazineHome'
import MagazineBoard from '@/pages/magazine/MagazineBoard'
import MagazineTeam from '@/pages/magazine/MagazineTeam'
import MagazineTasks from '@/pages/magazine/MagazineTasks'
import MagazineWriting from '@/pages/magazine/MagazineWriting'
import MagazineArticle from '@/pages/magazine/MagazineArticle'
import MagazineWritingHours from '@/pages/magazine/MagazineWritingHours'
import MagazineGraphics from '@/pages/magazine/MagazineGraphics'
import MagazineVisual from '@/pages/magazine/MagazineVisual'
import MagazineVisualProject from '@/pages/magazine/MagazineVisualProject'
import MagazineSpread from '@/pages/magazine/MagazineSpread'
import MagazineOutreach from '@/pages/magazine/MagazineOutreach'
import MagazineBudget from '@/pages/magazine/MagazineBudget'
import MagazinePrintFiles from '@/pages/magazine/MagazinePrintFiles'

// Shoots
import ShootsHome from '@/pages/shoots/ShootsHome'
import ShootDashboard from '@/pages/shoots/ShootDashboard'
import ShootChecklist from '@/pages/shoots/ShootChecklist'
import ShootTimeline from '@/pages/shoots/ShootTimeline'
import ShootDDayTimeline from '@/pages/shoots/ShootDDayTimeline'
import ShootBudget from '@/pages/shoots/ShootBudget'
import ShootVendors from '@/pages/shoots/ShootVendors'
import ShootCrewTalent from '@/pages/shoots/ShootCrewTalent'
import ShootCreative from '@/pages/shoots/ShootCreative'
import ShootBrief from '@/pages/shoots/ShootBrief'
import ShootBriefDeck from '@/pages/shoots/ShootBriefDeck'
import ShootProductsStyling from '@/pages/shoots/ShootProductsStyling'
import ShootCallSheet from '@/pages/shoots/ShootCallSheet'
import ShootProps from '@/pages/shoots/ShootProps'

// ── Access-guard helpers (keep route definitions terse) ──────────────────────
const magProj = (el: ReactElement) =>
  <RequireProjectAccess module="magazine">{el}</RequireProjectAccess>
const magSec = (section: SectionKey, el: ReactElement) =>
  <RequireSectionAccess module="magazine" section={section}>{el}</RequireSectionAccess>
const evtProj = (el: ReactElement) =>
  <RequireProjectAccess module="event">{el}</RequireProjectAccess>
const evtSec = (section: SectionKey, el: ReactElement) =>
  <RequireSectionAccess module="event" section={section}>{el}</RequireSectionAccess>
const shtProj = (el: ReactElement) =>
  <RequireProjectAccess module="shoot">{el}</RequireProjectAccess>
const shtSec = (section: SectionKey, el: ReactElement) =>
  <RequireSectionAccess module="shoot" section={section}>{el}</RequireSectionAccess>

const router = createBrowserRouter([
  // ── Shareable read-only deck views (no app chrome) ───────────────────────
  {
    path: '/share',
    element: <ShareShell />,
    errorElement: <RouteError />,
    children: [
      { path: 'event/:id/brief-deck',  element: <EventBriefDeckShare /> },
      { path: 'shoot/:id/brief-deck',  element: <ShootBriefDeckShare /> },
    ],
  },
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: 'my-tasks', element: <MyTasks /> },
      { path: 'help', element: <Help /> },
      { path: 'settings', element: <Settings /> },

      // ── Events ──────────────────────────────────────────────────────────
      { path: 'events', element: <EventsHome /> },
      { path: 'events/:id', element: <Navigate to="dashboard" replace /> },
      { path: 'events/:id/dashboard', element: evtProj(<EventDashboard />) },
      { path: 'events/:id/tasks', element: evtSec('event.tasks', <EventTasks />) },
      { path: 'events/:id/timeline', element: evtSec('event.timeline', <EventTimeline />) },
      { path: 'events/:id/budget', element: evtSec('event.budget', <EventBudget />) },
      { path: 'events/:id/vendors', element: evtSec('event.vendors', <EventVendors />) },
      { path: 'events/:id/teams', element: evtSec('event.teams', <EventTeams />) },
      { path: 'events/:id/creative', element: evtSec('event.creative', <EventCreative />) },
      { path: 'events/:id/collaterals', element: evtSec('event.collaterals', <EventCollaterals />) },
      { path: 'events/:id/props', element: evtSec('event.props', <EventProps />) },
      { path: 'events/:id/brief-deck', element: evtProj(<EventBriefDeck />) },

      // ── Magazine ────────────────────────────────────────────────────────
      { path: 'magazine', element: <MagazineHome /> },
      { path: 'magazine/:id', element: <Navigate to="board" replace /> },
      { path: 'magazine/:id/board', element: magProj(<MagazineBoard />) },
      { path: 'magazine/:id/team', element: magProj(<MagazineTeam />) },
      { path: 'magazine/:id/tasks', element: magSec('magazine.tasks', <MagazineTasks />) },
      { path: 'magazine/:id/writing', element: magSec('magazine.writing', <MagazineWriting />) },
      { path: 'magazine/:id/writing-hours', element: magSec('magazine.writing', <MagazineWritingHours />) },
      { path: 'magazine/:id/writing/:articleId', element: magSec('magazine.writing', <MagazineArticle />) },
      { path: 'magazine/:id/visual', element: magSec('magazine.visual', <MagazineVisual />) },
      { path: 'magazine/:id/visual/:visualId', element: magSec('magazine.visual', <MagazineVisualProject />) },
      { path: 'magazine/:id/graphics', element: magSec('magazine.graphics', <MagazineGraphics />) },
      { path: 'magazine/:id/spread', element: magSec('magazine.spread', <MagazineSpread />) },
      { path: 'magazine/:id/outreach', element: magSec('magazine.outreach', <MagazineOutreach />) },
      { path: 'magazine/:id/budget', element: magSec('magazine.budget', <MagazineBudget />) },
      { path: 'magazine/:id/print-files', element: magProj(<MagazinePrintFiles />) },
      // Catch-all: redirect any remaining unbuilt routes to board
      { path: 'magazine/:id/*', element: <Navigate to="board" replace /> },

      // ── Shoots ──────────────────────────────────────────────────────────
      { path: 'shoots', element: <ShootsHome /> },
      { path: 'shoots/:id', element: <Navigate to="dashboard" replace /> },
      { path: 'shoots/:id/dashboard', element: shtProj(<ShootDashboard />) },
      { path: 'shoots/:id/checklist', element: shtSec('shoot.checklist', <ShootChecklist />) },
      { path: 'shoots/:id/timeline', element: shtSec('shoot.timeline', <ShootTimeline />) },
      { path: 'shoots/:id/dday-timeline', element: shtSec('shoot.timeline', <ShootDDayTimeline />) },
      { path: 'shoots/:id/budget', element: shtSec('shoot.budget', <ShootBudget />) },
      { path: 'shoots/:id/vendors', element: shtSec('shoot.vendors', <ShootVendors />) },
      { path: 'shoots/:id/crew-talent', element: shtSec('shoot.crew', <ShootCrewTalent />) },
      { path: 'shoots/:id/creative', element: shtSec('shoot.creative', <ShootCreative />) },
      { path: 'shoots/:id/shot-list', element: <Navigate to="creative" replace /> },
      { path: 'shoots/:id/products-styling', element: shtSec('shoot.styling', <ShootProductsStyling />) },
      { path: 'shoots/:id/call-sheet', element: shtSec('shoot.callsheet', <ShootCallSheet />) },
      { path: 'shoots/:id/props', element: shtSec('shoot.props', <ShootProps />) },
      { path: 'shoots/:id/shot-brief', element: shtSec('shoot.brief', <ShootBrief />) },
      { path: 'shoots/:id/brief-deck', element: shtProj(<ShootBriefDeck />) },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
