import { useParams } from 'react-router-dom'
import { useEventStore } from '@/store/useEventStore'
import { useShootStore } from '@/store/useShootStore'
import { useMagazineStore } from '@/store/useMagazineStore'
import type { EventProject } from '@/types/event'
import type { ShootProject } from '@/types/shoot'
import type { MagazineProject } from '@/types/magazine'

export function useCurrentEventProject(): EventProject | undefined {
  const { id } = useParams<{ id: string }>()
  return useEventStore((s) => s.projects.find((p) => p.id === id))
}

export function useCurrentShootProject(): ShootProject | undefined {
  const { id } = useParams<{ id: string }>()
  return useShootStore((s) => s.projects.find((p) => p.id === id))
}

export function useCurrentMagazineProject(): MagazineProject | undefined {
  const { id } = useParams<{ id: string }>()
  return useMagazineStore((s) => s.projects.find((p) => p.id === id))
}
