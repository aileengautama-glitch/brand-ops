import { Link } from 'react-router-dom'
import {
  Calendar, Camera, CheckSquare, FileText, Users, Layout,
  Printer, Clipboard, Clock, BookOpen,
} from 'lucide-react'
import { ROLE_LABELS, APP_USERS } from '@/auth/users'
import { ROLE_PERMISSIONS as PERMS } from '@/auth/permissions'
import type { UserRole } from '@/auth/users'

// ─── Human-readable section labels ───────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  'event.tasks':       'Event Tasks & Checklist',
  'event.timeline':    'Event Timeline & Schedule',
  'event.budget':      'Event Budget',
  'event.vendors':     'Event Vendors & Suppliers',
  'event.teams':       'Event Teams & Roles',
  'event.creative':    'Event Creative & References',
  'event.collaterals': 'Event Collaterals',
  'shoot.checklist':   'Shoot Pre-Production Checklist',
  'shoot.timeline':    'Shoot Timeline',
  'shoot.budget':      'Shoot Budget',
  'shoot.vendors':     'Shoot Vendors',
  'shoot.crew':        'Shoot Crew & Talent',
  'shoot.creative':    'Shoot Creative & Shot List',
  'shoot.styling':     'Shoot Products & Styling',
  'shoot.callsheet':   'Shoot Call Sheet',
  'shoot.brief':       'Shoot Brief',
}

// ─── Small helper ─────────────────────────────────────────────────────────────

function SectionHeading({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-ink mb-3 pb-1.5 border-b border-surface-3 flex items-center gap-2">
      <span className="text-2xs font-bold text-ink-faint w-4">{n}.</span>
      {children}
    </h2>
  )
}

function NavItem({
  icon: Icon,
  label,
  where,
  description,
}: {
  icon: React.ElementType
  label: string
  where: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-surface-2 last:border-0">
      <div className="w-6 h-6 rounded bg-surface-2 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={12} className="text-ink-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-medium text-ink">{label}</span>
          <span className="text-xs text-ink-faint">{where}</span>
        </div>
        <p className="text-xs text-ink-muted mt-0.5">{description}</p>
      </div>
    </div>
  )
}

