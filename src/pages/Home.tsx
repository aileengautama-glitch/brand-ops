import { Link } from 'react-router-dom'
import { Calendar, Camera, Newspaper, ArrowRight } from 'lucide-react'
import { useEventStore } from '@/store/useEventStore'
import { useShootStore } from '@/store/useShootStore'
import { useMagazineStore } from '@/store/useMagazineStore'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export default function Home() {
  const eventProjects    = useEventStore((s) => s.projects)
  const shootProjects    = useShootStore((s) => s.projects)
  const magazineProjects = useMagazineStore((s) => s.projects)
  const { isAdmin, canView } = useCurrentUser()

  // Counts mirror each module home — viewable under the centralized scoped-access model.
  const eventCount    = eventProjects.filter((p) => canView('event', p.id)).length
  const shootCount    = shootProjects.filter((p) => canView('shoot', p.id)).length
  const magazineCount = magazineProjects.filter((p) => canView('magazine', p.id)).length

  // Magazine entry respects scoped access: hidden when the user can view no magazine
  // project. Admin always sees it (full access).
  const showMagazine = isAdmin || magazineCount > 0

  return (
    <div className="p-10 max-w-5xl">
      <div className="mb-10">
        <p className="text-2xs font-bold uppercase tracking-[0.18em] text-ink-faint mb-2">Workspace</p>
        <h1 className="text-3xl font-bold text-ink tracking-tight mb-2">Brand Workspace</h1>
        <p className="text-md text-ink-muted max-w-2xl leading-relaxed">
          Internal brand operations — event production, photoshoot pre-production, and magazine publishing.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <ModuleCard
          icon={Calendar}
          tag="Events"
          title="Internal Brand Event Production"
          description="Event timelines, team roles, budget tracking, vendor register, day-of schedules, and brief deck generation."
          to="/events"
          count={eventCount}
          countLabel="project"
        />
        <ModuleCard
          icon={Camera}
          tag="Shoots"
          title="Fashion Brand Photoshoot Pre-Production"
          description="Crew and talent management, shot lists, D-Day timelines, pre-production checklists, and shoot brief decks."
          to="/shoots"
          count={shootCount}
          countLabel="project"
        />
        {showMagazine && (
          <ModuleCard
            icon={Newspaper}
            tag="Magazine"
            title="Brand Magazine Production"
            description="Editorial planning across each issue — writing, visual shoots, graphics, spreads, outreach, tasks, and budget."
            to="/magazine"
            count={magazineCount}
            countLabel="project"
          />
        )}
      </div>
    </div>
  )
}

function ModuleCard({
  icon: Icon,
  tag,
  title,
  description,
  to,
  count,
  countLabel,
}: {
  icon: React.ElementType
  tag: string
  title: string
  description: string
  to: string
  count: number
  countLabel: string
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col p-6 bg-white border border-surface-3 rounded-xl shadow-[0_1px_2px_rgba(21,24,17,0.03)] hover:border-accent/40 hover:shadow-[0_4px_16px_rgba(21,24,17,0.06)] transition-all"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center">
            <Icon size={16} className="text-accent" />
          </div>
          <span className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">
            {tag}
          </span>
        </div>
        <span className="text-2xs text-ink-faint">
          {count} {countLabel}{count !== 1 ? 's' : ''}
        </span>
      </div>

      <h2 className="text-md font-semibold text-ink mb-2 leading-snug">{title}</h2>
      <p className="text-xs text-ink-muted leading-relaxed mb-5 flex-1">{description}</p>

      <div className="flex items-center gap-1 text-xs text-accent font-medium group-hover:gap-2 transition-all">
        Open module <ArrowRight size={11} />
      </div>
    </Link>
  )
}
