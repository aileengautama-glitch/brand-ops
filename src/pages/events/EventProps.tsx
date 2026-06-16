import { useParams } from 'react-router-dom'
import { Plus, Box } from 'lucide-react'
import { useEventStore } from '@/store/useEventStore'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import PropCard from '@/components/creative/PropCard'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/ui/EmptyState'

export default function EventProps() {
  const { id } = useParams<{ id: string }>()
  const project = useEventStore((s) => s.projects.find((p) => p.id === id))

  const addProp    = useEventStore((s) => s.addProp)
  const updateProp = useEventStore((s) => s.updateProp)
  const removeProp = useEventStore((s) => s.removeProp)
  const moveProp   = useEventStore((s) => s.moveProp)

  const { canEdit } = useCurrentUser()
  const readOnly = !canEdit('event.props', id)

  if (!project || !id) return null

  const props = [...(project.props ?? [])].sort((a, b) => a.order - b.order)

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader
        title="Props"
        subtitle="Physical and digital props used in this event — set dressing, display pieces, hero items."
        actions={
          !readOnly && (
            <button
              onClick={() => addProp(id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-sm rounded hover:bg-accent-dark transition-colors"
            >
              <Plus size={13} /> Add Prop
            </button>
          )
        }
      />

      {props.length === 0 ? (
        <EmptyState
          icon={Box}
          title="No props yet"
          description="Add props to track set dressing, display pieces, and any physical items needed for the event."
          action={
            !readOnly ? (
              <button
                onClick={() => addProp(id)}
                className="px-3 py-1.5 bg-accent text-white text-sm rounded hover:bg-accent-dark transition-colors"
              >
                Add first prop
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {props.map((prop, i) => (
            <PropCard
              key={prop.id}
              prop={prop}
              isFirst={i === 0}
              isLast={i === props.length - 1}
              onUpdate={(patch) => updateProp(id, prop.id, patch)}
              onRemove={() => removeProp(id, prop.id)}
              onMove={(dir) => moveProp(id, prop.id, dir)}
              projectId={id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