function DocRow({
  icon: Icon,
  label,
  path,
  description,
}: {
  icon: React.ElementType
  label: string
  path: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-surface-2 last:border-0">
      <div className="w-6 h-6 rounded bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={12} className="text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-medium text-ink">{label}</span>
          <span className="text-xs font-mono text-ink-faint bg-surface-2 rounded px-1">{path}</span>
        </div>
        <p className="text-xs text-ink-muted mt-0.5">{description}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Help() {
  const roles = Object.keys(ROLE_LABELS) as UserRole[]

  return (
    <div className="p-6 max-w-3xl space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-ink mb-1">Help &amp; Guide</h1>
        <p className="text-sm text-ink-muted">
          Everything your team needs to use Brand Workspace — navigation, roles, tasks, and exports.
        </p>
      </div>

      {/* ── 1. Where to find things ───────────────────────────────────────── */}
      <section>
        <SectionHeading n={1}>Where to find things</SectionHeading>
        <div className="bg-white border border-surface-3 rounded-lg overflow-hidden">
          <NavItem
            icon={Calendar}
            label="Event projects"
            where="Top bar → Events"
            description="Manage events end-to-end: tasks, timeline, budget, vendors, team, creative direction, and collaterals."
          />
          <NavItem
            icon={Camera}
            label="Shoot projects"
            where="Top bar → Shoots"
            description="Run photo shoots: pre-production checklist, crew & talent, products & styling, creative & shot list, call sheet, brief."
          />
          <NavItem
            icon={CheckSquare}
            label="My Tasks"
            where="Top bar → My Tasks"
            description="All tasks assigned to you across every project in one place. Requires logging in and linking yourself to each project's team."
          />
          <NavItem
            icon={Users}
            label="Team / Crew"
            where="Event → Teams   |   Shoot → Crew & Talent"
            description="Add team members, assign roles, and note contacts. Tasks are assigned to these per-project members."
          />
          <NavItem
            icon={BookOpen}
            label="Brief deck"
            where="Event → Brief Deck   |   Shoot → Brief Deck"
            description="The printable client-facing brief. Includes overview, creative direction, moodboard, and key info tables."
          />
          <NavItem
            icon={Layout}
            label="Collaterals"
            where="Event → Collaterals"
            description="Track print and digital assets per event: brief, copy, image references, and approval status."
          />
        </div>
      </section>

      {/* ── 2. What lives here instead of Google Docs ────────────────────── */}
      <section>
        <SectionHeading n={2}>What lives here instead of Google Docs</SectionHeading>
        <p className="text-sm text-ink-muted mb-4">
          These pages can all be printed to PDF directly from the app — no copy-pasting into Docs required.
          Click the <strong className="text-ink">Print / Export</strong> button on any of these pages.
        </p>
        <div className="bg-white border border-surface-3 rounded-lg overflow-hidden">
          <DocRow
            icon={FileText}
            label="Event Brief Deck"
            path="Events → Brief Deck"
            description="Landscape PDF covering event overview, creative direction, run-of-show, and supplier contacts."
          />
          <DocRow
            icon={FileText}
            label="Shoot Brief Deck"
            path="Shoots → Brief Deck"
            description="Landscape PDF for clients and partners — concept, moodboard, wardrobe, HMU, and logistics."
          />
          <DocRow
            icon={Clipboard}
            label="Call Sheet"
            path="Shoots → Call Sheet"
            description="Day-of crew contacts, call times, and location details. Print and send before shoot day."
          />
          <DocRow
            icon={Clock}
            label="D-Day Timeline"
            path="Shoots → D-Day Timeline"
            description="Minute-by-minute run sheet for shoot day. Landscape PDF for the whole crew."
          />
          <DocRow
            icon={Printer}
            label="Collaterals Brief"
            path="Events → Collaterals → Print"
            description="All collateral briefs and copy blocks in one printable sheet, with image references."
          />
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          Tip: in Chrome, use <strong>Save as PDF</strong> in the print dialog for the cleanest output.
          Landscape orientation is set automatically.
        </p>
      </section>

      {/* ── 3. Selecting yourself ─────────────────────────────────────────── */}
      <section>
        <SectionHeading n={3}>Selecting yourself (log in)</SectionHeading>
        <ol className="space-y-2 text-sm text-ink-muted list-decimal list-inside">
          <li>Click <strong className="text-ink">Log in</strong> in the top-right corner.</li>
          <li>A panel opens showing all team members — click your name.</li>
          <li>Your name and role appear in the top bar. The app shows your tasks and applies your editing permissions.</li>
          <li>Click your name again at any time to switch or log out.</li>
        </ol>
        <p className="mt-3 text-xs text-ink-faint">
          No passwords — identity only. When no one is logged in the app is fully editable, which is useful during initial setup.
        </p>
      </section>

      {/* ── 4. Finding and using My Tasks ────────────────────────────────── */}
      <section>
        <SectionHeading n={4}>Finding your tasks</SectionHeading>
        <div className="space-y-2 text-sm text-ink-muted">
          <p>
            <strong className="text-ink">My Tasks page</strong> —{' '}
            top bar → "My Tasks". Shows every task assigned to you across all projects, grouped by project.
            Also where you link yourself to a project's team or crew list.
          </p>
          <p>
            <strong className="text-ink">Per-project dashboard</strong> —{' '}
            each dashboard shows a "My Tasks" panel once you're linked. The Open Tasks tile also shows "X yours".
          </p>
          <p>
            <strong className="text-ink">Task rows</strong> —{' '}
            rows assigned to you show{' '}
            <span className="text-accent font-semibold">You</span>{' '}
            in place of your name in the assignee column.
          </p>
        </div>
      </section>

      {/* ── 5. Linking yourself to a project ─────────────────────────────── */}
      <section>
        <SectionHeading n={5}>Linking yourself to a project</SectionHeading>
        <p className="text-sm text-ink-muted mb-2">
          Tasks are assigned to project-local team members. You need to tell the app which member is you, once per project.
        </p>
        <ul className="space-y-1.5 text-sm text-ink-muted list-disc list-inside">
          <li>Go to <strong className="text-ink">My Tasks</strong> — each project shows an "I am:" dropdown if you're not linked yet.</li>
          <li>Or go to the project <strong className="text-ink">Dashboard</strong> — the My Tasks panel shows the same selector.</li>
        </ul>
      </section>

      {/* ── 6. Role permissions ───────────────────────────────────────────── */}
      <section>
        <SectionHeading n={6}>What each role can edit</SectionHeading>
        <p className="text-sm text-ink-muted mb-4">
          Sections not in your role's list are read-only — you can always view everything.
        </p>
        <div className="space-y-3">
          {roles.map((role) => {
            const sections = PERMS[role]
            return (
              <div key={role} className="bg-surface-1 border border-surface-3 rounded p-3">
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className="text-xs font-bold text-ink">{ROLE_LABELS[role]}</span>
                  {sections.length === 0 && (
                    <span className="text-xs text-ink-faint">Read-only everywhere</span>
                  )}
                </div>
                {sections.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {sections.map((s) => (
                      <span
                        key={s}
                        className="text-2xs bg-white border border-surface-3 rounded px-1.5 py-0.5 text-ink-secondary"
                      >
                        {SECTION_LABELS[s] ?? s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 7. Team roster ────────────────────────────────────────────────── */}
      <section>
        <SectionHeading n={7}>Configured team members</SectionHeading>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {APP_USERS.map((u) => (
            <div key={u.id} className="flex items-center gap-2 bg-surface-1 border border-surface-3 rounded p-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: u.avatarColor }}
              >
                {u.initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink truncate">{u.name}</p>
                <p className="text-2xs text-ink-faint">{ROLE_LABELS[u.role]}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          To add or remove team members, edit <code className="bg-surface-2 px-1 rounded">src/auth/users.ts</code> and redeploy.
        </p>
      </section>

      <div className="pt-2 border-t border-surface-3">
        <Link to="/" className="text-xs text-accent hover:underline">← Back to home</Link>
      </div>

    </div>
  )
}
